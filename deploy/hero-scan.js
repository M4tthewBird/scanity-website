// Hero v3: the villa by day or by night, under the same open index as v2, which the header assembles itself from
// as the page scrolls (header-morph.js). The switch by EN changes the light (day-night.js plays it: dusk, the
// windows coming on, the point cloud igniting); the copy, the veils and the header follow once the scene has
// turned far enough. The choice is remembered on this device. At night the header wears dark glass while the
// photo is under it. On the way out the photo slows, deepens and dims while the next section rises over it as a
// card (the copy scrolls on with the page: held back, it would run into the bar along the bottom).
import { headerMorph } from './header-morph.js';
import { dayNight } from './day-night.js';

const hero = document.querySelector('.hero-scan');
const header = document.querySelector('.site-header');
const KEY = 'scanity-hero-light';

if (hero && header) {
  const body = document.body;
  const index = hero.querySelector('.scan-index');
  headerMorph({ header, index, logo: index?.querySelector('.index-logo'), heroButtons: hero.querySelector('.scan-actions') });

  const notPhone = matchMedia('(min-width: 760.02px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const pic = hero.querySelector('.scan-pic');
  const frame = hero.querySelector('.scan-frame');
  const dim = hero.querySelector('.scan-dim');
  const card = document.getElementById('film');
  const nightImg = hero.querySelector('.scan-photo--night');
  const dayImg = hero.querySelector('.scan-photo--day');
  const nightBlur = hero.querySelector('.scan-blur--night');
  const dayBlur = hero.querySelector('.scan-blur--day');
  const toggle = hero.querySelector('.dn-toggle');
  let ticking = false;

  // ---- the way out, and the header's glass ----
  const render = () => {
    ticking = false;
    const big = notPhone.matches;
    // dark glass at night while the photo, not the card, is under the header
    const cardTop = card ? card.getBoundingClientRect().top : hero.getBoundingClientRect().bottom;
    header.classList.toggle('is-dark', big && cardTop > 64 && body.classList.contains('dark-hero'));
    if (!big || still.matches) {
      pic.style.transform = '';
      dim.style.opacity = '0';
      return;
    }
    const y = Math.max(0, window.scrollY);
    const h = hero.offsetHeight || 1;
    const k = Math.min(1, y / h);
    // past the hero nothing changes, so nothing is written
    if (k >= 1 && pic.dataset.out === '1') return;
    pic.dataset.out = k >= 1 ? '1' : '';
    pic.style.transform = `translate3d(0, ${(y * 0.38).toFixed(1)}px, 0) scale(${(1 + 0.06 * k).toFixed(4)})`;
    dim.style.opacity = (0.6 * k * k).toFixed(3);
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  notPhone.addEventListener?.('change', schedule);

  // ---- day and night ----
  // the day photo comes in once the page has settled, so the switch is ready without slowing the first paint
  let dayAsked = false;
  const loadDay = () => {
    if (dayAsked) return;
    dayAsked = true;
    dayImg.srcset = dayImg.dataset.srcset;
    dayImg.src = dayImg.dataset.srcset.split(' ')[0];
    dayBlur.src = dayBlur.dataset.src;
  };
  if (document.readyState === 'complete') setTimeout(loadDay, 500);
  else addEventListener('load', () => setTimeout(loadDay, 500), { once: true });

  const dn = dayNight(frame, { day: dayImg, night: nightImg });
  const stored = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };
  let light = stored() === 'day' ? 'day' : 'night';
  const turn = (to) => {
    if (to === 'day') loadDay();
    toggle?.setAttribute('aria-checked', String(to === 'night'));
    nightBlur.classList.toggle('is-shown', to === 'night');
    dayBlur.classList.toggle('is-shown', to === 'day');
    dn.set(to, () => {
      body.classList.toggle('dark-hero', to === 'night');
      schedule();
    });
  };
  turn(light);
  toggle?.addEventListener('click', () => {
    light = light === 'night' ? 'day' : 'night';
    try {
      localStorage.setItem(KEY, light);
    } catch {}
    turn(light);
  });
  render();
}
