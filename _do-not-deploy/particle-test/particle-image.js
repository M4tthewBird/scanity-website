// Particle Image: a picture drawn as a swarm of points. It holds a three-quarter view, turns toward the cursor,
// scatters where the cursor passes and bursts from one picture into the next.
//
// Ported to plain JavaScript (no React, no Framer) from the free "Particle Image" code component of the
// Umbra Studio template on the Framer Marketplace. Framer's licence for free content allows using and
// modifying it in our own projects, commercial ones included; not reselling or sharing it as a standalone asset.
//
//   const swarm = particleImage(element, { images: ['logo.svg', 'photo.webp'] });
//   swarm.set({ points: 80000, transition: 'dust' });   // change any setting live
//   swarm.next();                                        // the next picture
//   swarm.destroy();
//   swarm.ok                                             // false where WebGL is missing: nothing is drawn
//
// The element needs a size (the swarm fills it). Light or dark points follow the background behind it.

export const DEFAULTS = {
    images: [], // up to four: URLs, or { src, form } to give one picture its own form; objects on a plain or clear background work best
    alt: '', // read by screen readers
    decorative: false, // hides it from screen readers
    form: 'solid', // 'solid' extrudes the shape into a slab (logos, objects); 'flat' keeps a relief (photos)
    fit: 'contain', // 'contain' | 'cover'
    scale: 0.7, // size of the picture inside the frame
    points: 120000, // for a large frame; smaller frames use fewer
    size: 1.2, // point size, px
    focus: 'auto', // flat only: where the points go: 'auto' | 'light' | 'dark' | 'even'
    colorMode: 'auto', // 'auto' (light points on dark pages, dark on light) | 'original' (the picture's) | 'solid'
    color: '#3E7DFF', // for colorMode 'solid'
    depth: 0.6, // thickness of a solid, height of a relief
    tilt: 40, // degrees it turns toward the cursor
    rest: [0.3, -0.6], // the view it holds at rest (about the horizontal and vertical axes), as parts of the tilt
    push: 0.5, // how hard the cursor scatters the points
    radius: 140, // px around the cursor
    transition: 'burst', // 'burst' | 'sweep' | 'dust'
    speed: 1,
    advance: 'both', // next picture on: 'auto' (timer) | 'click' | 'both' | 'off'
    interval: 5, // seconds, for the timer
    intro: true, // the points gather into the first picture when it comes into view
    drift: 0.3, // a slow shimmer and sway at rest
    touch: true, // a finger pushes the points too
    markers: 8, // tracked points with live coordinates; 0 hides them
    coordinates: true,
    links: true,
    count: true, // the point count
    countLabel: 'PTS',
    locale: 'en-US', // how the point count is written
    labelFont: { size: 12, weight: 400, letterSpacing: 0.08 }, // letterSpacing in em; family follows the page
    labelColor: '' // markers, links and labels; empty follows the points
};

const SAMPLE = 420; // the picture is read at about this many pixels along its longer side
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pictureOf = (i) => (typeof i === 'string' ? { src: i } : { src: i?.src || '', form: i?.form });

const images = new Map();
const loadImage = (url) => {
    let p = images.get(url);
    if (!p) {
        p = new Promise((done) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.onload = () => done(img);
            img.onerror = () => done(null);
            img.src = url;
        });
        images.set(url, p);
    }
    return p;
};

/** a shaded ball, when there is no picture */
const sphere = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 600;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(225, 205, 10, 300, 300, 255);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#a3a3a3');
    g.addColorStop(1, '#1f1f1f');
    x.fillStyle = g;
    x.beginPath();
    x.arc(300, 300, 250, 0, Math.PI * 2);
    x.fill();
    return c;
};

const colors = new Map();
/** any CSS colour as [r, g, b] in 0..1 */
const cssColor = (color, host) => {
    const known = colors.get(color);
    if (known) return known;
    const probe = document.createElement('i');
    probe.style.color = color;
    host.appendChild(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || ['62', '125', '255'];
    probe.remove();
    const rgb = [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
    colors.set(color, rgb);
    return rgb;
};

/** whether the first solid background behind the element is light */
const isLightBehind = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
        const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) {
            return (0.2126 * Number(m[0]) + 0.7152 * Number(m[1]) + 0.0722 * Number(m[2])) / 255 >= 0.5;
        }
    }
    return true;
};

/** three box blurs, about a gaussian */
const boxBlur = (src, w, h, r) => {
    const out = src.slice();
    const tmp = new Float32Array(src.length);
    const inv = 1 / (2 * r + 1);
    for (let pass = 0; pass < 3; pass++) {
        for (let y = 0; y < h; y++) {
            const row = y * w;
            let s = 0;
            for (let k = -r; k <= r; k++) s += out[row + clamp(k, 0, w - 1)];
            for (let x = 0; x < w; x++) {
                tmp[row + x] = s * inv;
                s += out[row + Math.min(x + r + 1, w - 1)] - out[row + Math.max(x - r, 0)];
            }
        }
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let k = -r; k <= r; k++) s += tmp[clamp(k, 0, h - 1) * w + x];
            for (let y = 0; y < h; y++) {
                out[y * w + x] = s * inv;
                s += tmp[Math.min(y + r + 1, h - 1) * w + x] - tmp[Math.max(y - r, 0) * w + x];
            }
        }
    }
    return out;
};

