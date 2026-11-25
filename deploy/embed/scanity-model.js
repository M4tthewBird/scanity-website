// <scanity-model>: a Gaussian splat scan drawn straight into the page (no iframe), with the original PlayCanvas
// engine and the same look as SuperSplat and the Scanity viewer: splats in gamma space, then CAS sharpening and
// colour grading from the scene's settings, with no conversion on the way out.
//
//   <scanity-model scene="nexus"></scanity-model>                    a scene from the Scanity bucket (as the viewer's ?id=)
//   <scanity-model src="boot.sog" settings="settings.json"></scanity-model>   explicit files
//
// Attributes: scene, src, settings, loading ("eager" default | "manual": waits for load()), transparent (no background).
// Properties: settings (an object instead of the file), orbit (see ORBIT_DEFAULTS), autoRotatePaused.
// Methods: load(), flyTo(position, ms), project(point), rayHitsSphere(clientX, clientY, centre, radius),
//          cameraPosition(), aspect(), poke() (counts as interaction for the idle auto-rotation), setActive(on).
// Getters: splat (the gsplat component), cameraEntity.
// Events: progress (detail: 0..1), load, frame (every rendered frame), interact, error (detail: Error).
//
// Coordinates are the viewer's: the scan turned upside down (0, 0, 180), as PlayCanvas and SuperSplat show it.

// the engine sits next to this file (the folder is deployed as a whole)
const ENGINE_URL = new URL('./playcanvas.min.js', import.meta.url).href;
const SCENES_BASE = 'https://pub-4bc2a2ec31ea4d588e494300f6ef5557.r2.dev';

const ORBIT_DEFAULTS = {
    target: [0, 0, 0],
    position: null, // from settings.cameras[0].initial when not given
    fov: null, // vertical degrees; from settings when not given
    minDistance: 0.1,
    maxDistance: 20,
    minPolar: 0.15, // radians from straight above
    maxPolar: Math.PI * 0.62, // not from under the floor
    rotateSpeed: 0.7,
    zoomSpeed: 0.8,
    damping: 0.08,
    autoRotateSpeed: 0.6, // as three.js OrbitControls: 0.6 turns a full circle in 100 s
    idleDelay: 4000, // ms without interaction before the auto-rotation starts; 0 = off
    wheel: 'zoom', // 'zoom': the wheel zooms; 'ctrl': only with Ctrl (a trackpad pinch), so the page still scrolls over it
};

const DEFAULT_SETTINGS = {
    background: { color: [1, 1, 1] },
    tonemapping: 'none',
    highPrecisionRendering: false,
    postEffectSettings: {},
    cameras: [],
};

const gammaChunkGlsl = `
vec3 prepareOutputFromGamma(vec3 gammaColor, float depth) {
    return gammaColor;
}
`;
const gammaChunkWgsl = `
fn prepareOutputFromGamma(gammaColor: vec3f, depth: f32) -> vec3f {
    return gammaColor;
}
`;

let enginePromise = null;
const engine = () => (enginePromise ??= import(ENGINE_URL));

// with post effects the final blit must not turn linear into gamma (the splats already are gamma): the engine
// decides that from isColorBufferSrgb of the target, and the backbuffer is not ours to flag, so the prototype
// answers for the devices that ask for it (several models on one page each get the right answer)
let srgbPatched = false;
const srgbDevices = new Set();
const patchBackBuffer = (pc, device) => {
    srgbDevices.add(device);
    if (srgbPatched) return;
    srgbPatched = true;
    const orig = pc.RenderTarget.prototype.isColorBufferSrgb;
    pc.RenderTarget.prototype.isColorBufferSrgb = function (index) {
        return srgbDevices.has(this.device) && this === this.device.backBuffer ? true : orig.call(this, index);
    };
};

const TONEMAP = { none: 'TONEMAP_NONE', linear: 'TONEMAP_LINEAR', filmic: 'TONEMAP_FILMIC', hejl: 'TONEMAP_HEJL', aces: 'TONEMAP_ACES', aces2: 'TONEMAP_ACES2', neutral: 'TONEMAP_NEUTRAL' };

