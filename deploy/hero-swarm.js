// The hero's swarm of points in Scanity blue: the Scanity logo, beside the headline. Phones skip it (their hero
// stays as it was: headline, text and buttons, then the film); without WebGL the logo shows as a plain image.
import { particleImage } from './particle-image.js';

const hero = document.querySelector('.hero-swarm');
const stage = hero?.querySelector('.hero-swarm-stage');

if (hero && stage) {
  const phone = matchMedia('(max-width: 760px)');
  let swarm = null;
  const start = () => {
    if (swarm || phone.matches) return;
    swarm = particleImage(stage, {
      images: [new URL(stage.dataset.logo, document.baseURI).href],
      colorMode: 'solid',
      color: '#246bfd',
      form: 'solid',
      points: 45000,
      size: 1.1,
      scale: 0.8,
      depth: 0.15,
      tilt: 24,
      push: 0.4,
      radius: 100,
      speed: 1,
      drift: 0.1,
      markers: 0,
      count: false,
      advance: 'off',
      decorative: true
    });
    if (!swarm.ok) hero.classList.add('is-static');
  };
  start();
  // a window widened past phone size gets its swarm then
  phone.addEventListener?.('change', start);
}