/**
 * The picture as n points: where each sits (px from the frame's middle), its depth (-0.5..0.5), colour and, on a
 * solid's walls, the wall's normal. The subject is found by its alpha, or against the background read off the
 * picture's left and right edges; points go where the subject is, more on its edges and on the light the page
 * favours. A solid puts a third on its face and the rest round its outline, as the walls of a slab.
 */
const sample = (img, W, H, fit, form, scale, focus, darkPage, n) => {
    const iw = img.naturalWidth || img.width || 512;
    const ih = img.naturalHeight || img.height || 512;
    const k = (fit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih)) * clamp(scale, 0.05, 2);
    const dw = iw * k;
    const dh = ih * k;
    const left = Math.max(-W / 2, -dw / 2);
    const top = Math.max(-H / 2, -dh / 2);
    const vw = Math.min(W / 2, dw / 2) - left;
    const vh = Math.min(H / 2, dh / 2) - top;
    const per = SAMPLE / Math.max(vw, vh, 1);
    const gw = Math.max(2, Math.round(vw * per));
    const gh = Math.max(2, Math.round(vh * per));
    const canvas = document.createElement('canvas');
    canvas.width = gw;
    canvas.height = gh;
    const c2 = canvas.getContext('2d', { willReadFrequently: true });
    c2.drawImage(img, (-dw / 2 - left) * per, (-dh / 2 - top) * per, dw * per, dh * per);
    const px = c2.getImageData(0, 0, gw, gh).data;
    const N = gw * gh;
    const lum = new Float32Array(N);
    const mask = new Float32Array(N);

    // a cut-out (clear border) is its own mask; otherwise the subject is what differs from the edges' colour
    let border = 0;
    for (let y = 0; y < gh; y++) border += px[y * gw * 4 + 3] + px[(y * gw + gw - 1) * 4 + 3];
    for (let x = 0; x < gw; x++) border += px[x * 4 + 3] + px[((gh - 1) * gw + x) * 4 + 3];
    const cutout = border / (2 * (gw + gh) * 255) < 0.5;
    const edge = (x0, y, ch) => {
        let s = 0;
        for (let x = x0; x < x0 + 3; x++) s += px[(y * gw + clamp(x, 0, gw - 1)) * 4 + ch];
        return s / 765;
    };
    let covered = 0;
    for (let y = 0; y < gh; y++) {
        const l0 = edge(0, y, 0), l1 = edge(0, y, 1), l2 = edge(0, y, 2);
        const r0 = edge(gw - 3, y, 0), r1 = edge(gw - 3, y, 1), r2 = edge(gw - 3, y, 2);
        for (let x = 0; x < gw; x++) {
            const i = y * gw + x;
            const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255, a = px[i * 4 + 3] / 255;
            lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (cutout) mask[i] = a;
            else {
                const t = x / (gw - 1);
                mask[i] = a * clamp((Math.hypot(r - l0 - (r0 - l0) * t, g - l1 - (r1 - l1) * t, b - l2 - (r2 - l2) * t) - 0.06) * 5, 0, 1);
            }
            covered += mask[i];
        }
    }
    // nearly all of it "subject": the edges were no background, so take all of it
    if (!cutout && covered / N > 0.75) for (let i = 0; i < N; i++) mask[i] = px[i * 4 + 3] / 255;

    const edges = new Float32Array(N);
    for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
            const i = y * gw + x;
            const m = Math.abs(mask[i + 1] - mask[i - 1]) + Math.abs(mask[i + gw] - mask[i - gw]);
            const l = (Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + gw] - lum[i - gw])) * mask[i];
            edges[i] = clamp(m * 1.5 + l * 2, 0, 1);
        }
    }
    const body = boxBlur(mask, gw, gh, Math.max(2, Math.round(SAMPLE / 30)));
    const solid = form === 'solid';
    const soft = solid ? boxBlur(mask, gw, gh, 2) : mask;
    let bodyMax = 1e-6;
    for (let i = 0; i < N; i++) if (body[i] > bodyMax) bodyMax = body[i];

    const weight = new Float32Array(N);
    const height = new Float32Array(N);
    let sum = 0;
    let max = 0;
    for (let i = 0; i < N; i++) {
        const a = px[i * 4 + 3] / 255;
        const l = lum[i];
        const lit = darkPage ? l : 1 - l;
        let w;
        let h;
        if (solid) {
            w = mask[i] >= 0.5 ? 0.35 + 0.65 * lit : 0;
            h = 0.5;
        } else if (focus === 'light') {
            w = a * l ** 1.3;
            h = l;
        } else if (focus === 'dark') {
            w = a * (1 - l) ** 1.3;
            h = 1 - l;
        } else if (focus === 'even') {
            w = a;
            h = lit;
        } else {
            w = mask[i] * (0.35 + 0.65 * lit) + 0.6 * edges[i];
            h = 0.6 * (body[i] / bodyMax) + 0.4 * lit * mask[i];
        }
        weight[i] = w;
        height[i] = h - 0.5;
        sum += w;
        if (w > max) max = w;
    }
    if (sum < 0.001) {
        weight.fill(1);
        max = 1;
    }
    const cdf = new Float64Array(N);
    let acc = 0;
    for (let i = 0; i < N; i++) cdf[i] = acc += weight[i];

    const outline = [];
    if (solid) {
        const inside = (i) => mask[i] >= 0.5;
        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                const i = y * gw + x;
                if (inside(i) && (x === 0 || y === 0 || x === gw - 1 || y === gh - 1 || !inside(i - 1) || !inside(i + 1) || !inside(i - gw) || !inside(i + gw))) outline.push(i);
            }
        }
    }
    const face = outline.length ? Math.round(n * 0.32) : n;
    const X = new Float32Array(n);
    const Y = new Float32Array(n);
    const D = new Float32Array(n);
    const C = new Uint8Array(n * 4);
    const NR = new Float32Array(n * 2);
    for (let e = 0; e < n; e++) {
        let i;
        let alpha;
        if (e < face) {
            const r = Math.random() * acc;
            let lo = 0;
            let hi = N - 1;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (cdf[mid] < r) lo = mid + 1;
                else hi = mid;
            }
            i = lo;
            D[e] = solid ? 0.5 : height[i];
            alpha = Math.round((255 * weight[i]) / max);
        } else {
            i = outline[(Math.random() * outline.length) | 0];
            D[e] = Math.random() - 0.5;
            const x = i % gw;
            const y = (i / gw) | 0;
            const at = (u, v) => (u < 0 || v < 0 || u >= gw || v >= gh ? 0 : soft[v * gw + u]);
            const gx = at(x + 1, y) - at(x - 1, y);
            const gy = at(x, y + 1) - at(x, y - 1);
            const gl = Math.hypot(gx, gy);
            if (gl > 1e-4) {
                NR[e * 2] = -gx / gl;
                NR[e * 2 + 1] = -gy / gl;
            }
            alpha = 255;
        }
        X[e] = left + ((i % gw) + Math.random()) / per;
        Y[e] = top + (((i / gw) | 0) + Math.random()) / per;
        C[e * 4] = px[i * 4];
        C[e * 4 + 1] = px[i * 4 + 1];
        C[e * 4 + 2] = px[i * 4 + 2];
        C[e * 4 + 3] = alpha;
    }
    // ordered left to right, for the sweep; a shuffle maps the points of one picture to the next for the others
    const order = new Uint32Array(n);
    for (let e = 0; e < n; e++) order[e] = e;
    order.sort((a, b) => X[a] - X[b]);
    const set = { x: new Float32Array(n), y: new Float32Array(n), d: new Float32Array(n), c: new Uint8Array(n * 4), perm: new Uint32Array(n), nrm: new Float32Array(n * 2) };
    for (let e = 0; e < n; e++) {
        const t = order[e];
        set.x[e] = X[t];
        set.y[e] = Y[t];
        set.d[e] = D[t];
        set.c.set(C.subarray(t * 4, t * 4 + 4), e * 4);
        set.nrm[e * 2] = NR[t * 2];
        set.nrm[e * 2 + 1] = NR[t * 2 + 1];
        set.perm[e] = e;
    }
    for (let e = n - 1; e > 0; e--) {
        const t = Math.floor(Math.random() * (e + 1));
        const s = set.perm[e];
        set.perm[e] = set.perm[t];
        set.perm[t] = s;
    }
    return set;
};

