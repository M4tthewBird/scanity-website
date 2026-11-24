// The header assembling itself as the page scrolls, shared by the homepage hero previews (v2, v3).
//
// While the hero's index is on screen the header is not there; as the page scrolls, the hero's logo and its two
// column titles glide into the header (as stand-ins in a layer above the page, while the page scrolls on beneath
// them), the links under the titles dissolve one after another, a soft blurred top takes whatever scrolls under it,
// then the header's own glass bar with its line takes over; its buttons appear once the same buttons in the hero
// have gone under it. It follows the scroll position, so it stops wherever the scrolling stops, and scrolling back
// takes it apart. Reduced motion: the header simply fades in once the index has gone. Tablets and phones: the
// header stays put (its menu is behind the burger).
//
//   headerMorph({ header, index, logo, heroButtons })
//     index: the block holding the logo and .index-columns (with #indexUse and #indexAbout titles)
//     logo: the hero's logo (the header's brand at 1.26x), heroButtons: the hero's own buttons

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** a dropdown in the header, opened by click or hover, closed by leaving, clicking elsewhere or Escape */
export const wireDropdown = (wrap, toggle) => {
  if (!wrap || !toggle) return;
  let closeTimer;
  let openedByHover = false;
  const setOpen = (open) => {
    clearTimeout(closeTimer);
    wrap.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => {
    if (openedByHover) {
      openedByHover = false;
      setOpen(true);
      return;
    }
    setOpen(!wrap.classList.contains('open'));
  });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    wrap.addEventListener('mouseenter', () => {
      if (!wrap.classList.contains('open')) openedByHover = true;
      setOpen(true);
    });
    wrap.addEventListener('mouseleave', () => {
      openedByHover = false;
      closeTimer = setTimeout(() => setOpen(false), 180);
    });
  }
  wrap.addEventListener('focusout', (e) => {
    if (!wrap.contains(e.relatedTarget)) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
};

export function headerMorph({ header, index, logo, heroButtons }) {
  if (!header || !index) return;
  wireDropdown(document.getElementById('aboutDropdown'), document.getElementById('aboutToggle'));
  const wide = matchMedia('(min-width: 1000.02px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- the plain way (reduced motion): the header hidden while the index shows, in once it has gone ----
  let morphing = false;
  let indexInView = true;
  const tuck = () => header.classList.toggle('is-tucked', wide.matches && indexInView);
  new IntersectionObserver(
    (entries) => {
      indexInView = entries[entries.length - 1].isIntersecting;
      if (!morphing) tuck();
    },
    { rootMargin: '-64px 0px 0px 0px' }
  ).observe(index);

  // ---- the header assembling itself ----
  const pairs = [
    { src: logo, dst: header.querySelector('.brand') },
    { src: document.getElementById('indexUse'), dst: document.getElementById('industryToggle'), text: true },
    { src: document.getElementById('indexAbout'), dst: document.getElementById('aboutToggle'), text: true }
  ].filter((p) => p.src && p.dst);
  const columns = [...index.querySelectorAll('.index-columns ul')].map((ul) => [...ul.children]);
  const actions = header.querySelector('.header-actions');

  const layer = document.createElement('div');
  layer.className = 'morph-ghosts';
  layer.setAttribute('aria-hidden', 'true');
  // a soft, blurred top that whatever scrolls under it fades into, before the header's hard bar takes over
  const soft = document.createElement('div');
  soft.className = 'soft-top';
  soft.setAttribute('aria-hidden', 'true');
  let measured = false;
  let actionsIn = false;
  let range = 300;
  let ticking = false;

  /** the box of an element's own text (a label without its chevron) */
  const textBox = (el) => {
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!node) return el.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(node);
    return r.getBoundingClientRect();
  };

  /** where each part starts (in the page, scrolled to the top) and where it lands (in the header) */
  const measure = () => {
    const shown = pairs.map((p) => [p.src.style.visibility, p.dst.style.opacity]);
    pairs.forEach((p) => {
      p.src.style.visibility = '';
      p.dst.style.opacity = '';
    });
    const y = window.scrollY;
    // the whole assembly happens over about a third of a screen of scrolling
    range = clamp(innerHeight * 0.36, 220, 420);
    for (const p of pairs) {
      const s = p.src.getBoundingClientRect();
      const d = p.dst.getBoundingClientRect();
      p.from = { x: s.left, y: s.top + y };
      // a label's text lands on the tab's text, the logo's mark on the header's mark (the header's logo link
      // stretches over its whole grid cell, so its own box says nothing about its size)
      const st = p.text ? textBox(p.src) : p.src.querySelector('img').getBoundingClientRect();
      const dt = p.text ? textBox(p.dst) : p.dst.querySelector('img').getBoundingClientRect();
      p.scale = p.text ? parseFloat(getComputedStyle(p.dst).fontSize) / parseFloat(getComputedStyle(p.src).fontSize) : dt.height / st.height;
      p.to = { x: dt.left - (st.left - s.left) * p.scale, y: dt.top - (st.top - s.top) * p.scale };
      if (!p.ghost) {
        p.ghost = p.src.cloneNode(true);
        p.ghost.removeAttribute('id');
        p.ghost.removeAttribute('href');
        p.ghost.removeAttribute('aria-label');
        layer.append(p.ghost);
      }
      Object.assign(p.ghost.style, { left: `${p.from.x}px`, top: '0px', width: `${s.width}px` });
    }
    pairs.forEach((p, i) => {
      p.src.style.visibility = shown[i][0];
      p.dst.style.opacity = shown[i][1];
    });
    measured = true;
  };

  const render = () => {
    ticking = false;
    if (!morphing) return;
    if (!measured) measure();
    const y = window.scrollY;
    const p = clamp(y / range);
    // (read before writing anything, so the page lays out once a frame)
    const buttonsBottom = heroButtons ? heroButtons.getBoundingClientRect().bottom : 0;
    // they rise early (ease-out) and slide across later (ease-in-out): the titles travel on an arc
    const e = inOut(p);
    const rise = 1 - (1 - p) ** 3;
    // near the end the stand-ins give way to the header's own logo and tabs, which by then stand where they do
    const handover = smooth(0.8, 1, p);
    for (const q of pairs) {
      const x = (q.to.x - q.from.x) * e;
      const gy = q.from.y + (q.to.y - q.from.y) * rise;
      const s = 1 + (q.scale - 1) * rise;
      q.ghost.style.transform = `translate(${x}px, ${gy}px) scale(${s})`;
      q.ghost.style.opacity = p > 0 ? String(1 - handover) : '0';
      q.src.style.visibility = p > 0 ? 'hidden' : '';
      q.dst.style.opacity = String(handover);
    }
    // the links under the titles dissolve, one after another, top to bottom
    for (const items of columns) {
      items.forEach((li, i) => {
        const k = smooth(0.02 + i * 0.07, 0.3 + i * 0.07, p);
        li.style.opacity = String(1 - k);
        li.style.transform = k ? `translateY(${-14 * k}px)` : '';
        li.style.filter = k ? `blur(${(4 * k).toFixed(2)}px)` : '';
        li.style.visibility = k >= 1 ? 'hidden' : '';
      });
    }
    // first a soft blurred top the page fades into (no hard edge), then the header's own glass bar with its
    // line takes over; the tabs' pill fills in toward the end
    const hard = smooth(0.7, 1, p);
    soft.style.opacity = String(smooth(0, 0.14, p) * (1 - hard));
    header.style.setProperty('--bar', String(hard));
    header.style.setProperty('--pill', String(smooth(0.5, 1, p)));
    // the header's buttons come once the same buttons in the hero have gone under the bar, and leave when those
    // return: a short staggered entrance of their own (CSS), not tied to the scroll, so a quick flick of the
    // wheel cannot make them flicker (the two thresholds keep them from toggling at the edge)
    const gone = buttonsBottom < 56 || (actionsIn && buttonsBottom < 80);
    if (gone !== actionsIn) {
      actionsIn = gone;
      header.classList.toggle('actions-in', gone);
    }
    layer.style.visibility = p > 0 && p < 1 ? '' : 'hidden';
    // usable once it is whole
    header.inert = p < 0.98;
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  };

  const setMode = () => {
    const want = wide.matches && !still.matches;
    if (want === morphing) {
      measured = false;
      schedule();
      return;
    }
    morphing = want;
    document.body.classList.toggle('morph', morphing);
    if (morphing) {
      document.body.append(soft, layer);
      header.classList.remove('is-tucked');
      measured = false;
      render();
    } else {
      layer.remove();
      soft.remove();
      pairs.forEach((p) => {
        p.src.style.visibility = '';
        p.dst.style.opacity = '';
      });
      columns.flat().forEach((li) => li.removeAttribute('style'));
      actions.removeAttribute('style');
      actionsIn = false;
      header.classList.remove('actions-in');
      header.style.removeProperty('--bar');
      header.style.removeProperty('--pill');
      header.inert = false;
      tuck();
    }
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => {
    measured = false;
    schedule();
  });
  // the columns arrive with a short rise: measure again once it has settled, and once the fonts are in
  index.querySelector('.index-columns')?.addEventListener('animationend', () => {
    measured = false;
    schedule();
  });
  document.fonts?.ready.then(() => {
    measured = false;
    schedule();
  });
  wide.addEventListener?.('change', setMode);
  still.addEventListener?.('change', setMode);
  setMode();

}