const resolveScene = async (id) => {
    const folder = `${SCENES_BASE}/${encodeURIComponent(id)}`;
    const name = encodeURIComponent(id);
    const exists = async (url) => {
        try {
            return (await fetch(url, { method: 'HEAD', cache: 'no-store' })).ok;
        } catch {
            return false;
        }
    };
    const candidates = [`${folder}/${name}.sog`, `${folder}/${name}.compressed.ply`, `${folder}/${name}.ply`];
    const found = await Promise.all(candidates.map(async (c) => ((await exists(c)) ? c : null)));
    return { src: found.find(Boolean) ?? candidates[0], settings: `${folder}/settings.json` };
};

class ScanityModel extends HTMLElement {
    static observedAttributes = ['scene', 'src', 'settings'];

    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = `<style>
            :host { display: block; position: relative; touch-action: none; }
            canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; outline: none; }
        </style><canvas part="canvas"></canvas>`;
        this.canvas = root.querySelector('canvas');
        this.orbit = { ...ORBIT_DEFAULTS };
        this.autoRotatePaused = false;
        this._settings = null;
        this._loading = null;
    }

    connectedCallback() {
        if (this.getAttribute('loading') !== 'manual') queueMicrotask(() => this.load().catch(() => {}));
    }

    disconnectedCallback() {
        this._resizeObserver?.disconnect();
        this._app?.destroy();
        this._app = null;
        this._loading = null;
    }

    get settings() {
        return this._settings;
    }

    set settings(value) {
        this._settings = value;
    }

    /** Loads the engine, the scene and its settings, and starts drawing. Resolves when the scan is shown. */
    load() {
        this._loading ??= this._load().catch((err) => {
            this.dispatchEvent(new CustomEvent('error', { detail: err }));
            throw err;
        });
        return this._loading;
    }

    async _load() {
        const pc = await engine();
        this.pc = pc;

        let src = this.getAttribute('src');
        let settingsUrl = this.getAttribute('settings');
        const scene = this.getAttribute('scene');
        if (scene && !src) ({ src, settings: settingsUrl } = { ...(await resolveScene(scene)), ...(settingsUrl ? { settings: settingsUrl } : {}) });
        if (!src) throw new Error('scanity-model: no scene or src');

        let settings = this._settings;
        if (!settings && settingsUrl) {
            try {
                settings = await (await fetch(settingsUrl)).json();
            } catch {
                settings = null;
            }
        }
        settings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
        this._resolvedSettings = settings;

        // the app
        const app = new pc.Application(this.canvas, {
            graphicsDeviceOptions: { antialias: false, alpha: this.hasAttribute('transparent'), premultipliedAlpha: true, depth: true, stencil: false, powerPreference: 'high-performance' },
            mouse: null,
            touch: null,
            keyboard: null,
        });
        this._app = app;
        const device = app.graphicsDevice;
        device.maxPixelRatio = window.devicePixelRatio;
        app.setCanvasFillMode(pc.FILLMODE_NONE);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);
        // splat rendering as the Scanity viewer sets it up (WebGL: sorted on the cpu, which needs the centres)
        const { gsplat } = app.scene;
        gsplat.minContribution = 1;
        gsplat.alphaClip = 1 / 255;
        gsplat.radialSorting = true;
        gsplat.renderer = pc.GSPLAT_RENDERER_RASTER_CPU_SORT;

        // the camera
        const camera = new pc.Entity('camera', app);
        const bg = settings.background?.color ?? [1, 1, 1];
        camera.addComponent('camera', {
            // transparent: cleared to nothing (premultiplied), so the page shows through
            clearColor: this.hasAttribute('transparent') ? new pc.Color(0, 0, 0, 0) : new pc.Color(bg[0], bg[1], bg[2], 1),
            fov: this.orbit.fov ?? settings.cameras?.[0]?.initial?.fov ?? 40,
            nearClip: 0.01,
            farClip: 100,
        });
        app.root.addChild(camera);
        this._camera = camera;

        this._setupLook(pc, app, camera, settings);

        // size: the element's box, at the screen's pixel ratio
        const resize = () => {
            const w = Math.max(1, this.clientWidth);
            const h = Math.max(1, this.clientHeight);
            app.resizeCanvas(w, h);
        };
        this._resizeObserver = new ResizeObserver(resize);
        this._resizeObserver.observe(this);
        resize();

        // the orbit
        const init = settings.cameras?.[0]?.initial;
        const target = this.orbit.target ?? init?.target ?? [0, 0, 0];
        const position = this.orbit.position ?? init?.position ?? [1, 1, 1];
        this._target = new pc.Vec3(...target);
        this._setFromPosition(new pc.Vec3(...position));
        this._velocity = { azimuth: 0, polar: 0, zoom: 1 };
        this._lastInteraction = performance.now();
        this._installInput();
        this._applyCamera();

        this._velocity.zoom = 1;
        app.on('update', (dt) => this._update(dt));
        app.on('frameend', () => this.dispatchEvent(new Event('frame')));
        app.start();

        // the scan
        const filename = new URL(src, location.href).pathname.split('/').pop();
        const asset = new pc.Asset(filename, 'gsplat', { url: src, filename });
        await new Promise((resolve, reject) => {
            asset.on('progress', (received, length) => {
                if (length) this.dispatchEvent(new CustomEvent('progress', { detail: Math.min(1, received / length) }));
            });
            asset.on('load', () => {
                const entity = new pc.Entity('scan', app);
                this._placeScan(pc, entity);
                // the unified splat renderer, as the Scanity viewer and SuperSplat draw
                entity.addComponent('gsplat', { unified: true, asset });
                app.root.addChild(entity);
                this._entity = entity;
                resolve();
            });
            asset.on('error', (err) => reject(err instanceof Error ? err : new Error(String(err))));
            app.assets.add(asset);
            app.assets.load(asset);
        });
        this.dispatchEvent(new Event('load'));
    }

    // The scan upside down (0, 0, 180) as the viewer shows it. An optional `transform` property places the file
    // first, without touching it: p' = scale · rotation · p + offset (rotation a 3×3, rows), then the turn.
    _placeScan(pc, entity) {
        const t = this.transform;
        if (!t) {
            entity.setLocalEulerAngles(0, 0, 180);
            return;
        }
        const s = t.scale ?? 1;
        const R = t.rotation ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const o = t.offset ?? [0, 0, 0];
        // Rz(180) · [sR | o]: the first two rows change sign; pc.Mat4 data is column-major
        const flip = (i) => (i < 2 ? -1 : 1);
        const m = new pc.Mat4(); // the rotation alone, for the quaternion
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) m.data[c * 4 + r] = R[r][c] * flip(r);
        entity.setLocalPosition(o[0] * flip(0), o[1] * flip(1), o[2]);
        entity.setLocalRotation(new pc.Quat().setFromMat4(m));
        entity.setLocalScale(s, s, s);
    }

    // background, tone mapping and post effects as the viewer applies settings.json
    _setupLook(pc, app, camera, settings) {
        const fx = settings.postEffectSettings ?? {};
        const on = (e) => e?.enabled;
        const wantsFrame = settings.highPrecisionRendering || on(fx.sharpness) || on(fx.grading) || on(fx.bloom) || on(fx.vignette) || on(fx.fringing);
        const toneMapping = pc[TONEMAP[settings.tonemapping] ?? 'TONEMAP_NONE'];
        if (!wantsFrame) {
            camera.camera.toneMapping = toneMapping;
            return;
        }
        const frame = new pc.CameraFrame(app, camera.camera);
        frame.rendering.toneMapping = toneMapping;
        frame.rendering.renderFormats = settings.highPrecisionRendering ? [pc.PIXELFORMAT_RGBA16F, pc.PIXELFORMAT_RGBA32F] : [];
        frame.rendering.sharpness = on(fx.sharpness) ? fx.sharpness.amount : 0;
        frame.bloom.intensity = on(fx.bloom) ? fx.bloom.intensity : 0;
        if (on(fx.bloom)) frame.bloom.blurLevel = fx.bloom.blurLevel;
        frame.grading.enabled = !!on(fx.grading);
        if (on(fx.grading)) {
            frame.grading.brightness = fx.grading.brightness;
            frame.grading.contrast = fx.grading.contrast;
            frame.grading.saturation = fx.grading.saturation;
            frame.grading.tint = new pc.Color().fromArray(fx.grading.tint ?? [1, 1, 1]);
        }
        frame.vignette.intensity = on(fx.vignette) ? fx.vignette.intensity : 0;
        if (on(fx.vignette)) {
            frame.vignette.inner = fx.vignette.inner;
            frame.vignette.outer = fx.vignette.outer;
            frame.vignette.curvature = fx.vignette.curvature;
        }
        frame.fringing.intensity = on(fx.fringing) ? fx.fringing.intensity : 0;
        frame.update();
        this._frame = frame;
        // splats write gamma colour; the blit out keeps it
        pc.ShaderChunks.get(app.graphicsDevice, 'glsl').set('gsplatOutputVS', gammaChunkGlsl);
        pc.ShaderChunks.get(app.graphicsDevice, 'wgsl').set('gsplatOutputVS', gammaChunkWgsl);
        patchBackBuffer(pc, app.graphicsDevice);
    }

    // ---- orbit -----------------------------------------------------------------------------------------------
    _setFromPosition(pos) {
        const d = pos.clone().sub(this._target);
        this._distance = d.length();
        this._polar = Math.acos(Math.min(1, Math.max(-1, d.y / this._distance)));
        this._azimuth = Math.atan2(d.x, d.z);
    }

    _applyCamera() {
        const { minPolar, maxPolar, minDistance, maxDistance } = this.orbit;
        this._polar = Math.min(maxPolar, Math.max(minPolar, this._polar));
        this._distance = Math.min(maxDistance, Math.max(minDistance, this._distance));
        const s = Math.sin(this._polar);
        const pos = new this.pc.Vec3(
            this._target.x + this._distance * s * Math.sin(this._azimuth),
            this._target.y + this._distance * Math.cos(this._polar),
            this._target.z + this._distance * s * Math.cos(this._azimuth)
        );
        this._camera.setPosition(pos);
        this._camera.lookAt(this._target);
    }

    _update(dt) {
        const now = performance.now();
        if (this._glide) {
            const g = this._glide;
            const t = Math.min(1, (now - g.t0) / g.ms);
            const e = 1 - Math.pow(1 - t, 3);
            this._setFromPosition(new this.pc.Vec3().lerp(g.from, g.to, e));
            if (t >= 1) this._glide = null;
        } else {
            // as three.js OrbitControls with damping: what is left of each turn is applied a share per frame
            const { damping, autoRotateSpeed, idleDelay } = this.orbit;
            const v = this._velocity;
            if (idleDelay > 0 && !this.autoRotatePaused && now - this._lastInteraction > idleDelay && !this._dragging) {
                v.azimuth -= ((2 * Math.PI) / 60) * autoRotateSpeed * dt;
            }
            this._azimuth += v.azimuth * damping;
            this._polar += v.polar * damping;
            v.azimuth *= 1 - damping;
            v.polar *= 1 - damping;
            this._distance *= v.zoom;
            v.zoom = 1;
        }
        this._applyCamera();
    }

    _interacted() {
        this._lastInteraction = performance.now();
        this._glide = null;
        this.dispatchEvent(new Event('interact'));
    }

    /** Counts as interaction: the idle auto-rotation waits again. */
    poke() {
        this._lastInteraction = performance.now();
    }

    _installInput() {
        const el = this;
        const pointers = new Map();
        let pinch = 0;
        const rotate = (dx, dy) => {
            const h = el.clientHeight || 1;
            const k = ((2 * Math.PI) / h) * this.orbit.rotateSpeed;
            this._velocity.azimuth -= dx * k;
            this._velocity.polar -= dy * k;
        };
        el.addEventListener('pointerdown', (e) => {
            el.setPointerCapture?.(e.pointerId);
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            this._dragging = true;
            this._interacted();
            if (pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                pinch = Math.hypot(a.x - b.x, a.y - b.y);
            }
        });
        el.addEventListener('pointermove', (e) => {
            const p = pointers.get(e.pointerId);
            if (!p) return;
            if (pointers.size === 1) {
                rotate(e.clientX - p.x, e.clientY - p.y);
            } else if (pointers.size === 2) {
                p.x = e.clientX;
                p.y = e.clientY;
                const [a, b] = [...pointers.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (pinch > 0 && d > 0) this._velocity.zoom *= pinch / d;
                pinch = d;
            }
            p.x = e.clientX;
            p.y = e.clientY;
            this._interacted();
        });
        const up = (e) => {
            pointers.delete(e.pointerId);
            if (pointers.size < 2) pinch = 0;
            if (!pointers.size) this._dragging = false;
        };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener(
            'wheel',
            (e) => {
                if (this.orbit.wheel === 'ctrl' && !e.ctrlKey) return;
                e.preventDefault();
                // as OrbitControls: 0.95 ^ (zoomSpeed · |delta| · 0.01) per wheel step
                const step = Math.pow(0.95, this.orbit.zoomSpeed * Math.abs(e.deltaY) * 0.01);
                this._velocity.zoom *= e.deltaY > 0 ? 1 / step : step;
                this._interacted();
            },
            { passive: false }
        );
    }

    // ---- API for the page --------------------------------------------------------------------------------------
    /** Glides the camera to a position (around the same target) in ms. */
    flyTo(position, ms = 900) {
        if (!this._camera) return;
        const pc = this.pc;
        this._glide = { from: this._camera.getPosition().clone(), to: new pc.Vec3(...position), t0: performance.now(), ms };
        this._velocity = { azimuth: 0, polar: 0, zoom: 1 };
    }

    /** Where a world point lands in the element, in CSS pixels; visible is false behind the camera. */
    project(point) {
        if (!this._camera) return { x: 0, y: 0, visible: false };
        const pc = this.pc;
        const w = new pc.Vec3(...point);
        const out = new pc.Vec3();
        this._camera.camera.worldToScreen(w, out);
        const forward = this._camera.forward;
        const toPoint = w.clone().sub(this._camera.getPosition());
        return { x: out.x, y: out.y, visible: toPoint.dot(forward) > 0 };
    }

    /** True when the pixel under clientX/clientY looks at the sphere (centre, radius). */
    rayHitsSphere(clientX, clientY, centre, radius) {
        if (!this._camera) return false;
        const pc = this.pc;
        const r = this.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        const cam = this._camera.camera;
        const near = cam.screenToWorld(x, y, cam.nearClip, new pc.Vec3());
        const far = cam.screenToWorld(x, y, cam.farClip, new pc.Vec3());
        const ray = new pc.Ray(near, far.sub(near).normalize());
        return new pc.BoundingSphere(new pc.Vec3(...centre), radius).intersectsRay(ray);
    }

    /** The scan's gsplat component (for work-buffer modifiers), null before load. */
    get splat() {
        return this._entity?.gsplat ?? null;
    }

    /** The camera entity, null before load. */
    get cameraEntity() {
        return this._camera ?? null;
    }

    /** Stops drawing (false) while the element is off screen, and resumes (true). */
    setActive(on) {
        if (this._app) this._app.autoRender = on;
    }

    cameraPosition() {
        const p = this._camera?.getPosition();
        return p ? [p.x, p.y, p.z] : null;
    }

    /** Width / height of the element. */
    aspect() {
        return (this.clientWidth || 1) / (this.clientHeight || 1);
    }

    /** Sets the orbit target and distance limits after load (e.g. when the frame gets narrower). */
    setLimits({ minDistance, maxDistance } = {}) {
        if (minDistance !== undefined) this.orbit.minDistance = minDistance;
        if (maxDistance !== undefined) this.orbit.maxDistance = maxDistance;
    }
}

if (!customElements.get('scanity-model')) customElements.define('scanity-model', ScanityModel);

export { ScanityModel };
