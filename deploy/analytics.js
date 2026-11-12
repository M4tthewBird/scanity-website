// Google Analytics 4, loaded only after the visitor agrees (Czech law: analytics cookies need prior consent).
// Until GA_ID is filled in, this file does nothing: no bar, no requests.
//
// What it measures beyond page views (all through GA4's own events):
//   generate_lead      the contact form was sent (watches the form's status line, index.js stays untouched)
//   open_3d_demo       the 3D viewer was launched
//   contact_email      a mailto: link was clicked
//   cta_click          a "Kontakt / Contact" button leading to the form was clicked
//
// The choice is kept in localStorage (`scanity-consent`: "granted" | "denied") and can be changed from the
// "Cookies" link in the footer.

const GA_ID = 'G-TX8ZYWNBK2'; // e.g. 'G-XXXXXXXXXX' from Google Analytics → Admin → Data streams

(() => {
  if (!GA_ID) return;

  const KEY = 'scanity-consent';
  const english = document.documentElement.lang === 'en';
  const privacyHref = (() => {
    // the page's own privacy link in the footer, so the path is right from any folder
    const a = document.querySelector('.footer-bottom a[href*="ochrana-osobnich-udaju"], .footer-bottom a[href*="privacy"]');
    return a ? a.getAttribute('href') : english ? '/en/privacy.html' : '/ochrana-osobnich-udaju.html';
  })();
  const text = english
    ? {
        title: 'Cookies',
        body: 'With your consent we use Google Analytics to see which pages help visitors. Nothing is measured until you agree.',
        more: 'Details',
        accept: 'Allow',
        reject: 'Decline',
        settings: 'Cookies',
      }
    : {
        title: 'Cookies',
        body: 'S vaším souhlasem používáme Google Analytics, abychom věděli, které stránky návštěvníkům pomáhají. Bez souhlasu nic neměříme.',
        more: 'Podrobnosti',
        accept: 'Povolit',
        reject: 'Odmítnout',
        settings: 'Cookies',
      };

  const read = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };
  const write = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* private window: the choice holds for this page only */
    }
  };

  // ---- Google Analytics -------------------------------------------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
    track();
  };

  // consent withdrawn: the GA cookies go too (they live on this domain)
  const stop = () => {
    const host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (!/^_ga/.test(name)) return;
      for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    });
    if (started) location.reload(); // the loaded GA script would otherwise keep running on this page
  };

  // ---- Events -------------------------------------------------------------------------------------------------
  const track = () => {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a, button');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('mailto:')) gtag('event', 'contact_email', { link_url: href.slice(7) });
      else if (a.id === 'viewerLaunchBtn') gtag('event', 'open_3d_demo', { page_path: location.pathname });
      else if (/#contact$/.test(href)) gtag('event', 'cta_click', { link_text: a.textContent.trim().slice(0, 60) });
    });

    const status = document.getElementById('formStatus');
    if (status) {
      new MutationObserver(() => {
        if (status.classList.contains('is-success')) gtag('event', 'generate_lead', { form: 'contact' });
      }).observe(status, { attributes: true, attributeFilter: ['class'] });
    }
  };

  // ---- The bar ------------------------------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
.consent-bar {
  position: fixed;
  z-index: 1000;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  width: min(380px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 20px 20px 18px;
  border: 1px solid var(--line, #1011121f);
  border-radius: 18px;
  background: var(--white, #fff);
  box-shadow: 0 18px 50px -18px color-mix(in srgb, var(--shadow, #1e252b) 35%, transparent);
  color: var(--ink, #101112);
  font-family: Manrope, sans-serif;
  animation: consent-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.consent-bar[hidden] { display: none; }
.consent-bar h2 {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted, #676d72);
}
.consent-bar p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--ink-soft, #4f555a);
}
.consent-bar p a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.consent-actions { display: flex; gap: 8px; margin-top: 16px; }
.consent-actions .button { flex: 1; }
.consent-open {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}
.consent-open:hover { color: var(--ink, #101112); }
@keyframes consent-in { from { opacity: 0; transform: translateY(12px); } }
@media (prefers-reduced-motion: reduce) { .consent-bar { animation: none; } }
`;
  document.head.appendChild(style);

  const bar = document.createElement('section');
  bar.className = 'consent-bar';
  bar.setAttribute('aria-label', text.title);
  bar.hidden = true;
  bar.innerHTML = `
    <h2>${text.title}</h2>
    <p>${text.body} <a href="${privacyHref}#cookies">${text.more}</a></p>
    <div class="consent-actions">
      <button type="button" class="button button-small button-ghost" data-consent="denied">${text.reject}</button>
      <button type="button" class="button button-small button-dark" data-consent="granted">${text.accept}</button>
    </div>`;
  bar.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-consent]')?.dataset.consent;
    if (!choice) return;
    write(choice);
    bar.hidden = true;
    if (choice === 'granted') start();
    else stop();
  });

  const mount = () => {
    document.body.appendChild(bar);
    // "Cookies" in the footer reopens the choice
    const links = document.querySelector('.footer-bottom span:last-child');
    if (links) {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'consent-open';
      open.textContent = text.settings;
      open.addEventListener('click', () => {
        bar.hidden = false;
        bar.querySelector(`[data-consent="${read() === 'granted' ? 'denied' : 'granted'}"]`)?.focus();
      });
      links.append(' · ', open);
    }
    const choice = read();
    if (choice === 'granted') start();
    else if (choice !== 'denied') bar.hidden = false;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
