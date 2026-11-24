// Hero v2: an open index of the site over a dome of points. The header assembles itself from the index as the
// page scrolls (header-morph.js); phones keep the plain hero and get no dome.
import { headerMorph } from './header-morph.js';
import { pointDome } from './point-dome.js';

const hero = document.querySelector('.hero-index');
const header = document.querySelector('.site-header');

if (hero && header) {
  const index = hero.querySelector('.index-top');
  headerMorph({ header, index, logo: hero.querySelector('.index-logo'), heroButtons: hero.querySelector('.index-brand .hero-actions') });
  const phone = matchMedia('(max-width: 760px)');

  // ---- the dome: not on phones, which keep the plain hero; its crown stands on the line under the index ----
  const stage = hero.querySelector('.dome-stage');
  const meta = hero.querySelector('.index-meta');
  const crown = () => (meta ? meta.getBoundingClientRect().top - stage.getBoundingClientRect().top + 6 : stage.clientHeight * 0.62);
  let dome = null;
  const start = () => {
    if (dome || !stage || phone.matches) return;
    dome = pointDome(stage, { crown });
    document.fonts?.ready.then(() => dome.relayout?.());
  };
  start();
  phone.addEventListener?.('change', start);
}
