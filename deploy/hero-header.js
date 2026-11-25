// Homepage (v1): the header assembles itself from the hero's open index as the page scrolls, as in the v2 and v3
// previews (header-morph.js). The index here is a row above the headline and the swarm.
import { headerMorph } from './header-morph.js';

const hero = document.querySelector('.hero-swarm-index');
const header = document.querySelector('.site-header');

if (hero && header) {
  headerMorph({
    header,
    index: hero.querySelector('.index-bar'),
    logo: hero.querySelector('.index-logo'),
    heroButtons: hero.querySelector('.hero-copy .hero-actions')
  });
}
