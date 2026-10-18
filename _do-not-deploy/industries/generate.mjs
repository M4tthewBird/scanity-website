// Builds the industry pages in both languages and keeps the homepages' header
// menu, mobile menu and "Využití / Solutions" rows in step with them.
//
//   node _do-not-deploy/industries/generate.mjs
//
// Copy lives in content.cs.mjs / content.en.mjs, sources in sources.mjs.
// Edit those (or this template) and re-run; don't hand-edit the generated
// deploy/<slug>/index.html files, the next run overwrites them.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CS from './content.cs.mjs';
import EN from './content.en.mjs';

const DEPLOY = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'deploy');
const NB = ' ';

// Czech typography: no line break inside "40 %" or after one-letter words.
// (Lookbehind on whitespace only, so "<a href" inside inline markup is left alone.)
const nbCs = (s) => s.replace(/ %/g, `${NB}%`).replace(/(?<=^|[\s( ])(o|až|a|v|s|k|z|u|i|na|do|po|se|ve|ze) /gi, `$1${NB}`);
const nbEn = (s) => s;

const svg = (inner, size = 20, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${inner}</svg>`;

const ICON = {
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  monitor: '<path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"></path><path d="M10 19v-3.96 3.15"></path><path d="M7 19h5"></path><rect width="6" height="10" x="16" y="12" rx="2"></rect>',
  camera: '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>',
  armchair: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"></path><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"></path><path d="M5 18v2"></path><path d="M19 18v2"></path>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  rotate: '<path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2"></path><path d="m15.194 13.707 3.814 1.86-1.86 3.814"></path><path d="M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4"></path>',
  code: '<path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"></path><path d="m14.5 12.5 2-2"></path><path d="m11.5 9.5 2-2"></path><path d="m8.5 6.5 2-2"></path><path d="m17.5 15.5 2-2"></path>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>',
  video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect>',
  bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"></path><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"></path><path d="M12 4v6"></path><path d="M2 18h20"></path>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>',
  mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle>',
  calendar: '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="m9 16 2 2 4-4"></path>',
  palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
  // A floor plan: outer walls, two inner walls and a door gap
  floorplan: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 12h6"></path><path d="M13 12h8"></path><path d="M12 3v5"></path><path d="M12 12v9"></path>',
  house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
  hardhat: '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"></path><path d="M14 6a6 6 0 0 1 6 6v3"></path><path d="M4 15v-3a6 6 0 0 1 6-6"></path><rect x="2" y="15" width="20" height="4" rx="1"></rect>',
  trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path>',
};

const CHEVRON = '<path d="m6 9 6 6 6-6"></path>';
const ARROW_UR = '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path>';
const ARROW_R = '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>';
const ARROW_D = '<path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path>';
const MENU = '<path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path>';
const MOVE = '<path d="M12 2v20"></path><path d="m15 19-3 3-3-3"></path><path d="m19 9 3 3-3 3"></path><path d="M2 12h20"></path><path d="m5 9-3 3 3 3"></path><path d="m9 5 3-3 3 3"></path>';
const PLAY = '<polygon points="6 3 20 12 6 21 6 3"></polygon>';
const PAUSE = '<rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect>';

// Chapter cuts in scanity-balicek.mp4 (38 s); the chapter copy is per language
const CHAPTER_TIMES = [[0, 4.5], [4.5, 14.3], [14.3, 20], [20, 25.5], [25.5, 30.7], [30.7, 38.04]];

// Interface copy. Everything page-specific lives in the content files.
const LANG = {
  cs: {
    code: 'cs', other: 'en', label: 'CS', locale: 'cs_CZ', nb: nbCs,
    industries: CS, dir: '', otherDir: 'en/',
    homeHref: 'index.html', ogImage: 'og-image.jpg', ogAlt: 'Logo Scanity a nápis Tvoříme digitální kopie reálného světa',
    privacy: 'ochrana-osobnich-udaju.html', terms: 'podminky.html',
    t: {
      skip: 'Přeskočit na obsah', homeLabel: 'Domovská stránka Scanity', primaryNav: 'Hlavní navigace', platform: 'Řešení',
      solutions: 'Využití', explore: 'Prozkoumat', allSolutions: 'Přehled všech využití', industriesNav: 'Odvětví', contactUs: 'Kontaktujte nás',
      demo: 'Zobrazit ukázku', openNav: 'Otevřít navigaci', language: 'Jazyk: čeština', book: 'Domluvit sken',
      dataTitle: 'Ověřené výsledky z reálného nasazení 3D',
      source: 'Zdroj', sourceId: 'zdroj', of: 'z', deliverTitle: 'Co od nás dostanete',
      includesLabel: 'Co balíček obsahuje', chaptersLabel: 'Kapitoly videa', play: 'Přehrát video', pause: 'Pozastavit video',
      chooseScan: 'Vyberte 3D snímek', viewerTitle: 'Interaktivní 3D snímek Scanity', loading: 'Načítáme 3D snímek…',
      launch: 'Načíst 3D prohlížeč', launchHintPointer: 'Tažením prostor otočíte, kolečkem přiblížíte',
      launchHintTouch: 'Přejetím prstem prostor otočíte, sevřením přiblížíte',
      hintPointer: 'Tažením otočíte pohled, kolečkem přiblížíte', hintTouch: 'Přejetím prstem se rozhlédnete, sevřením přiblížíte',
      caseTitle: 'Výsledky Scanity',
      name: 'Celé jméno', namePh: 'Jana Nováková', email: 'Pracovní e-mail', emailPh: 'jana@firma.cz',
      company: 'Společnost', companyPh: 'Název společnosti', phone: 'Telefon (nepovinné)', message: 'Co byste chtěli zachytit?',
      send: 'Odeslat zprávu', reassurance: 'Ozveme se vám obvykle do 1 pracovního dne.',
      privacyNote: (href) => `Údaje použijeme jen k odpovědi na vaši poptávku. Více v <a href="${href}">zásadách ochrany osobních údajů</a>.`,
      tagline: 'Tvoříme přesné a fotorealistické 3D kopie reálného světa.', privacy: 'Ochrana soukromí', terms: 'Podmínky',
    },
  },
  en: {
    code: 'en', other: 'cs', label: 'EN', locale: 'en_US', nb: nbEn,
    industries: EN, dir: 'en/', otherDir: '',
    homeHref: 'index.html', ogImage: 'og-image-en.jpg', ogAlt: 'Scanity logo and the line We create digital copies of the real world',
    privacy: 'privacy.html', terms: 'terms.html',
    t: {
      skip: 'Skip to content', homeLabel: 'Scanity home', primaryNav: 'Primary navigation', platform: 'Platform',
      solutions: 'Solutions', explore: 'Explore', allSolutions: 'All solutions', industriesNav: 'Industries', contactUs: 'Contact us',
      demo: 'Try demo', openNav: 'Open navigation', language: 'Language: English', book: 'Book a scan',
      dataTitle: 'Proven results from real-world 3D use',
      source: 'Source', sourceId: 'source', of: 'of', deliverTitle: 'What we deliver',
      includesLabel: 'What the package includes', chaptersLabel: 'Video chapters', play: 'Play video', pause: 'Pause video',
      chooseScan: 'Choose a 3D scan', viewerTitle: 'Interactive Scanity 3D scan', loading: 'Loading 3D scan…',
      launch: 'Load 3D viewer', launchHintPointer: 'Drag to rotate, scroll to zoom',
      launchHintTouch: 'Swipe to rotate, pinch to zoom',
      hintPointer: 'Drag to look around, scroll to zoom', hintTouch: 'Swipe to look around, pinch to zoom',
      caseTitle: 'Scanity results',
      name: 'Full name', namePh: 'Jane Doe', email: 'Work email', emailPh: 'jane@company.com',
      company: 'Company', companyPh: 'Company name', phone: 'Phone (optional)', message: 'What would you like to capture?',
      send: 'Send message', reassurance: 'We usually get back to you within 1 business day.',
      privacyNote: (href) => `We use your details only to reply to your enquiry. See our <a href="${href}">privacy policy</a>.`,
      tagline: 'We create accurate, photorealistic 3D copies of the real world.', privacy: 'Privacy', terms: 'Terms',
    },
  },
};

// Responsive image: the 800px file for phones and half-width layouts, the
// full file for wide or high-density screens. Files barely over 800px have
// no smaller copy and go out as they are.
const img = (root, path, w, h, sizes, alt) => {
  const attrs = `width="${w}" height="${h}" loading="lazy" decoding="async" alt="${alt}"`;
  if (w <= 900) return `<img src="${root}${path}" ${attrs}>`;
  const small = path.replace(/\.webp$/, '-800.webp');
  return `<img src="${root}${path}" srcset="${root}${small} 800w, ${root}${path} ${w}w" sizes="${sizes}" ${attrs}>`;
};

// The face-shield shots (AI-retouched renders from the scan), at their real size
const SHOT_SIZES = [815, 732, 930];

// ---------------------------------------------------------------- header
// `base` is the path from the page to its own language's homepage folder.
const industryHref = (L, base, ind) => (base ? `../${ind.slug}/` : `${ind.slug}/`);

const desktopNav = (L, base, current) => `      <nav class="desktop-nav" aria-label="${L.t.primaryNav}">
        <a href="${base}#platform">${L.t.platform}</a>
        <div class="nav-dropdown" id="industryDropdown">
          <button type="button" class="nav-dropdown-toggle" id="industryToggle" aria-expanded="false" aria-controls="industryMenu">${L.t.solutions} ${svg(CHEVRON, 10, 'lucide lucide-chevron-down')}</button>
          <div class="nav-menu" id="industryMenu">
${L.industries.map((i) => `            <a href="${industryHref(L, base, i)}"${i.slug === current ? ' aria-current="page"' : ''}>
              <span class="nav-menu-title">${i.menu}</span>
              <span class="nav-menu-text">${L.nb(i.menuText)}</span>
            </a>`).join('\n')}
            <a class="nav-menu-all" href="${base}#solutions">${L.t.allSolutions} ${svg(ARROW_R, 12)}</a>
          </div>
        </div>
      </nav>`;

const mobileNav = (L, base, current, csHref, enHref) => `      <nav class="mobile-nav" id="mobileNav">
        <a href="${base}#platform">${L.t.platform}</a>
        <a href="${base}#solutions">${L.t.solutions}</a>
        <div class="mobile-subnav">
${L.industries.map((i) => `          <a href="${industryHref(L, base, i)}"${i.slug === current ? ' aria-current="page"' : ''}>${i.menu}</a>`).join('\n')}
        </div>
        <a href="#contact">${L.t.contactUs}</a>
        <div class="mobile-lang">
          <a href="${csHref}" lang="cs" hreflang="cs"${L.code === 'cs' ? ' class="is-active" aria-current="true"' : ''}>CS</a>
          <a href="${enHref}" lang="en" hreflang="en"${L.code === 'en' ? ' class="is-active" aria-current="true"' : ''}>EN</a>
        </div>
      </nav>`;

// A plain disclosure: a button that shows two links. (Not an ARIA listbox,
// which screen readers would announce as a select.)
const langSwitch = (L, csHref, enHref) => `        <div class="lang-switch" id="langSwitch">
          <button type="button" class="lang-toggle" id="langToggle" aria-expanded="false" aria-controls="langMenu" aria-label="${L.t.language}">
            ${L.label}
            ${svg(CHEVRON, 10, 'lucide lucide-chevron-down')}
          </button>
          <ul class="lang-menu" id="langMenu">
            <li><a href="${csHref}" lang="cs" hreflang="cs"${L.code === 'cs' ? ' aria-current="true"' : ''}>CS</a></li>
            <li><a href="${enHref}" lang="en" hreflang="en"${L.code === 'en' ? ' aria-current="true"' : ''}>EN</a></li>
          </ul>
        </div>`;

// Sticks under the header while scrolling, so the other industries and the
// way to book a scan are always one click away.
const industryBar = (L, current) => `    <div class="industry-bar" id="industryBar">
      <div class="industry-bar-inner shell">
        <nav class="industry-nav" aria-label="${L.t.industriesNav}">
${L.industries.map((i) => `          <a href="../${i.slug}/"${i.slug === current ? ' aria-current="page"' : ''}>${i.nav}</a>`).join('\n')}
        </nav>
        <a class="button button-dark button-small industry-bar-cta" href="#contact">${L.t.book} ${svg(ARROW_R, 14)}</a>
      </div>
    </div>`;

// ---------------------------------------------------------------- sections
const stat = (L, s, i) => `        <article class="stat">
          <p class="stat-value">${s.prefix ? `<span class="stat-prefix">${s.prefix.replace(' ', NB)}</span>` : ''}${s.of ? `${s.value}<span class="stat-of">${L.t.of}</span>${s.of}` : `${s.value}<span class="stat-unit">${s.unit}</span>`}<sup class="stat-ref"><a href="#${L.t.sourceId}-${i + 1}" aria-label="${L.t.source} ${i + 1}">${i + 1}</a></sup></p>
          <p class="stat-label">${L.nb(s.label)}</p>
        </article>`;

const dataSection = (L, ind) => `    <section class="industry-section shell" id="data" aria-labelledby="data-title">
      <div class="industry-section-head">
        <h2 id="data-title">${L.nb(L.t.dataTitle)}</h2>
        <p class="industry-section-lead">${L.nb(ind.dataLead)}</p>
      </div>
      <div class="stat-grid stat-count-${ind.stats.length}">
${ind.stats.map((s, i) => stat(L, s, i)).join('\n')}
      </div>
      <ol class="stat-footnotes">
${ind.stats.map((s, i) => `        <li id="${L.t.sourceId}-${i + 1}">${L.nb(s.foot)}</li>`).join('\n')}
      </ol>
    </section>

`;

const deliverSection = (L, ind) => `    <section class="industry-section shell" id="deliver" aria-labelledby="deliver-title">
      <div class="industry-section-head">
        <h2 id="deliver-title">${ind.deliverTitle || L.t.deliverTitle}</h2>
      </div>
      <ul class="deliver-list">
${ind.deliver.map((d) => `        <li>
          <span class="use-icon">${svg(ICON[d.icon], 20)}</span>
          <div>
            <h3>${d.h}</h3>
            <p>${L.nb(d.p)}</p>
          </div>
        </li>`).join('\n')}
      </ul>
    </section>

`;

// Real-estate: the full package, told by Scanity's promo video. The chapter
// list doubles as the video's navigation.
const packageSection = (L, root, p) => `    <section class="package-section shell" id="package" aria-labelledby="package-title">
      <div class="industry-section-head">
        <h2 id="package-title">${L.nb(p.title)}</h2>
        <p>${L.nb(p.text)}</p>
      </div>
      <ul class="package-includes" aria-label="${L.t.includesLabel}">
${p.includes.map((item) => `        <li>
          <span class="package-includes-icon">${svg(ICON[item.icon], 26)}</span>
          <strong>${item.title}</strong>
          <span>${L.nb(item.sub)}</span>
        </li>`).join('\n')}
      </ul>

      <div class="package-player is-idle" id="packagePlayer">
        <div class="package-stage">
          <video class="package-video" muted playsinline loop preload="none"
            poster="${root}assets/reality/balicek-poster.webp"
            data-src="${root}assets/reality/scanity-balicek.mp4"
            aria-label="${p.videoLabel}"></video>
          <button type="button" class="package-toggle" aria-label="${L.t.play}" data-label-play="${L.t.play}" data-label-pause="${L.t.pause}">
            ${svg(PLAY, 18, 'package-icon-play')}
            ${svg(PAUSE, 16, 'package-icon-pause')}
          </button>
        </div>
        <ol class="package-chapters" aria-label="${L.t.chaptersLabel}">
${p.chapters.map((c, i) => `          <li>
            <button type="button" class="package-chapter" data-start="${CHAPTER_TIMES[i][0]}" data-end="${CHAPTER_TIMES[i][1]}">
              <span class="package-chapter-index">${String(i + 1).padStart(2, '0')}</span>
              <span class="package-chapter-body">
                <span class="package-chapter-title">${c.title}</span>
                <span class="package-chapter-text"><span>${L.nb(c.text)}</span></span>
              </span>
              <span class="package-chapter-progress" aria-hidden="true"></span>
            </button>
          </li>`).join('\n')}
        </ol>
      </div>

      <figure class="package-photos">
        <figcaption>
          <strong>${L.nb(p.photosTitle)}</strong>
          <span>${L.nb(p.caption)}</span>
        </figcaption>
        <div class="package-photos-row">
          ${img(root, 'assets/reality/foto-posilovna.webp', 1600, 1067, '(max-width: 760px) 80vw, 30vw', p.photoAlts[0])}
          ${img(root, 'assets/reality/foto-detsky-koutek.webp', 1600, 1066, '(max-width: 760px) 80vw, 30vw', p.photoAlts[1])}
          ${img(root, 'assets/reality/foto-kardio.webp', 1170, 780, '(max-width: 760px) 80vw, 30vw', p.photoAlts[2])}
        </div>
      </figure>

      <a class="scroll-cue" href="#model">
        <span>${L.nb(p.cue)}</span>
        <span class="scroll-cue-arrow">${svg(ARROW_D, 16)}</span>
      </a>
    </section>

`;

// Same markup (and ids) as the homepage demo, so index.js drives it unchanged
const viewerSection = (L, { title, text, scans }) => `    <section class="industry-section industry-viewer shell" id="model" aria-labelledby="viewer-title">
      <div class="industry-section-head">
        <h2 id="viewer-title">${L.nb(title)}</h2>
        <p>${L.nb(text)}</p>
      </div>
${scans.length > 1 ? `
      <div class="demo-viewer-switch" id="viewerSwitch" role="tablist" aria-label="${L.t.chooseScan}">
${scans.map((s, i) => `        <button type="button" class="viewer-switch-btn${i === 0 ? ' is-active' : ''}" data-id="${s.id}" role="tab" aria-controls="demoViewerFrame" aria-selected="${i === 0}">${s.label}</button>`).join('\n')}
      </div>
` : ''}
      <div class="demo-viewer-frame" id="demoViewerFrame"${scans.length > 1 ? ' role="tabpanel"' : ''}>
        <iframe
          class="demo-viewer"
          data-src="https://viewer.scanity.cz/?id=${scans[0].id}"
          title="${L.t.viewerTitle}"
          allow="fullscreen; xr-spatial-tracking"
        ></iframe>
        <div class="viewer-loading">
          <div class="viewer-loading-beam" aria-hidden="true"></div>
          <span class="viewer-loading-status" role="status" aria-live="polite" data-loading-text="${L.t.loading}"></span>
        </div>
        <button type="button" class="viewer-launch" id="viewerLaunchBtn">
          <span class="viewer-launch-icon">
            ${svg(PLAY, 22, 'lucide lucide-play')}
          </span>
          <span class="viewer-launch-copy">
            <span class="viewer-launch-label">${L.t.launch}</span>
            <span class="viewer-launch-hint">
              <span class="hint-text-pointer">${L.t.launchHintPointer}</span>
              <span class="hint-text-touch">${L.t.launchHintTouch}</span>
            </span>
          </span>
        </button>
        <div class="viewer-hint" id="viewerHint" role="status">
          ${svg(MOVE, 14, 'lucide lucide-move')}
          <span class="hint-text-pointer">${L.t.hintPointer}</span>
          <span class="hint-text-touch">${L.t.hintTouch}</span>
        </div>
      </div>
    </section>

`;

const shotsSection = (L, root, s) => `    <section class="industry-section shell" id="shots" aria-labelledby="shots-title">
      <div class="industry-section-head">
        <h2 id="shots-title">${L.nb(s.title)}</h2>
        <p>${L.nb(s.text)}</p>
      </div>
      <div class="product-shots">
${s.alts.map((alt, i) => `        ${img(root, `assets/produkty/stit-${i + 1}.webp`, SHOT_SIZES[i], SHOT_SIZES[i], '(max-width: 760px) 50vw, 30vw', alt)}`).join('\n')}
      </div>
    </section>

`;

// ---------------------------------------------------------------- page
const page = (L, ind, twin) => {
  const root = L.code === 'cs' ? '../' : '../../';
  const otherHref = L.code === 'cs' ? `../en/${twin.slug}/` : `../../${twin.slug}/`;
  const csHref = L.code === 'cs' ? './' : otherHref;
  const enHref = L.code === 'en' ? './' : otherHref;
  const csUrl = `https://scanity.cz/${L.code === 'cs' ? ind.slug : twin.slug}/`;
  const enUrl = `https://scanity.cz/en/${L.code === 'en' ? ind.slug : twin.slug}/`;
  const url = L.code === 'cs' ? csUrl : enUrl;
  const t = L.t;

  return `<!DOCTYPE html>
<html lang="${L.code}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#f5f6f7">
  <link rel="icon" href="${root}favicon.ico" sizes="32x32">
  <link rel="icon" type="image/svg+xml" href="${root}assets/favicon.svg">
  <link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
  <link rel="manifest" href="${root}site.webmanifest">
  <title>${ind.title}</title>
  <meta name="description" content="${ind.description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${root}index.css">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="cs" href="${csUrl}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="x-default" href="${csUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Scanity">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${ind.title}">
  <meta property="og:description" content="${ind.description}">
  <meta property="og:image" content="https://scanity.cz/assets/${L.ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${L.ogAlt}">
  <meta property="og:locale" content="${L.locale}">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <a class="skip-link" href="#top">${t.skip}</a>
  <canvas class="point-cloud" id="pointCloud" aria-hidden="true"></canvas>
    <header class="site-header shell">
      <a href="../" aria-label="${t.homeLabel}" class="brand">
          <img
              src="${root}assets/scanity_logo.svg" width="31" height="54"
              alt="Scanity"
              class="scanity-logo">
          <span>Scanity</span>
      </a>
${desktopNav(L, '../', ind.slug)}
      <div class="header-actions">
${langSwitch(L, csHref, enHref)}
        <a class="nav-contact" href="#contact">${t.contactUs}</a>
        <a class="button button-dark button-small" href="${ind.viewer ? '#model' : '../#demo'}">${t.demo} ${svg(ARROW_UR, 12, 'lucide lucide-arrow-up-right')}</a>
      </div>
      <button class="menu-button" type="button" aria-label="${t.openNav}" aria-expanded="false" aria-controls="mobileNav" id="menuToggle">
        ${svg(MENU, 21, 'lucide lucide-menu')}
      </button>
${mobileNav(L, '../', ind.slug, csHref, enHref)}
    </header>

  <main id="top">
${industryBar(L, ind.slug)}

    <!-- No buttons here: "Domluvit sken" is always in the bar above -->
    <section class="industry-hero shell">
      <h1 class="reveal reveal-2">${L.nb(ind.h1)}</h1>
      <p class="hero-description reveal reveal-3">${L.nb(ind.intro)}</p>
    </section>

${ind.package ? packageSection(L, root, ind.package) : ''}${ind.shots ? shotsSection(L, root, ind.shots) : ''}${ind.viewer && !ind.viewerLast ? viewerSection(L, ind.viewer) : ''}${dataSection(L, ind)}${ind.package ? '' : deliverSection(L, ind)}${ind.viewer && ind.viewerLast ? viewerSection(L, ind.viewer) : ''}    <!-- TODO: ${ind.caseStudyTodo} -->
    <section class="industry-section shell" id="case-study" aria-labelledby="case-study-title" hidden>
      <div class="industry-section-head">
        <h2 id="case-study-title">${t.caseTitle}</h2>
        <p>TODO</p>
      </div>
      <div class="stat-grid">
        <!-- TODO: stat cards with Scanity's own numbers (same markup as above, source = own measurement) -->
      </div>
    </section>

    <section class="contact-section shell" id="contact">
      <div class="contact-panel">
        <div>
          <h2>${L.nb(ind.contactH2)}</h2>
        </div>
        <div class="contact-action">
          <p>${L.nb(ind.contactP)}</p>
          <form class="contact-form" id="contactForm" novalidate>
            <div class="form-field">
              <label for="cfName">${t.name}</label>
              <input type="text" id="cfName" name="name" placeholder="${t.namePh}" autocomplete="name" aria-describedby="cfName-error" required>
              <span class="field-error" id="cfName-error"></span>
            </div>
            <div class="form-field">
              <label for="cfEmail">${t.email}</label>
              <input type="email" id="cfEmail" name="email" placeholder="${t.emailPh}" autocomplete="email" aria-describedby="cfEmail-error" required>
              <span class="field-error" id="cfEmail-error"></span>
            </div>
            <div class="form-field">
              <label for="cfCompany">${t.company}</label>
              <input type="text" id="cfCompany" name="company" placeholder="${t.companyPh}" autocomplete="organization">
            </div>
            <div class="form-field">
              <label for="cfPhone">${t.phone}</label>
              <input type="tel" id="cfPhone" name="phone" placeholder="+420 123 456 789" autocomplete="tel">
            </div>
            <div class="form-field">
              <label for="cfMessage">${t.message}</label>
              <textarea id="cfMessage" name="message" rows="3" placeholder="${ind.placeholder}"></textarea>
            </div>
            <input type="hidden" name="time">
            <input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button type="submit" class="contact-submit">
              ${t.send}
              <span>${svg(ARROW_UR, 24, 'lucide lucide-arrow-up-right')}</span>
            </button>
            <p class="form-reassurance">${t.reassurance}
              <span class="form-privacy">${t.privacyNote(`../${L.privacy}`)}</span></p>
            <p class="form-status" id="formStatus" role="status" aria-live="polite"></p>
          </form>
        </div>
        <div class="contact-rings" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
    </section>
  </main>

    <footer class="site-footer" id="company">
      <div class="shell footer-grid">
        <div class="footer-top">
          <a href="../" aria-label="${t.homeLabel}" class="brand">
            <img src="${root}assets/scanity_logo.svg" width="31" height="54" alt="Scanity" class="scanity-logo">
            <span>Scanity</span>
          </a>
          <p>${t.tagline}</p>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Scanity</span>
          <span><a href="../${L.privacy}">${t.privacy}</a> · <a href="../${L.terms}">${t.terms}</a></span>
        </div>
      </div>
    </footer>

  <script src="${root}index.js"></script>
</body>
</html>
`;
};

// ---------------------------------------------------------------- write
const crlf = (s) => s.replace(/\r?\n/g, '\r\n');

for (const L of Object.values(LANG)) {
  const twins = LANG[L.other].industries;
  for (const ind of L.industries) {
    const twin = twins.find((x) => x.key === ind.key);
    const dir = join(DEPLOY, L.dir, ind.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), crlf(page(L, ind, twin)), 'utf8');
    console.log('wrote', join(L.dir, ind.slug, 'index.html'));
  }

  // The homepage of this language: same menus and the industry rows
  const file = join(DEPLOY, L.dir, 'index.html');
  let html = readFileSync(file, 'utf8');
  const swap = (re, next) => {
    if (!re.test(html)) throw new Error(`${file}: ${re} not found`);
    html = html.replace(re, crlf(next));
  };
  const csHome = L.code === 'cs' ? 'index.html' : '../index.html';
  const enHome = L.code === 'cs' ? 'en/index.html' : 'index.html';
  swap(/      <nav class="desktop-nav"[\s\S]*?\n      <\/nav>/, desktopNav(L, '', null));
  swap(/        <div class="lang-switch"[\s\S]*?\n        <\/div>(?=\r?\n        <a class="nav-contact")/, langSwitch(L, csHome, enHome));
  swap(/      <nav class="mobile-nav"[\s\S]*?\n      <\/nav>/, mobileNav(L, '', null, csHome, enHome));
  swap(/      <div class="shell use-case-list">[\s\S]*?\n      <\/div>(?=\r?\n    <\/section>)/, `      <div class="shell use-case-list">
${L.industries.map((ind, i) => `        <a class="use-case" href="${ind.slug}/">
          <span class="use-number">0${i + 1}</span>
          <span class="use-icon">${svg(ICON[ind.home.icon], 22)}</span>
          <div><small>${ind.menu}</small><h3>${L.nb(ind.home.h3)}</h3></div>
          <p>${L.nb(ind.home.p)}</p>
          <span class="use-arrow"><span class="use-arrow-label">${L.t.explore}</span>${svg(ARROW_UR, 16)}</span>
        </a>`).join('\n\n')}
      </div>`);
  writeFileSync(file, html, 'utf8');
  console.log('patched', join(L.dir, 'index.html'));
}

// Sitemap: the industry block between the markers, both languages paired
{
  const file = join(DEPLOY, 'sitemap.xml');
  const xml = readFileSync(file, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const entries = CS.flatMap((cs) => {
    const en = EN.find((x) => x.key === cs.key);
    const alt = `    <xhtml:link rel="alternate" hreflang="cs" href="https://scanity.cz/${cs.slug}/"/>\n    <xhtml:link rel="alternate" hreflang="en" href="https://scanity.cz/en/${en.slug}/"/>`;
    return [`https://scanity.cz/${cs.slug}/`, `https://scanity.cz/en/${en.slug}/`]
      .map((loc) => `  <url>\n    <loc>${loc}</loc>\n${alt}\n    <lastmod>${today}</lastmod>\n  </url>`);
  }).join('\n');
  const re = /  <!-- industries:start -->[\s\S]*?<!-- industries:end -->/;
  if (!re.test(xml)) throw new Error('sitemap: industries markers not found');
  writeFileSync(file, xml.replace(re, crlf(`  <!-- industries:start -->\n${entries}\n  <!-- industries:end -->`)), 'utf8');
  console.log('patched sitemap.xml');
}