const VERT = `
attribute vec3 aPos;
attribute vec4 aCol;
attribute float aSeed;
attribute vec2 aNorm;
uniform vec2 uView;
uniform mat3 uRot;
uniform float uCam;
uniform float uSize;
uniform float uTime;
uniform float uDrift;
uniform vec3 uColor;
uniform float uMono;
uniform float uAlpha;
uniform float uSolid;
varying vec4 vCol;
void main() {
    float s = aSeed * 6.2831853;
    vec3 p = aPos + uDrift * 1.8 * vec3(sin(uTime * 0.8 + s * 3.0), cos(uTime * 0.67 + s * 5.0), sin(uTime * 0.5 + s * 7.0));
    vec3 q = uRot * p;
    float k = uCam / max(uCam - q.z, 1.0);
    gl_Position = vec4(q.x * k / (uView.x * 0.5), -q.y * k / (uView.y * 0.5), 0.0, 1.0);
    float size = uSize * k;
    gl_PointSize = max(size, 1.0);
    // a solid is lit from the upper left; walls turned away from the viewer stay hidden
    float wall = step(0.01, dot(aNorm, aNorm));
    vec3 nr = uRot * mix(vec3(0.0, 0.0, 1.0), vec3(aNorm, 0.0), wall);
    vec3 view = normalize(vec3(-q.x, -q.y, uCam - q.z));
    float facing = mix(1.0, smoothstep(0.0, 0.2, dot(nr, view)), wall);
    float shade = mix(1.0, mix(0.4, 0.75, wall) + 1.1 * max(dot(nr, vec3(-0.45, -0.62, 0.64)), 0.0), uSolid);
    vCol = vec4(mix(aCol.rgb, uColor, uMono), uAlpha * (0.45 + 0.55 * aCol.a) * min(size * size, 1.0) * facing * shade);
}`;

const FRAG = `
precision mediump float;
varying vec4 vCol;
void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d) * 4.0;
    if (r > 1.0) discard;
    float a = vCol.a * (1.0 - smoothstep(0.55, 1.0, r));
    gl_FragColor = vec4(vCol.rgb * a, a);
}`;

