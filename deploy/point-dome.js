// A dome of points in Scanity blue rising from the bottom of its stage: the upper part of a sphere, seen from a
// little above, turning slowly. The points gather into it when it comes into view, the cursor bulges them aside,
// a few twinkle, and they grow denser and bluer toward its base, where the page's mist takes over (CSS).
// Everything moves on the GPU (no per-point work on the CPU), so tens of thousands of points stay cheap.
//
//   const dome = pointDome(element, { points: 28000 });   // dome.ok is false where WebGL is missing
//   dome.destroy();

const DEFAULTS = {
  points: 34000, // points on the visible part of the sphere, for a large stage; smaller stages use fewer
  top: [0.34, 0.5, 0.9], // colour of the points at the crown (a lighter Scan Blue)
  base: [0.141, 0.42, 0.992], // and at the base (Scan Blue, #246bfd)
  size: 1.9, // px
  spin: 0.045, // radians a second
  // where the crown stands, in px from the stage's top; the dome is sized from the room left below it
  crown: (w, h) => h * 0.62
};

/** the dome's size and place: its crown at `crown`, as wide as the room allows, its base always under the bottom edge */
const layout = (w, h, crown) => {
  const room = Math.max(120, h - crown);
  let r = Math.min(w * 0.34, room * 1.45);
  r = Math.min(Math.max(r, room / 0.85), w * 0.6);
  // (the crown tips toward the viewer, so in perspective it stands a little above centre minus radius)
  return { r, cx: w * 0.5, cy: crown + r * 1.06 };
};

const VERT = `
attribute vec3 aPos;
attribute vec3 aScatter;
attribute float aSeed;
uniform vec2 uView;
uniform vec2 uCenter;
uniform float uRadius;
uniform mat3 uRot;
uniform float uTime;
uniform float uIntro;
uniform float uSize;
uniform vec2 uPointer;
uniform float uPush;
uniform vec3 uTop;
uniform vec3 uBase;
varying vec4 vCol;
void main() {
  vec3 p = uRot * aPos;
  // from scattered to their places, each point after its own delay
  float t = clamp((uIntro - aSeed * 0.45) / 0.55, 0.0, 1.0);
  t = 1.0 - pow(1.0 - t, 3.0);
  vec3 w = mix(aScatter, p, t);
  // a camera in front, a few radii away
  float k = 3.4 / (3.4 - w.z);
  vec2 s = uCenter + vec2(w.x, -w.y) * uRadius * k;
  // the cursor pushes the points near it aside
  vec2 d = s - uPointer;
  float dist = length(d);
  float reach = uRadius * 0.24;
  float f = uPush * smoothstep(reach, 0.0, dist);
  s += (dist > 0.001 ? d / dist : vec2(0.0)) * f * reach * 0.4;
  gl_Position = vec4(s.x / uView.x * 2.0 - 1.0, 1.0 - s.y / uView.y * 2.0, 0.0, 1.0);
  // the near side solid, the far side faint; bluer and larger toward the base; one point in sixteen twinkles
  float facing = smoothstep(-0.25, 0.55, p.z);
  float low = smoothstep(0.8, 0.15, p.y);
  float twinkle = step(0.9375, fract(aSeed * 97.31)) * (0.5 + 0.5 * sin(uTime * 1.7 + aSeed * 61.0));
  vec3 col = mix(uTop, uBase, clamp(low + twinkle, 0.0, 1.0));
  float a = (0.05 + 0.95 * facing) * (0.7 + 0.3 * low + 0.3 * twinkle) * (0.35 + 0.65 * t);
  gl_PointSize = uSize * k * (1.0 + 0.7 * low + 0.9 * twinkle);
  vCol = vec4(col, clamp(a, 0.0, 1.0));
}`;

