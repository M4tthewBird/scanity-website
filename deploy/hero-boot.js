// The boot in the homepage's hero (where the Scanity logo of points stood), live in 3D (<scanity-model>, embed/scanity-model.js, the same component
// and scan as the MTS Nexus concept page). The slider turns a cloud of Scan-Blue points into the photorealistic model:
// a front sweeps across the boot from the left of the screen to the right, whichever side the visitor is looking at.
// With the model fully revealed, labels from the datasheet sit on the boot (hover or tap a dot for its card).
//
// Until the 3D is ready a still of its first frame (the point cloud) stands in as a poster, with no loading bar.
// The scan (18 MB) and the engine (2.5 MB) load once the section is near; on phones and with Save-Data only after a tap.
(() => {
  const figure = document.querySelector('.boot-reveal');
  if (!figure) return;
  const $ = (sel) => figure.querySelector(sel);
  const stage = $('.boot-stage');
  const slider = $('.boot-slider');
  const layer = $('.boot-hotspots');
  const cs = (document.documentElement.lang || 'cs').startsWith('cs');

  // ---- the scan, placed and seen as on the concept page --------------------------------------------------------
  // The second scan came out in its own place, size and turn; TRANSFORM lays it onto the first scan's axes. The boot
  // then stands on y = 0, toe towards +x, its outer side towards +z. Points below are in those metres.
  const TRANSFORM = {
    scale: 0.4874321229950778,
    rotation: [
      [-0.21890706389652914, -0.06035026395426685, -0.9738775811244714],
      [0.009873340107846306, 0.9978973302677373, -0.06405806272154367],
      [0.975695759205356, -0.023638187011121414, -0.21785091595747663]
    ],
    offset: [-0.9665574952211948, 12.910387839773549, 0.572152187125774]
  };
  const CENTRE = [0.02, 0.2, -0.03];
  const VIEW = { from: [0.44, 0.47, 1.16], fov: 32, near: 0.42, far: 1.7 };
  const START_FROM = [0.62, 0.68, 1.55];
  const SETTINGS = {
    background: { color: [1, 1, 1] },
    tonemapping: 'none',
    highPrecisionRendering: false,
    postEffectSettings: {
      sharpness: { enabled: true, amount: 0.33 },
      grading: { enabled: true, brightness: 1.07, contrast: 1.07, saturation: 1.03, tint: [1, 1, 1] }
    }
  };

  const SPOTS = [
    { id: 'toe', at: [0.29, 0.162, -0.065], normal: [0.75, 0.55, 0.35], stat: '<em>200</em> J',
      cs: ['Špička', 'Lehká kompozitní špička odolá nárazu 200 J. Plná ochrana bez váhy oceli a bez kovu.'],
      en: ['Toe cap', 'Lightweight composite toe cap, resistant to a 200 joule impact. Full protection without the weight of steel, and metal-free.'] },
    { id: 'lacing', at: [0.048, 0.279, -0.028], normal: [1, 0.4, 0.2],
      cs: ['Šněrování', 'Přesné šněrování drží nohu pevně od nártu až po lem.'],
      en: ['Lacing', 'Precision fit lacing system for a secure hold from instep to collar.'] },
    { id: 'ankle', at: [-0.115, 0.27, 0.1], normal: [-0.1, 0, 1],
      cs: ['Kotník', 'Chránič kotníku PORON® XRD® pohlcuje energii nárazu a snižuje riziko zranění.'],
      en: ['Ankle', 'Integrated PORON® XRD® ankle protector absorbs impact energy and helps reduce the risk of injury.'] },
    { id: 'upper', at: [0.059, 0.186, 0.053], normal: [0.3, 0.2, 1],
      cs: ['Svršek', 'Celozrnná useň a mikrovlákno odolné proti oděru vydrží dlouho.'],
      en: ['Upper', 'Full-grain leather with high-abrasion microfibre for long-lasting durability.'] },
    { id: 'outsole', at: [0.097, 0.044, 0.077], normal: [0.2, -0.3, 1],
      cs: ['Podešev', 'Podešev PU/TPU odolná proti oděru, protiskluzový vzorek SRC pro jistý krok.'],
      en: ['Outsole', 'PU/TPU high-abrasion outsole with SRC anti-slip pattern for confident footing.'] },
    { id: 'heel', at: [-0.218, 0.091, 0.095], normal: [-0.7, 0, 0.7],
      cs: ['Pata', 'Zpevněná pata pro větší stabilitu, oporu a delší životnost.'],
      en: ['Heel', 'Reinforced heel for greater stability, support and long-term durability.'] },
    { id: 'reflective', at: [-0.198, 0.305, 0.081], normal: [-0.6, 0.2, 0.8],
      cs: ['Reflexní prvky', 'Reflexní detaily zlepšují viditelnost při slabém světle.'],
      en: ['Reflective', 'Reflective details enhance visibility in low-light conditions.'] }
  ];

  // ---- the point cloud: a work-buffer modifier on the splats ---------------------------------------------------
  // The modifier sees the splats in world space (the boot's metres above). The points are as large on screen as the
  // hero logo's were (hero-swarm.js: size 1.1 px), whatever the zoom: px = their diameter in CSS pixels, turned into
  // metres every frame from the camera's distance. density = share of splats drawn as points, span = half the boot's
  // length, soft = width of the sweep front (0..1).
  const PC = { density: 0.045, px: 1.1, sigma: 0.4, size: 0.0008, span: 0.27, soft: 0.22, blue: [0.141, 0.42, 0.992] };
  const glsl = /* glsl */ `
    uniform float uPcWave;
    uniform vec3  uPcAxis;
    uniform vec3  uPcCenter;
    uniform float uPcSpan;
    uniform float uPcSoft;
    uniform float uPcSize;
    uniform float uPcDensity;
    uniform vec3  uPcBlue;

    float pcHash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }
    // 0 = point, 1 = real splat
    float pcReveal(vec3 c) {
      // the slider's ends are exact: all points at 0, the whole model at 1 (no blue left on the toe)
      if (uPcWave >= 1.0) return 1.0;
      float t = dot(c - uPcCenter, uPcAxis) / (2.0 * uPcSpan) + 0.5;
      float jitter = (pcHash(c.zxy + 3.1) - 0.5) * 0.05;
      // the front runs from well before the boot to well past it: seen from an angle the toe reaches beyond 0..1
      float front = uPcWave * (1.0 + 2.0 * uPcSoft + 0.4) - uPcSoft - 0.2;
      return smoothstep(0.0, 1.0, (front - t + jitter) / uPcSoft + 0.5);
    }
    void modifySplatCenter(inout vec3 center) {}
    void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {
      float k = pcReveal(originalCenter);
      float isPoint = step(pcHash(originalCenter), uPcDensity);
      float dotSize = uPcSize * (0.7 + 0.6 * pcHash(originalCenter + 1.3));
      scale = mix(vec3(dotSize) * isPoint, scale, k * k);
    }
    void modifySplatColor(vec3 center, inout vec4 color) {
      float k = pcReveal(center);
      float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 point = uPcBlue * (0.62 + 0.55 * lum);
      color.rgb = mix(point, color.rgb, k);
      color.a = mix(1.0, color.a, k);
    }
  `;

  const value = () => Number(slider.value) / Number(slider.max);
  const label = (v) => {
    const pct = Math.round(v * 100);
    slider.setAttribute('aria-valuetext', pct === 0 ? figure.dataset.start : pct === 100 ? figure.dataset.end : `${pct} %`);
  };
  const setReveal = (v) => {
    figure.style.setProperty('--reveal', v.toFixed(3));
    figure.classList.toggle('is-revealed', v > 0.92);
  };

  let model = null;
  let started = false;
  let dirty = true; // the modifier needs to run again (the slider moved, or the camera while the front is mid-way)
  let touched = false; // the visitor has taken the slider: the intro sweep stops and leaves it to them

  const show = () => {
    const v = value();
    label(v);
    setReveal(v);
    dirty = true;
  };
  // 'input' comes only from the visitor (setting .value in code does not fire it)
  slider.addEventListener('input', () => {
    touched = true;
    show();
    start();
  });
  slider.addEventListener('pointerdown', () => (touched = true));

  // on entering the page: the points glide in with the camera, then the scan sweeps itself into the model, the slider
  // travelling with it; reduced motion goes straight to the model
  const intro = () => {
    if (touched) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      slider.value = slider.max;
      show();
      return;
    }
    const delay = 700;
    const ms = 2800;
    const t0 = performance.now() + delay;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now) => {
      if (touched) return;
      const t = Math.min(1, Math.max(0, (now - t0) / ms));
      slider.value = Math.round(ease(t) * Number(slider.max));
      show();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const start = async () => {
    if (started) return;
    started = true;
    figure.dataset.state = 'loading';
    try {
      await run();
    } catch (err) {
      console.error(err);
      figure.dataset.state = 'failed';
    }
  };

  const run = async () => {
    await import(new URL(figure.dataset.embed, document.baseURI).href);
    model = document.createElement('scanity-model');
    model.setAttribute('loading', 'manual');
    model.setAttribute('transparent', '');
    model.setAttribute('src', figure.dataset.src);
    model.className = 'boot-model';
    model.settings = SETTINGS;
    model.transform = TRANSFORM;
    model.orbit = { ...model.orbit, target: CENTRE, position: START_FROM, fov: VIEW.fov, minDistance: VIEW.near, maxDistance: VIEW.far, wheel: 'ctrl' };
    stage.prepend(model);

    // the boot is wider than tall: a frame narrower than square needs the camera further back
    const fit = () => Math.max(1, 1.08 / model.aspect());
    // ZOOM < 1 brings the camera in from the concept page's framing: in the hero the boot is the right column's subject
    const ZOOM = 0.84;
    const homePos = () => CENTRE.map((c, i) => c + (VIEW.from[i] - c) * fit() * ZOOM);
    new ResizeObserver(() => model.setLimits({ maxDistance: VIEW.far * fit() })).observe(stage);

    await model.load();

    // the point cloud
    const splat = model.splat;
    const set = (name, v) => splat.setParameter(name, v);
    set('uPcSpan', PC.span);
    set('uPcSoft', PC.soft);
    set('uPcSize', PC.size);
    set('uPcDensity', PC.density);
    set('uPcBlue', PC.blue);
    set('uPcCenter', CENTRE);
    set('uPcAxis', [1, 0, 0]);
    set('uPcWave', value());
    splat.setWorkBufferModifier({ glsl });
    let lastAxis = '';
    let lastSize = 0;
    window.__bootPc = PC; // tuning from the console: __bootPc.px = 1.5

    // labels
    const spots = SPOTS.map((s) => {
      const [title, body] = cs ? s.cs : s.en;
      const el = document.createElement('div');
      el.className = 'hs';
      el.innerHTML = `<button class="hs-dot" type="button" aria-label="${title}"></button>
        <div class="hs-card"><span class="hs-title">${title}</span><div class="hs-body">${s.stat ? `<strong>${s.stat}</strong>` : ''}${body}</div></div>`;
      layer.append(el);
      const n = Math.hypot(...s.normal);
      const spot = { ...s, el, card: el.querySelector('.hs-card'), body: el.querySelector('.hs-body'), normal: s.normal.map((v) => v / n) };
      const hover = (open) => {
        spot.hover = open;
        refreshOpen();
      };
      el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && hover(true));
      el.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hover(false));
      el.querySelector('.hs-dot').addEventListener('click', () => {
        const open = !spot.pinned;
        for (const o of spots) o.pinned = false; // one card at a time
        spot.pinned = open;
        refreshOpen();
      });
      return spot;
    });
    const refreshOpen = () => {
      for (const s of spots) s.el.classList.toggle('is-open', !!(s.hover || s.pinned));
      // the boot holds still while a card is open
      model.autoRotatePaused = spots.some((s) => s.el.classList.contains('is-open'));
      model.poke();
    };
    // a tap on the boot itself closes a pinned card
    model.addEventListener('pointerdown', () => {
      if (spots.some((s) => s.pinned)) {
        for (const s of spots) s.pinned = false;
        refreshOpen();
      }
    });

    // the labels' toggle says what it will do: "Skrýt popisky" while they show, "Zobrazit popisky" while hidden
    $('.boot-labels').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('span').textContent = on ? btn.dataset.hide : btn.dataset.show;
      layer.classList.toggle('is-off', !on);
    });
    // the hint goes once the visitor has turned the boot
    model.addEventListener('interact', () => figure.classList.add('is-used'), { once: true });
    $('.boot-reset').addEventListener('click', () => {
      model.flyTo(homePos(), 900);
      model.poke();
    });

    figure.dataset.state = 'live';
    model.flyTo(homePos(), 2200);
    intro();

    // only draw while the section is on screen
    new IntersectionObserver((entries) => model.setActive(entries.some((e) => e.isIntersecting))).observe(figure);

    // every frame: the sweep follows the screen's left-to-right, the labels follow the boot
    model.addEventListener('frame', () => {
      const v = value();
      // the camera's right axis, flattened onto the ground
      const r = model.cameraEntity.right;
      const len = Math.hypot(r.x, r.z) || 1;
      const axis = [r.x / len, 0, r.z / len];
      const key = axis.map((a) => a.toFixed(3)).join();
      if (key !== lastAxis && v > 0 && v < 1) dirty = true;
      // the point size: px on screen at the camera's distance (a splat of scale s shows about 1 / sigma · s across)
      const fov = (VIEW.fov * Math.PI) / 180;
      const dist = Math.hypot(...model.cameraPosition().map((c, i) => c - CENTRE[i]));
      const size = ((PC.px * PC.sigma * 2 * dist * Math.tan(fov / 2)) / (stage.clientHeight || 1));
      if (v < 1 && Math.abs(size - lastSize) / size > 0.02) {
        dirty = true;
        lastSize = size;
      }
      if (dirty) {
        lastAxis = key;
        set('uPcAxis', axis);
        set('uPcWave', v);
        set('uPcSize', size);
        splat.workBufferUpdate = 1; // once, now
        dirty = false;
      }

      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const cam = model.cameraPosition();
      const midX = model.project(CENTRE).x;
      for (const s of spots) {
        const { x, y } = model.project(s.at);
        const toCam = cam.map((c, i) => c - s.at[i]);
        const d = Math.hypot(...toCam) || 1;
        const facing = (s.normal[0] * toCam[0] + s.normal[1] * toCam[1] + s.normal[2] * toCam[2]) / d > -0.05;
        s.el.classList.toggle('is-back', !facing);
        // the label reads away from the boot's middle, unless that would leave the frame
        const width = s.el.offsetWidth;
        let leftwards = x < midX;
        if (leftwards && x - width < 4) leftwards = false;
        else if (!leftwards && x + width > w - 4) leftwards = true;
        s.el.classList.toggle('is-left', leftwards);
        const left = leftwards ? x - width : x;
        s.el.style.transform = `translate(${left.toFixed(1)}px, ${(y - 13).toFixed(1)}px)`;
        // the card keeps inside the frame: slid back from the side, and above the label near the bottom
        const cardLeft = leftwards ? left : left + width - s.card.offsetWidth;
        const bodyLeft = leftwards ? cardLeft + s.card.offsetWidth - s.body.offsetWidth : cardLeft;
        const shift = Math.min(0, w - 6 - (bodyLeft + s.body.offsetWidth)) + Math.max(0, 6 - bodyLeft);
        s.body.style.translate = `${shift.toFixed(0)}px 0`;
        s.el.classList.toggle('is-up', y + 13 + s.card.offsetHeight + s.body.offsetHeight > h - 6);
      }
    });
  };

  $('.boot-start').addEventListener('click', () => start());

  // the buttons under the boot: the demo section below, with that scan picked and started
  for (const link of figure.querySelectorAll('.boot-scans a[data-scan]')) {
    link.addEventListener('click', (e) => {
      const tab = document.querySelector(`.viewer-switch-btn[data-id="${link.dataset.scan}"]`);
      const demo = document.getElementById('demo');
      if (!tab || !demo) return;
      e.preventDefault();
      tab.click();
      const frame = document.getElementById('demoViewerFrame');
      if (frame && !frame.classList.contains('is-loaded')) document.getElementById('viewerLaunchBtn')?.click();
      demo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#demo');
    });
  }

  // the 3D loads by itself once the section is near, except on phones and with Save-Data (there the button starts it)
  const waitForTap = matchMedia('(max-width: 760px)').matches || navigator.connection?.saveData;
  figure.classList.toggle('needs-tap', !!waitForTap);
  if (!waitForTap && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: '300px 0px' }
    );
    io.observe(figure);
  }

  label(value());
  setReveal(value());
})();
