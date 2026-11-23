// The settings panel of the test page, wired to the swarm.
import { particleImage } from './particle-image.js';

const PICS = {
  logo: { src: 'img/scanity-logo.svg', kind: 'logo' },
  'stit-1': { src: 'img/stit-1.webp', kind: 'photo' },
  'stit-2': { src: 'img/stit-2.webp', kind: 'photo' }
};
const own = new Map();
const form = document.getElementById('tuneForm');
const stage = document.getElementById('stage');
const el = (name) => form.elements.namedItem(name);
const num = (name) => Number(el(name).value);
const cs = (v, digits) => v.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const FORMAT = {
  points: (v) => cs(v, 0),
  size: (v) => `${cs(v, 1)} px`,
  scale: (v) => cs(v, 2),
  depth: (v) => cs(v, 2),
  tilt: (v) => `${v}°`,
  push: (v) => cs(v, 2),
  radius: (v) => `${v} px`,
  speed: (v) => `${cs(v, 1)}×`,
  interval: (v) => `${cs(v, 1)} s`,
  drift: (v) => cs(v, 2),
  markers: (v) => String(v)
};

const settings = () => {
  const mode = el('form').value;
  const images = [...form.querySelectorAll('input[name=pic]:checked')]
    .map((i) => PICS[i.value] || own.get(i.value))
    .filter(Boolean)
    .slice(0, 4)
    .map((p) => ({ src: p.src, form: mode === 'auto' ? (p.kind === 'logo' ? 'solid' : 'flat') : mode }));
  const out = {
    images,
    colorMode: el('colorMode').value,
    color: '#246bfd',
    transition: el('transition').value,
    advance: el('advance').value,
    coordinates: el('coordinates').checked,
    links: el('links').checked,
    count: el('count').checked
  };
  for (const name of Object.keys(FORMAT)) out[name] = num(name);
  return out;
};

const showValues = () => {
  for (const [name, f] of Object.entries(FORMAT)) form.querySelector(`output[data-for="${name}"]`).textContent = f(num(name));
  stage.classList.toggle('is-framed', el('frame').checked);
};

showValues();
const swarm = particleImage(document.getElementById('swarm'), {
  ...settings(),
  alt: 'Logo Scanity a ochranný štít složené z bodů'
});

let pending = 0;
const apply = () => {
  showValues();
  clearTimeout(pending);
  pending = setTimeout(() => swarm.set(settings()), 120);
};
form.addEventListener('input', apply);
form.addEventListener('change', apply);

document.getElementById('nextPic').addEventListener('click', () => swarm.next());
document.getElementById('reset').addEventListener('click', () => {
  form.reset();
  apply();
});

// a picture of your own, from the disk: it joins the rotation
let ownCount = 0;
document.getElementById('ownFile').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const value = `own-${++ownCount}`;
  own.set(value, { src: URL.createObjectURL(file), kind: 'photo' });
  const label = document.createElement('label');
  label.className = 'check';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.name = 'pic';
  box.value = value;
  box.checked = true;
  box.defaultChecked = true;
  label.append(box, ` ${file.name}`);
  document.getElementById('ownPics').append(label);
  e.target.value = '';
  apply();
});

// light or dark page: the points follow the background once it has changed
for (const b of document.querySelectorAll('[data-theme-set]')) {
  b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.themeSet;
    for (const o of document.querySelectorAll('[data-theme-set]')) o.setAttribute('aria-pressed', String(o === b));
    setTimeout(() => swarm.set({}), 350);
  });
}

// the hint goes once the cursor has found the swarm, or after a while
const hint = document.getElementById('hint');
if (matchMedia('(hover: none)').matches) hint.textContent = 'Táhni prstem a klepni pro další obrázek';
const hideHint = () => hint.classList.add('is-gone');
stage.addEventListener('pointerenter', hideHint, { once: true });
setTimeout(hideHint, 8000);

if (matchMedia('(max-width: 760px)').matches) document.getElementById('tune').open = false;