const FRAG = `
precision mediump float;
varying vec4 vCol;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  float a = vCol.a * (1.0 - smoothstep(0.5, 1.0, r));
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;

export function pointDome(stage, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const none = { ok: false, destroy() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return none;
  stage.appendChild(canvas);

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    return none;
  }
  gl.useProgram(prog);
  const u = (n) => gl.getUniformLocation(prog, n);
  const U = {
    view: u('uView'), center: u('uCenter'), radius: u('uRadius'), rot: u('uRot'), time: u('uTime'), intro: u('uIntro'),
    size: u('uSize'), pointer: u('uPointer'), push: u('uPush'), top: u('uTop'), base: u('uBase')
  };
  const attrib = (name, data, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name);
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
  };

  // the points: a Fibonacci sphere, kept only above the base (below it is mist), with a little jitter so the
  // spiral pattern does not show; their scattered starting places fill the space around the dome
  const sizeFactor = Math.min(1.15, Math.max(0.45, (stage.clientWidth * stage.clientHeight) / 1.1e6));
  const want = Math.round(o.points * sizeFactor);
  const KEEP = -0.12;
  const total = Math.round(want / ((1 - KEEP) / 2));
  const pos = [];
  const scatter = [];
  const seed = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total; i++) {
    const y = 1 - (2 * (i + 0.5)) / total;
    if (y < KEEP) continue;
    const r = Math.sqrt(1 - y * y);
    // the spiral's even spacing reads as a lattice of cells; only the radius wavers a hair
    const th = i * golden;
    const j = 1 + (Math.random() - 0.5) * 0.006;
    pos.push(Math.cos(th) * r * j, y * j, Math.sin(th) * r * j);
    scatter.push((Math.random() - 0.5) * 3.4, Math.random() * 1.9 - 0.3, (Math.random() - 0.5) * 2.4);
    seed.push(Math.random());
  }
  const count = seed.length;
  attrib('aPos', new Float32Array(pos), 3);
  attrib('aScatter', new Float32Array(scatter), 3);
  attrib('aSeed', new Float32Array(seed), 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let W = 1, H = 1, dpr = 1;
  let geo = { r: 1, cx: 0, cy: 0 };
  const resize = () => {
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    geo = layout(W, H, o.crown(W, H));
  };

  const pointer = { x: -1e4, y: -1e4, inside: false };
  const look = { x: 0, y: 0, push: 0 };
  let introAt = 0;
  let introDone = reduced;
  let raf = 0;
  let last = 0;
  let spun = 0;
  let visible = false;
  let destroyed = false;

  const draw = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!reduced) spun += dt * o.spin;
    // toward the cursor, eased; the push fades in and out
    const ease = 1 - Math.exp(-dt * 3);
    const tx = pointer.inside ? ((pointer.x / W) * 2 - 1) * 0.22 : 0;
    const ty = pointer.inside ? ((pointer.y / H) * 2 - 1) * 0.06 : 0;
    look.x += (tx - look.x) * ease;
    look.y += (ty - look.y) * ease;
    look.push += ((pointer.inside && !reduced ? 1 : 0) - look.push) * (1 - Math.exp(-dt * 5));
    const intro = introDone ? 1 : Math.min(1, (now - introAt) / 2400);
    if (intro >= 1) introDone = true;

    const yaw = spun + look.x;
    // tipped toward the viewer, so the dome is seen a little from above
    const pitch = 0.3 + look.y;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // rotation: yaw about the vertical, then pitch toward the viewer (column-major)
    const rot = [cy, -sy * sp, sy * cp, 0, cp, sp, -sy, -cy * sp, cy * cp];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.view, W, H);
    gl.uniform2f(U.center, geo.cx, geo.cy);
    gl.uniform1f(U.radius, geo.r);
    gl.uniformMatrix3fv(U.rot, false, rot);
    gl.uniform1f(U.time, now / 1000);
    gl.uniform1f(U.intro, intro);
    gl.uniform1f(U.size, o.size * dpr);
    gl.uniform2f(U.pointer, pointer.x, pointer.y);
    gl.uniform1f(U.push, look.push);
    gl.uniform3fv(U.top, o.top);
    gl.uniform3fv(U.base, o.base);
    // gl_PointSize is in device pixels, positions in CSS ones: the shader maps them through uView
    gl.drawArrays(gl.POINTS, 0, count);
  };
  const frame = (now) => {
    raf = 0;
    if (destroyed || !visible) return;
    draw(now);
    const settling = Math.abs(look.push) > 0.002 || !introDone;
    if (!reduced || settling) raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (!raf && visible && !destroyed) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const sizes = new ResizeObserver(() => {
    resize();
    if (visible) draw(performance.now());
  });
  sizes.observe(stage);
  resize();

  const seen = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting && !document.hidden;
    if (visible && !introAt) introAt = performance.now();
    wake();
  });
  seen.observe(stage);
  const onVisibility = () => {
    visible = !document.hidden && stage.getBoundingClientRect().bottom > 0;
    wake();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onMove = (e) => {
    const b = stage.getBoundingClientRect();
    pointer.x = e.clientX - b.left;
    pointer.y = e.clientY - b.top;
    pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= b.width && pointer.y <= b.height;
    wake();
  };
  const onLeave = () => {
    pointer.inside = false;
    wake();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  return {
    ok: true,
    /** measure again (after the layout around the stage changed) */
    relayout() {
      resize();
      if (visible) draw(performance.now());
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      sizes.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    }
  };
}