export function particleImage(root, options = {}) {
    let props = { ...DEFAULTS, ...options };
    const none = { ok: false, set() {}, next() {}, destroy() {} };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    root.style.overflow = 'hidden';
    const dress = () => {
        const clickable = props.advance === 'click' || props.advance === 'both';
        root.style.pointerEvents = clickable ? 'auto' : 'none';
        root.style.cursor = clickable ? 'pointer' : '';
        if (props.decorative) {
            root.setAttribute('aria-hidden', 'true');
            root.removeAttribute('role');
            root.removeAttribute('aria-label');
        } else {
            root.removeAttribute('aria-hidden');
            root.setAttribute('role', 'img');
            root.setAttribute('aria-label', props.alt?.trim() || 'Obrázek složený z bodů');
        }
    };
    dress();

    const layer = () => {
        const c = document.createElement('canvas');
        c.setAttribute('aria-hidden', 'true');
        Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
        return c;
    };
    const glCanvas = layer();
    const gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return none;
    root.appendChild(glCanvas);
    const hud = layer();
    const ctx = hud.getContext('2d');
    root.appendChild(hud);

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
    gl.useProgram(prog);
    const u = (name) => gl.getUniformLocation(prog, name);
    const uView = u('uView'), uRot = u('uRot'), uCam = u('uCam'), uSize = u('uSize'), uTime = u('uTime');
    const uDrift = u('uDrift'), uColor = u('uColor'), uMono = u('uMono'), uAlpha = u('uAlpha'), uSolid = u('uSolid');
    const attrib = (name, size, type, norm) => {
        const b = gl.createBuffer();
        const loc = gl.getAttribLocation(prog, name);
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        if (loc >= 0) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, type, norm, 0, 0);
        }
        return b;
    };
    const bPos = attrib('aPos', 3, gl.FLOAT, false);
    const bCol = attrib('aCol', 4, gl.UNSIGNED_BYTE, true);
    const bSeed = attrib('aSeed', 1, gl.FLOAT, false);
    const bNorm = attrib('aNorm', 2, gl.FLOAT, false);
    gl.enable(gl.BLEND);

    // ---- state ----
    let W = 1, H = 1, dpr = 1;
    let lightBg = isLightBehind(root);
    let count = 0;
    let pos = new Float32Array(0), vel = new Float32Array(0), target = new Float32Array(0), depthOf = new Float32Array(0);
    let col = new Uint8Array(0), nrm = new Float32Array(0), stiff = new Float32Array(0), damp = new Float32Array(0);
    let pending = new Uint8Array(0), delay = new Float32Array(0);
    let sets = [];
    let nextIndex = 0, current = 0, transitionAt = 0, changedAt = 0;
    let colorsDirty = true, positionsDirty = true, loaded = false, waitingIntro = false, introPending = false, moving = false, visible = false, destroyed = false;
    let raf = 0, lastFrame = 0, frameNo = 0, loadToken = 0, builtKey = '', builtDepth = -1;
    const rot = { x: 0, y: 0 };
    let tracked = [], markerFrom = [], markerAt = [], markerCount = -1, nextHop = 0;
    let floating = new Float32Array(0), phase = new Float32Array(0);
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, nx: 0, ny: 0, inside: false, at: 0 };

    const alloc = (n) => {
        count = n;
        pos = new Float32Array(n * 3);
        vel = new Float32Array(n * 3);
        target = new Float32Array(n * 3);
        depthOf = new Float32Array(n);
        col = new Uint8Array(n * 4);
        nrm = new Float32Array(n * 2);
        stiff = new Float32Array(n);
        damp = new Float32Array(n);
        pending = new Uint8Array(n);
        delay = new Float32Array(n);
        const seed = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            seed[i] = Math.random();
            stiff[i] = 0.55 + Math.random() * 0.9;
            damp[i] = Math.sqrt(stiff[i]);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
        positionsDirty = true;
        gl.bindBuffer(gl.ARRAY_BUFFER, bCol);
        gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bNorm);
        gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bSeed);
        gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
    };
    const depthScale = () => props.depth * 0.6 * Math.min(W, H);
    const indexIn = (set, i) => (props.transition === 'sweep' ? i : sets[set].perm[i]);
    /** point i takes its place in picture `set` */
    const assign = (i, set) => {
        const s = sets[set];
        const r = indexIn(set, i);
        target[i * 3] = s.x[r];
        target[i * 3 + 1] = s.y[r];
        depthOf[i] = s.d[r];
        target[i * 3 + 2] = s.d[r] * depthScale();
        col[i * 4] = s.c[r * 4];
        col[i * 4 + 1] = s.c[r * 4 + 1];
        col[i * 4 + 2] = s.c[r * 4 + 2];
        col[i * 4 + 3] = s.c[r * 4 + 3];
        nrm[i * 2] = s.nrm[r * 2];
        nrm[i * 2 + 1] = s.nrm[r * 2 + 1];
        colorsDirty = true;
    };
    const snap = () => {
        positionsDirty = true;
        pos.set(target);
        vel.fill(0);
        pending.fill(0);
    };
    /** every point leaves for picture `set`, each after its own delay */
    const startTransition = (set) => {
        current = set;
        placeMarkers(set);
        transitionAt = performance.now();
        changedAt = transitionAt;
        const sp = Math.max(props.speed, 0.1);
        const s = sets[set];
        for (let i = 0; i < count; i++) {
            pending[i] = 1;
            delay[i] = props.transition === 'sweep' ? ((s.x[i] + W / 2) / W) * (0.9 / sp) : props.transition === 'dust' ? (1.1 / sp) * Math.random() : Math.random() * 0.12;
        }
        moving = true;
    };
    /** the push a point gets as it leaves */
    const kick = (i) => {
        const sp = Math.max(props.speed, 0.1);
        const n = i * 3;
        if (props.transition === 'burst') {
            const x = pos[n], y = pos[n + 1], l = Math.hypot(x, y) + 1, f = (250 + Math.random() * 650) * sp;
            vel[n] += (x / l) * f;
            vel[n + 1] += (y / l) * f;
            vel[n + 2] += (Math.random() - 0.3) * 600 * sp;
        } else if (props.transition === 'dust') {
            const a = Math.random() * Math.PI * 2, f = (120 + Math.random() * 380) * sp;
            vel[n] += Math.cos(a) * f;
            vel[n + 1] += Math.sin(a) * f;
            vel[n + 2] += (Math.random() - 0.5) * 400 * sp;
        } else {
            vel[n + 1] -= Math.random() * 120 * sp;
            vel[n + 2] += Math.random() * 260 * sp;
        }
    };
    /** scattered over the frame, then gathering into the first picture */
    const intro = () => {
        introPending = false;
        waitingIntro = false;
        const m = Math.min(W, H);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * W * 1.3;
            pos[i * 3 + 1] = (Math.random() - 0.5) * H * 1.3;
            pos[i * 3 + 2] = (Math.random() - 0.5) * m * 0.8;
        }
        target.set(pos);
        vel.fill(0);
        positionsDirty = true;
        startTransition(nextIndex);
        animate();
    };
    const next = () => {
        if (sets.length < 2 || !loaded || introPending) return;
        const set = (current + 1) % sets.length;
        nextIndex = set;
        if (reduced) {
            current = set;
            changedAt = performance.now();
            for (let i = 0; i < count; i++) assign(i, set);
            snap();
            render(performance.now());
        } else {
            startTransition(set);
            animate();
        }
    };
    /** springs to their places; the cursor pushes them aside. True while anything still moves */
    const step = (dt, now) => {
        const since = (now - transitionAt) / 1000;
        const sp = 6.5 * Math.max(props.speed, 0.1);
        const k = sp * sp;
        const c = 1.24 * sp;
        const R = Math.max(props.radius, 1);
        const R2 = R * R;
        const push = reduced ? 0 : props.push;
        const pushing = pointer.inside && push > 0;
        const px = pointer.x, py = pointer.y, pvx = pointer.vx, pvy = pointer.vy;
        let maxV = 0;
        let waiting = 0;
        positionsDirty = true;
        for (let i = 0; i < count; i++) {
            if (pending[i]) {
                if (since >= delay[i]) {
                    pending[i] = 0;
                    assign(i, current);
                    kick(i);
                } else waiting++;
            }
            const n = i * 3;
            const ks = k * stiff[i];
            const cs = c * damp[i];
            let ax = (target[n] - pos[n]) * ks - vel[n] * cs;
            let ay = (target[n + 1] - pos[n + 1]) * ks - vel[n + 1] * cs;
            let az = (target[n + 2] - pos[n + 2]) * ks - vel[n + 2] * cs;
            if (pushing) {
                const dx = pos[n] - px, dy = pos[n + 1] - py, d2 = dx * dx + dy * dy;
                if (d2 < R2) {
                    const d = Math.sqrt(d2) + 0.001;
                    let f = 1 - d / R;
                    f = f * f * push;
                    ax += (dx / d) * f * 9000 + pvx * f * 4;
                    ay += (dy / d) * f * 9000 + pvy * f * 4;
                    az += f * 4000;
                }
            }
            vel[n] += ax * dt;
            vel[n + 1] += ay * dt;
            vel[n + 2] += az * dt;
            pos[n] += vel[n] * dt;
            pos[n + 1] += vel[n + 1] * dt;
            pos[n + 2] += vel[n + 2] * dt;
            const v2 = vel[n] * vel[n] + vel[n + 1] * vel[n + 1] + vel[n + 2] * vel[n + 2];
            if (v2 > maxV) maxV = v2;
        }
        return maxV > 4 || waiting > 0;
    };
    /** markers: some ride on points spread over the picture, the rest float in the space around it */
    const placeMarkers = (set) => {
        const total = clamp(Math.round(props.markers), 0, 16);
        markerCount = total;
        const riding = Math.ceil(total * 0.65);
        tracked = [];
        markerFrom = [];
        markerAt = [];
        floating = new Float32Array((total - riding) * 3);
        phase = new Float32Array(floating.length);
        for (let i = 0; i < phase.length; i++) phase[i] = Math.random() * Math.PI * 2;
        for (let i = 0; i < total - riding; i++) {
            floating[i * 3] = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.3);
            floating[i * 3 + 1] = (Math.random() * 2 - 1) * 0.75;
            floating[i * 3 + 2] = Math.random() * 2 - 1;
        }
        const s = sets[set];
        if (!count || !s || !riding) return;
        const pool = [];
        for (let i = 0; i < 600; i++) pool.push((Math.random() * count) | 0);
        const x = (i) => s.x[indexIn(set, i)];
        const y = (i) => s.y[indexIn(set, i)];
        tracked.push(pool[0]);
        while (tracked.length < riding) {
            let best = pool[0];
            let bestD = -1;
            for (const c of pool) {
                let d = Infinity;
                for (const t of tracked) d = Math.min(d, (x(c) - x(t)) ** 2 + (y(c) - y(t)) ** 2);
                if (d > bestD) {
                    bestD = d;
                    best = c;
                }
            }
            tracked.push(best);
        }
        markerAt = tracked.map(() => -1e9);
        markerFrom = tracked.map(() => [0, 0]);
    };
    /** the markers, their links, coordinates and the point count, on the 2D layer */
    const drawHud = (cx, sx, cy, sy, now) => {
        const animated = !reduced;
        const t = now / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const cam = 1.8 * Math.max(W, H);
        const half = Math.min(W, H) * 0.5;
        const project = (x, y, z) => {
            const rx = cy * x + sy * sx * y + sy * cx * z;
            const ry = cx * y - sx * z;
            const rz = -sy * x + cy * sx * y + cy * cx * z;
            const k = cam / Math.max(cam - rz, 1);
            return [W / 2 + rx * k, H / 2 + ry * k, k, rx, ry, rz];
        };
        const css = (c) => `rgb(${cssColor(c, root).map((v) => Math.round(v * 255)).join(', ')})`;
        const ink = props.labelColor ? css(props.labelColor) : props.colorMode === 'solid' ? css(props.color) : lightBg ? 'rgb(16, 16, 18)' : 'rgb(240, 240, 236)';
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        ctx.lineWidth = 1;
        // now and then a marker hops to the point furthest from the others
        if (animated && tracked.length && now > nextHop) {
            const m = (Math.random() * tracked.length) | 0;
            let best = tracked[m];
            let bestD = -1;
            for (let k = 0; k < 40; k++) {
                const c = (Math.random() * count) | 0;
                let d = Infinity;
                for (let o = 0; o < tracked.length; o++) {
                    if (o !== m) d = Math.min(d, (pos[c * 3] - pos[tracked[o] * 3]) ** 2 + (pos[c * 3 + 1] - pos[tracked[o] * 3 + 1]) ** 2);
                }
                if (d > bestD) {
                    bestD = d;
                    best = c;
                }
            }
            tracked[m] = best;
            markerAt[m] = now;
            nextHop = now + 350 + Math.random() * 650;
        }
        const marks = [];
        for (let m = 0; m < tracked.length; m++) {
            const p = tracked[m];
            let [x, y, , rx, ry, rz] = project(pos[p * 3], pos[p * 3 + 1], pos[p * 3 + 2]);
            const d = clamp((now - markerAt[m]) / 450, 0, 1);
            const f = 1 - (1 - d) ** 3;
            if (d < 1) {
                x = markerFrom[m][0] + (x - markerFrom[m][0]) * f;
                y = markerFrom[m][1] + (y - markerFrom[m][1]) * f;
            } else {
                markerFrom[m][0] = x;
                markerFrom[m][1] = y;
            }
            marks.push([x, y, rx / half, -ry / half, rz / half, 1 + 1.2 * (1 - f), 0.45 + 0.55 * f]);
        }
        for (let m = 0; m < floating.length / 3; m++) {
            const w = animated ? 0.14 : 0;
            const x = floating[m * 3] + w * Math.sin(t * 0.31 + phase[m * 3]);
            const y = floating[m * 3 + 1] + w * Math.sin(t * 0.23 + phase[m * 3 + 1]);
            const z = floating[m * 3 + 2] + w * Math.sin(t * 0.27 + phase[m * 3 + 2]);
            const [px, py, , rx, ry, rz] = project(x * W * 0.45, y * H * 0.42, z * half * 0.7);
            marks.push([clamp(px, 28, W - 28), clamp(py, 28, H - 28), rx / half, -ry / half, rz / half, 1, 1]);
        }
        if (props.links && marks.length > 1) {
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            for (let m = 0; m < marks.length; m++) {
                let near = -1;
                let nd = Infinity;
                for (let o = 0; o < marks.length; o++) {
                    if (o === m) continue;
                    const d = (marks[o][0] - marks[m][0]) ** 2 + (marks[o][1] - marks[m][1]) ** 2;
                    if (d < nd) {
                        nd = d;
                        near = o;
                    }
                }
                ctx.moveTo(marks[m][0], marks[m][1]);
                ctx.lineTo(marks[near][0], marks[near][1]);
                if (m % 3 === 0) {
                    const o = marks[(m + 1) % marks.length];
                    ctx.moveTo(marks[m][0], marks[m][1]);
                    ctx.lineTo(o[0], o[1]);
                }
            }
            ctx.stroke();
        }
        const font = props.labelFont || {};
        const fs = font.size || 12;
        ctx.font = `${font.style || 'normal'} ${font.weight || 400} ${fs}px ${font.family || getComputedStyle(root).fontFamily || 'Inter, system-ui, sans-serif'}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${(font.letterSpacing ?? 0.08) * fs}px`;
        const signed = (v) => `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(2)}`;
        for (let m = 0; m < marks.length; m++) {
            const [x, y] = marks[m];
            const r = 11 * marks[m][5];
            ctx.globalAlpha = 0.9 * marks[m][6];
            ctx.beginPath();
            for (const [qx, qy, dx, dy] of [[x - r, y - r, 1, 1], [x + r, y - r, -1, 1], [x - r, y + r, 1, -1], [x + r, y + r, -1, -1]]) {
                ctx.moveTo(qx + dx * 5, qy);
                ctx.lineTo(qx, qy);
                ctx.lineTo(qx, qy + dy * 5);
            }
            ctx.moveTo(x - 3, y);
            ctx.lineTo(x + 3, y);
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x, y + 3);
            ctx.stroke();
            if (props.coordinates) {
                const label = `${String(m + 1).padStart(2, '0')}  ${signed(marks[m][2])} ${signed(marks[m][3])} ${signed(marks[m][4])}`;
                const w = ctx.measureText(label).width;
                ctx.fillText(label, x + r + 6 + w > W - 8 ? x - r - 6 - w : x + r + 6, y - r + fs * 0.8);
            }
        }
        if (props.count) {
            const [x, y] = project(-half * 0.95, half * 0.55, 0);
            ctx.globalAlpha = 0.5;
            ctx.fillText(`${count.toLocaleString(props.locale)} ${props.countLabel}`, x, y);
        }
        ctx.globalAlpha = 1;
    };
    const render = (now) => {
        if (reduced) {
            const a = (props.tilt * Math.PI) / 180;
            rot.x = props.rest[0] * a;
            rot.y = props.rest[1] * a;
        }
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!loaded || waitingIntro || !count) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, hud.width, hud.height);
            return;
        }
        if (positionsDirty) {
            gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
            positionsDirty = false;
        }
        if (colorsDirty) {
            gl.bindBuffer(gl.ARRAY_BUFFER, bCol);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, col);
            gl.bindBuffer(gl.ARRAY_BUFFER, bNorm);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, nrm);
            colorsDirty = false;
        }
        const mono = props.colorMode !== 'original';
        const additive = mono && !lightBg;
        const c = props.colorMode === 'solid' ? cssColor(props.color, root) : lightBg ? [0.06, 0.06, 0.07] : [0.95, 0.95, 0.93];
        const cx = Math.cos(rot.x), sx = Math.sin(rot.x), cy = Math.cos(rot.y), sy = Math.sin(rot.y);
        gl.uniform2f(uView, W, H);
        gl.uniformMatrix3fv(uRot, false, [cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx]);
        gl.uniform1f(uCam, 1.8 * Math.max(W, H));
        gl.uniform1f(uSize, props.size * dpr);
        gl.uniform1f(uTime, now / 1000);
        gl.uniform1f(uDrift, reduced ? 0 : props.drift);
        gl.uniform3f(uColor, c[0], c[1], c[2]);
        gl.uniform1f(uMono, mono ? 1 : 0);
        gl.uniform1f(uSolid, sets[current]?.solid ? 1 : 0);
        gl.uniform1f(uAlpha, additive ? 0.6 : mono ? 0.8 : 0.95);
        gl.blendFunc(gl.ONE, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, count);
        drawHud(cx, sx, cy, sy, now);
    };
    const frame = (now) => {
        raf = 0;
        if (destroyed) return;
        const dt = clamp((now - lastFrame) / 1000, 0.001, 1 / 30);
        lastFrame = now;
        if (++frameNo % 60 === 0) checkBackground();
        const fade = Math.exp(-dt * 10);
        pointer.vx *= fade;
        pointer.vy *= fade;
        moving = moving && (step(dt, now) || now - pointer.at < 150);
        // toward the cursor while it is over the frame, otherwise the three-quarter view with a slow sway
        const a = (props.tilt * Math.PI) / 180;
        const sway = Math.min(1, props.drift * 2) * a;
        const s = now / 1000;
        const tx = reduced ? props.rest[0] * a : pointer.inside ? pointer.ny * a : props.rest[0] * a + sway * 0.25 * Math.sin(s * 0.37);
        const ty = reduced ? props.rest[1] * a : pointer.inside ? -pointer.nx * a : props.rest[1] * a + sway * 0.45 * Math.sin(s * 0.23 + 1);
        const ease = 1 - Math.exp(-dt * 4);
        rot.x += (tx - rot.x) * ease;
        rot.y += (ty - rot.y) * ease;
        const turning = Math.abs(tx - rot.x) + Math.abs(ty - rot.y) > 1e-4;
        render(now);
        const hudMoves = !reduced && props.markers > 0;
        if (visible && (moving || turning || hudMoves || (props.drift > 0 && !reduced))) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
        if (!raf && visible && loaded && !destroyed) {
            lastFrame = performance.now();
            raf = requestAnimationFrame(frame);
        }
    };
    const animate = () => {
        moving = true;
        wake();
    };
    const pictures = () => (props.images || []).map(pictureOf).filter((p) => p.src).slice(0, 4);
    const key = () =>
        [pictures().map((p) => `${p.src}:${p.form || ''}`).join('|'), props.fit, props.form, props.scale, Math.round(props.points), props.focus, props.focus === 'auto' || props.focus === 'even' ? lightBg : '', Math.round(W), Math.round(H)].join('·');
    const load = async () => {
        const token = ++loadToken;
        const list = pictures();
        const imgs = (await Promise.all(list.map((p) => loadImage(p.src)))).map((img, i) => img && { img, form: list[i].form || props.form }).filter(Boolean);
        if (token !== loadToken || destroyed) return;
        const pics = imgs.length ? imgs : [{ img: sphere(), form: props.form }];
        const n = clamp(Math.round(props.points * clamp((W * H) / 7e5, 0.35, 1)), 5000, 250000);
        const first = !loaded;
        const resized = n !== count;
        if (resized) alloc(n);
        sets = pics.map(({ img, form }) => Object.assign(sample(img, W, H, props.fit, form, props.scale, props.focus, !lightBg, n), { solid: form === 'solid' }));
        builtKey = key();
        builtDepth = props.depth;
        if (nextIndex >= sets.length) nextIndex = 0;
        current = nextIndex;
        placeMarkers(nextIndex);
        loaded = true;
        if (first && props.intro && !reduced) {
            waitingIntro = true;
            introPending = true;
            if (visible) intro();
        } else {
            for (let i = 0; i < count; i++) assign(i, nextIndex);
            pending.fill(0);
            if (first || resized || reduced) snap();
            animate();
        }
    };
    const checkBackground = () => {
        const light = isLightBehind(root);
        if (light !== lightBg) {
            lightBg = light;
            if (key() !== builtKey) load();
        }
    };
    const resize = () => {
        const w = Math.max(1, root.clientWidth);
        const h = Math.max(1, root.clientHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = w;
        H = h;
        glCanvas.width = Math.round(w * dpr);
        glCanvas.height = Math.round(h * dpr);
        hud.width = glCanvas.width;
        hud.height = glCanvas.height;
    };
    /** after a change of the settings or the frame's size: rebuilds only what it must */
    const update = () => {
        if (destroyed) return;
        lightBg = isLightBehind(root);
        if (key() !== builtKey) load();
        else if (loaded) {
            if (Math.round(props.markers) !== markerCount) placeMarkers(current);
            if (props.depth !== builtDepth) {
                builtDepth = props.depth;
                const s = depthScale();
                for (let i = 0; i < count; i++) target[i * 3 + 2] = depthOf[i] * s;
                if (reduced) snap();
                else animate();
            }
            wake();
        }
    };

    let resizeTimer = 0;
    const sizes = new ResizeObserver(() => {
        resize();
        if (loaded) render(performance.now());
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(update, 150);
    });
    sizes.observe(root);
    resize();
    load();

    const point = (clientX, clientY) => {
        const r = root.getBoundingClientRect();
        const sx = r.width ? W / r.width : 1;
        const sy = r.height ? H / r.height : 1;
        const x = (clientX - r.left) * sx;
        const y = (clientY - r.top) * sy;
        const inside = x >= 0 && y >= 0 && x <= W && y <= H;
        const was = pointer.inside;
        if (inside) {
            const now = performance.now();
            const px = x - W / 2;
            const py = y - H / 2;
            if (was) {
                const dt = Math.max(now - pointer.at, 8) / 1000;
                pointer.vx = pointer.vx * 0.5 + ((px - pointer.x) / dt) * 0.5;
                pointer.vy = pointer.vy * 0.5 + ((py - pointer.y) / dt) * 0.5;
            } else pointer.vx = pointer.vy = 0;
            pointer.x = px;
            pointer.y = py;
            pointer.nx = clamp(px / (W / 2), -1, 1);
            pointer.ny = clamp(py / (H / 2), -1, 1);
            pointer.at = now;
        }
        pointer.inside = inside;
        if (inside || was) animate();
    };
    const onMouse = (e) => point(e.clientX, e.clientY);
    const onTouch = (e) => {
        if (props.touch && e.touches.length) point(e.touches[0].clientX, e.touches[0].clientY);
    };
    const leave = () => {
        if (pointer.inside) {
            pointer.inside = false;
            animate();
        }
    };
    const onClick = () => {
        if (props.advance === 'click' || props.advance === 'both') next();
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('mouseleave', leave);
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', leave);
    window.addEventListener('touchcancel', leave);
    root.addEventListener('click', onClick);
    const timer = setInterval(() => {
        if (!visible || pointer.inside || (props.advance !== 'auto' && props.advance !== 'both')) return;
        if (performance.now() - changedAt > Math.max(props.interval, 1) * 1000) next();
    }, 250);
    const seen = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) {
            changedAt = performance.now();
            if (introPending) intro();
            else wake();
        }
    });
    seen.observe(root);

    return {
        ok: true,
        /** change any of the settings */
        set(changes) {
            props = { ...props, ...changes };
            dress();
            update();
        },
        next,
        destroy() {
            destroyed = true;
            cancelAnimationFrame(raf);
            clearTimeout(resizeTimer);
            clearInterval(timer);
            sizes.disconnect();
            seen.disconnect();
            window.removeEventListener('mousemove', onMouse);
            document.removeEventListener('mouseleave', leave);
            window.removeEventListener('touchstart', onTouch);
            window.removeEventListener('touchmove', onTouch);
            window.removeEventListener('touchend', leave);
            window.removeEventListener('touchcancel', leave);
            root.removeEventListener('click', onClick);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            glCanvas.remove();
            hud.remove();
        }
    };
}
