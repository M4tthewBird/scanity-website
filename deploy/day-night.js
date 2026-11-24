// Day and night: two photos of the same scene, and the switch between them played as the light changes. Going to
// night, dusk falls over the scene first, then the windows and lamps come on one by one with a brief flicker, then
// the blue point cloud ignites from left to right behind a bright front. Going to day plays it back the other way.
// What lights up is read off the two photos themselves (what the night adds over the day, and where it is warm
// or blue), so no masks are needed. At rest the page shows the photos as plain images (the browser scales them
// best); the canvas only plays the change. Without WebGL 2, or for people who ask for reduced motion, the photos
// simply cross-fade.
//
//   const dn = dayNight(stage, { day: img, night: img, focus: [x, y] });
//   dn.set('day' | 'night', onMidway)   // onMidway: when the scene has turned far enough to restyle the page

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec4 uCover;   // drawn size xy, offset zw (css px), like object-fit: cover
uniform float uT;      // 0 day .. 1 night
uniform float uTime;
in vec2 vPx;
out vec4 outColor;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = clamp((vPx - uCover.zw) / uCover.xy, 0.0, 1.0);
  vec3 d = texture(uDay, uv).rgb;
  vec3 n = texture(uNight, uv).rgb;
  float ln = lum(n);
  // what the night adds: warm lamps and windows, and the cloud's blue glow
  float warm = clamp((ln - lum(d) * 0.6 - 0.04) * 4.0, 0.0, 1.0) * smoothstep(-0.02, 0.06, n.r - n.b);
  // (strongly blue and bright, and on the house's side: the dusk sky is bluish too, and must not light up)
  float blue = smoothstep(0.16, 0.32, n.b - n.r) * smoothstep(0.08, 0.2, n.b - n.g) * smoothstep(0.2, 0.45, n.b) * smoothstep(0.4, 0.5, uv.x);
  // the night with its lights still off
  vec3 dark = n * (1.0 - 0.82 * warm) * (1.0 - 0.75 * blue);

  // 1. dusk falls
  vec3 col = mix(d, dark, smoothstep(0.0, 0.48, uT));

  // 2. windows and lamps come on one by one, each with a short flicker as it catches
  float cell = hash(floor(uv * vec2(42.0, 24.0)));
  float at = 0.36 + cell * 0.24;
  float on = smoothstep(at, at + 0.05, uT);
  float catching = on * (1.0 - smoothstep(at + 0.05, at + 0.12, uT));
  float flicker = 1.0 - catching * 0.55 * step(0.5, fract(sin(uTime * 31.0 + cell * 97.0) * 43758.5));
  col += (n - dark) * warm * on * flicker;

  // 3. the cloud ignites left to right, a bright front leading
  float front = (uT - 0.58) * 3.4 - (uv.x - 0.55) * 2.2;
  float lit = smoothstep(0.0, 0.18, front);
  col += (n - dark) * blue * lit;
  float edge = exp(-abs(front - 0.06) * 18.0) * step(0.0, front) * (1.0 - smoothstep(0.92, 1.0, uT));
  col += vec3(0.32, 0.52, 1.0) * blue * edge * 0.85;

  outColor = vec4(col, 1.0);
}`;

const VERT = `#version 300 es
in vec2 aCorner;
uniform vec2 uView;
out vec2 vPx;
void main() {
  vPx = vec2((aCorner.x * 0.5 + 0.5) * uView.x, (0.5 - aCorner.y * 0.5) * uView.y);
  gl_Position = vec4(aCorner, 0.0, 1.0);
}`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const loaded = (img) => (img.complete && img.naturalWidth ? Promise.resolve(img) : new Promise((done, fail) => {
  img.addEventListener('load', () => done(img), { once: true });
  img.addEventListener('error', fail, { once: true });
}));

export function dayNight(stage, { day, night, focus = [0.5, 0.5], duration = 2600 }) {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'dn-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
  let prog = null;
  if (gl) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (gl.getProgramParameter(p, gl.LINK_STATUS)) prog = p;
  }
  if (prog) stage.append(canvas);
  const U = prog ? Object.fromEntries(['uDay', 'uNight', 'uCover', 'uT', 'uTime', 'uView'].map((n) => [n, gl.getUniformLocation(prog, n)])) : {};
  let textures = null;

  const texture = (img) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const prepare = async () => {
    if (textures) return true;
    if (!prog) return false;
    await Promise.all([loaded(day), loaded(night)]);
    textures = { day: texture(day), night: texture(night) };
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aCorner');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return true;
  };

  const draw = (t, now) => {
    const W = Math.max(1, stage.clientWidth);
    const H = Math.max(1, stage.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const iw = night.naturalWidth, ih = night.naturalHeight;
    const k = Math.max(W / iw, H / ih);
    const dw = iw * k, dh = ih * k;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.day);
    gl.uniform1i(U.uDay, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.night);
    gl.uniform1i(U.uNight, 1);
    gl.uniform2f(U.uView, W, H);
    gl.uniform4f(U.uCover, dw, dh, (W - dw) * focus[0], (H - dh) * focus[1]);
    gl.uniform1f(U.uT, t);
    gl.uniform1f(U.uTime, now / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  let mode = null;
  let raf = 0;
  /** turn the scene to day or night; onMidway runs when it has turned far enough to restyle the page */
  const set = async (next, onMidway) => {
    if (next === mode) return;
    const first = mode === null;
    mode = next;
    cancelAnimationFrame(raf);
    const toNight = next === 'night';
    const show = (which) => {
      night.classList.toggle('is-shown', which === 'night');
      day.classList.toggle('is-shown', which === 'day');
    };
    // the first state, the reduced-motion and the no-WebGL ways: no play, a plain (cross-fading) swap
    if (first || still.matches || !(await prepare().catch(() => false)) || mode !== next) {
      if (mode !== next) return;
      // (a cross-fade, unless this is the first state)
      stage.classList.toggle('is-fading', !first);
      show(next);
      onMidway?.();
      return;
    }
    const from = toNight ? 0 : 1;
    const to = toNight ? 1 : 0;
    const start = performance.now();
    let midway = false;
    stage.classList.remove('is-fading');
    canvas.classList.add('is-playing');
    draw(from, start);
    show(null);
    const step = (now) => {
      const f = Math.min(1, (now - start) / duration);
      const t = from + (to - from) * ease(f);
      draw(t, now);
      if (!midway && f > (toNight ? 0.3 : 0.55)) {
        midway = true;
        onMidway?.();
      }
      if (f < 1) raf = requestAnimationFrame(step);
      else {
        show(next);
        canvas.classList.remove('is-playing');
      }
    };
    raf = requestAnimationFrame(step);
  };

  return { set, get mode() { return mode; } };
}
