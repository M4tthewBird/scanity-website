// Mobile navigation toggle
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');

if (menuToggle && mobileNav) {
  const closeMobileNav = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
  };

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    mobileNav.classList.toggle('open');
  });

  // Picking a destination should close the panel, not leave it hovering over
  // the section the visitor just scrolled to.
  mobileNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMobileNav();
  });

  document.addEventListener('click', (event) => {
    if (!mobileNav.contains(event.target) && !menuToggle.contains(event.target)) {
      closeMobileNav();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileNav();
  });
}

// Language switcher dropdown
const langSwitch = document.getElementById('langSwitch');
const langToggle = document.getElementById('langToggle');

if (langSwitch && langToggle) {
  langToggle.addEventListener('click', () => {
    const isOpen = langSwitch.classList.toggle('open');
    langToggle.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (event) => {
    if (!langSwitch.contains(event.target)) {
      langSwitch.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      langSwitch.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Page-wide point-cloud background: a slow-drifting field of points evoking
// the raw 3D scan data the product itself produces, with a soft parallax tied
// to the cursor. Fixed to the viewport (see .point-cloud in index.css), so it
// only ever needs to draw a viewport's worth of points regardless of how long
// the page is. Plain Canvas 2D (not WebGL) -- plenty for a few hundred soft
// dots, and keeps this dependency-free like the rest of the site's vanilla JS.
const pointCloudCanvas = document.getElementById('pointCloud');

if (pointCloudCanvas) {
  const pointCloudCtx = pointCloudCanvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const POINT_COLOR = '36, 107, 253'; // --blue as r,g,b for rgba()

  let viewWidth = 0;
  let viewHeight = 0;
  let points = [];
  let pointerX = 0; // -1..1, offset from viewport center
  let pointerY = 0;
  let rafId = null;
  let running = false;

  function makePoints() {
    // Roughly one point per 9000px^2 of viewport, clamped so it reads as a
    // sparse scan cloud rather than a dense static-noise field at any size.
    const count = Math.max(70, Math.min(220, Math.round((viewWidth * viewHeight) / 9000)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * viewWidth,
      y: Math.random() * viewHeight,
      z: Math.random(), // 0 = far, 1 = near -- drives size, brightness, parallax
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
    }));
  }

  function resizePointCloud() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    pointCloudCanvas.width = viewWidth * dpr;
    pointCloudCanvas.height = viewHeight * dpr;
    pointCloudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makePoints();
  }

  function drawPointCloudFrame() {
    pointCloudCtx.clearRect(0, 0, viewWidth, viewHeight);
    points.forEach((p) => {
      const parallax = (p.z - 0.5) * 26; // nearer points drift further with the cursor
      const x = p.x + pointerX * parallax;
      const y = p.y + pointerY * parallax;
      const radius = 0.6 + p.z * 1.6;
      pointCloudCtx.beginPath();
      pointCloudCtx.arc(x, y, radius, 0, Math.PI * 2);
      pointCloudCtx.fillStyle = `rgba(${POINT_COLOR}, ${0.08 + p.z * 0.22})`;
      pointCloudCtx.fill();
    });
  }

  function stepPointCloudFrame() {
    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = viewWidth + 10;
      if (p.x > viewWidth + 10) p.x = -10;
      if (p.y < -10) p.y = viewHeight + 10;
      if (p.y > viewHeight + 10) p.y = -10;
    });
    drawPointCloudFrame();
    rafId = requestAnimationFrame(stepPointCloudFrame);
  }

  function startPointCloud() {
    if (running || prefersReducedMotion) return;
    running = true;
    rafId = requestAnimationFrame(stepPointCloudFrame);
  }

  function stopPointCloud() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  resizePointCloud();
  drawPointCloudFrame(); // one static frame up front, kept as-is under reduced motion
  startPointCloud();

  let pointCloudResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(pointCloudResizeTimer);
    pointCloudResizeTimer = setTimeout(() => {
      resizePointCloud();
      drawPointCloudFrame();
    }, 150);
  });

  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / viewWidth - 0.5) * 2;
    pointerY = (event.clientY / viewHeight - 0.5) * 2;
  });

  // Covers the whole page, so the only reason to stop spending frames on it is
  // the tab itself being in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopPointCloud();
    } else {
      startPointCloud();
    }
  });
}

// Scanity viewer (self-hosted, branded supersplat-viewer): only fetch/render the
// heavy 3D iframe once the user asks for it. The wait between click and the embed
// actually appearing gets a truthful loading state (real iframe `load` event, not
// a timer) instead of a silent gap.
//
// VIEWER_BASE points at the Netlify site hosting the branded viewer build. Update
// this once viewer.scanity.cz's DNS/custom-domain is set up on that Netlify site;
// until then you can temporarily swap in the raw *.netlify.app URL Netlify gives
// you to test end to end.
const VIEWER_BASE = 'https://viewer.scanity.cz';

const viewerFrame = document.getElementById('demoViewerFrame');
const viewerLaunchBtn = document.getElementById('viewerLaunchBtn');
const viewerSwitch = document.getElementById('viewerSwitch');

if (viewerFrame) {
  const viewerIframe = viewerFrame.querySelector('.demo-viewer');
  const viewerLoadingStatus = viewerFrame.querySelector('.viewer-loading-status');
  const viewerHint = viewerFrame.querySelector('.viewer-hint');
  const VIEWER_HINT_SEEN_KEY = 'scanity-viewer-hint-seen';

  viewerIframe.addEventListener('load', () => {
    viewerFrame.classList.remove('is-loading');
    if (viewerLoadingStatus) viewerLoadingStatus.textContent = '';

    // First-time visitors don't know the embed is a real, orbitable 3D capture
    // rather than a static image or video, so a one-time nudge teaches the
    // drag/scroll controls right as the model appears. This 'load' event fires
    // once the viewer's own page has booted, well before the splat itself has
    // finished streaming in (that part runs its own progress UI inside the
    // cross-origin iframe, invisible to us) -- so the hint is given a long
    // leash before it times out, on top of clearing the moment the visitor
    // actually touches the viewer. Never shown again once seen once, across
    // scans and across visits.
    if (viewerHint && localStorage.getItem(VIEWER_HINT_SEEN_KEY) !== 'true') {
      viewerHint.classList.add('is-visible');
      const dismissHint = () => {
        viewerHint.classList.remove('is-visible');
        localStorage.setItem(VIEWER_HINT_SEEN_KEY, 'true');
        window.removeEventListener('pointerdown', onFramePointerDown, true);
      };
      // Cross-origin iframes still report as the event target for a pointerdown
      // that lands on them, even though the page inside can't be inspected.
      const onFramePointerDown = (event) => {
        if (event.target === viewerIframe) dismissHint();
      };
      window.addEventListener('pointerdown', onFramePointerDown, true);
      setTimeout(dismissHint, 18000);
    }
  });

  const loadViewerSrc = (src) => {
    viewerIframe.dataset.src = src;
    viewerFrame.classList.add('is-loaded', 'is-loading');
    // Populate the live region (rather than relying on CSS visibility) so screen
    // readers announce the same loading state sighted visitors see.
    if (viewerLoadingStatus) viewerLoadingStatus.textContent = viewerLoadingStatus.dataset.loadingText;
    viewerIframe.src = src;
  };

  if (viewerLaunchBtn) {
    viewerLaunchBtn.addEventListener('click', () => {
      loadViewerSrc(viewerIframe.dataset.src);
    });
  }

  if (viewerSwitch) {
    viewerSwitch.addEventListener('click', (event) => {
      const btn = event.target.closest('.viewer-switch-btn');
      if (!btn || btn.classList.contains('is-active')) return;

      viewerSwitch.querySelectorAll('.viewer-switch-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      const src = `${VIEWER_BASE}/?id=${btn.dataset.id}`;
      if (viewerFrame.classList.contains('is-loaded')) {
        loadViewerSrc(src);
      } else {
        viewerIframe.dataset.src = src;
      }
    });
  }
}

// Floating up/down section navigation: jumps to the next or previous
// landmark instead of leaving the visitor to scroll there by hand. The stops
// are the page's own named landmarks (the same ids the header nav links to),
// not every <section> tag — that would also stop at the thin trust-strip
// marquee and split the "Řešení" story (intro copy + the 3-step process card)
// into two separate stops, turning one click into two barely-there nudges.
// compareDocumentPosition keeps this correct even where the two languages'
// section order still differs (e.g. demo vs. solutions).
const scrollNavUp = document.getElementById('scrollNavUp');
const scrollNavDown = document.getElementById('scrollNavDown');
const scrollNavDots = document.getElementById('scrollNavDots');

// Hidden below 1000px (see .scroll-nav in index.css) — touch-scroll momentum
// already covers that job there, so skip building it at all rather than
// wiring up listeners for a control nobody can see.
const scrollNavFitsViewport = window.matchMedia('(min-width: 1000.02px)').matches;

if (scrollNavUp && scrollNavDown && scrollNavFitsViewport) {
  const stops = ['top', 'platform', 'demo', 'solutions', 'contact', 'company']
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  // One dot per stop, purely visual (the group's own aria-label plus the
  // buttons' aria-labels already describe the control to assistive tech) so
  // sighted users get a sense of position and how many stops remain.
  const dots = scrollNavDots
    ? stops.map(() => {
      const dot = document.createElement('span');
      dot.className = 'scroll-nav-dot';
      scrollNavDots.appendChild(dot);
      return dot;
    })
    : [];

  // Roughly the sticky header's height, so a target section's top doesn't land underneath it.
  const HEADER_OFFSET = 90;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The stop we're "in" is the last one whose top has already scrolled past the
  // header; sections are in document order, so their tops only increase with
  // index, meaning we can stop at the first one still below that line. Once the
  // page is scrolled as far as it goes, treat that as the last stop outright —
  // a short final section (e.g. the footer) may never scroll its own top past
  // the header line if there isn't enough page left below it to push it there.
  const currentStopIndex = () => {
    const scrolledToBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    if (scrolledToBottom) return stops.length - 1;

    let index = 0;
    for (let i = 0; i < stops.length; i += 1) {
      if (stops[i].getBoundingClientRect().top <= HEADER_OFFSET) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  };

  // "platform" and "demo" land on a fixed landmark instead of their own section
  // top: platform starts just under the trust-strip's bottom border, and demo
  // stops just past the viewer frame's bottom edge.
  const goTo = (stop) => {
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (stop.id === 'platform') {
      const strip = document.querySelector('.trust-strip');
      if (strip) {
        window.scrollTo({ top: window.scrollY + strip.getBoundingClientRect().bottom + 20, behavior });
        return;
      }
    }

    if (stop.id === 'demo') {
      const viewerFrame = document.getElementById('demoViewerFrame');
      if (viewerFrame) {
        const top = window.scrollY + viewerFrame.getBoundingClientRect().bottom - window.innerHeight + 10;
        window.scrollTo({ top, behavior });
        return;
      }
    }

    stop.scrollIntoView({ behavior, block: 'start' });
  };

  const updateButtons = () => {
    const index = currentStopIndex();
    scrollNavUp.disabled = index <= 0;
    scrollNavDown.disabled = index >= stops.length - 1;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  };

  scrollNavUp.addEventListener('click', () => {
    const index = currentStopIndex();
    if (index > 0) goTo(stops[index - 1]);
  });

  scrollNavDown.addEventListener('click', () => {
    const index = currentStopIndex();
    if (index < stops.length - 1) goTo(stops[index + 1]);
  });

  updateButtons();
  window.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
}

// Contact form -> EmailJS
// Sign up at https://www.emailjs.com, connect your company inbox as an Email Service,
// build a template using the {{name}}, {{email}}, {{company}}, {{phone}}, {{message}}, {{time}}
// variables (they match this form's `name` attributes), then replace the two placeholders
// below with the values from your EmailJS dashboard.
const EMAILJS_PUBLIC_KEY = 'oUzqhIO0IlUWItyr5';
const EMAILJS_SERVICE_ID = 'service_vuwagi8';
const EMAILJS_TEMPLATE_ID = 'template_hv4msug';
const EMAILJS_SRC = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

// index.js is shared by both the Czech and English pages, so form-status copy
// picks its language from <html lang>, the same signal the browser and screen
// readers already use, instead of shipping one hardcoded English set to both.
const FORM_MESSAGES = {
  cs: {
    sending: 'Odesíláme…',
    success: 'Děkujeme — brzy se vám ozveme.',
    error: 'Něco se pokazilo. Napište nám prosím přímo na hello@scanity.com.',
    nameRequired: 'Zadejte prosím své jméno.',
    emailInvalid: 'Zadejte platnou e-mailovou adresu.',
  },
  en: {
    sending: 'Sending...',
    success: 'Thanks — we’ll be in touch shortly.',
    error: 'Something went wrong. Please email us directly at hello@scanity.com.',
    nameRequired: 'Please enter your name.',
    emailInvalid: 'Please enter a valid email address.',
  },
};
const formMessages = FORM_MESSAGES[document.documentElement.lang] || FORM_MESSAGES.en;

// Most visitors never touch the contact form, so the SDK loads lazily: once the
// contact section nears the viewport, or immediately as a fallback on submit.
let emailjsReady = null;
function loadEmailJS() {
  if (!emailjsReady) {
    emailjsReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EMAILJS_SRC;
      script.onload = () => {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        resolve(window.emailjs);
      };
      script.onerror = () => reject(new Error('Failed to load EmailJS'));
      document.head.appendChild(script);
    });
  }
  return emailjsReady;
}

if (contactForm) {
  const contactSection = document.getElementById('contact');

  if (contactSection && 'IntersectionObserver' in window) {
    const loadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadEmailJS();
          loadObserver.disconnect();
        }
      });
    }, { rootMargin: '400px' });

    loadObserver.observe(contactSection);
  } else {
    loadEmailJS();
  }

  // Inline validation for the two required fields: styled to match the form
  // instead of leaving it to inconsistently-styled native browser bubbles.
  // Clears as soon as the visitor edits the field again, rather than nagging
  // mid-correction -- it only re-checks on the next submit attempt.
  const cfName = contactForm.elements.name;
  const cfEmail = contactForm.elements.email;

  const setFieldError = (input, message) => {
    const field = input.closest('.form-field');
    const errorEl = document.getElementById(input.getAttribute('aria-describedby'));
    field.classList.toggle('has-error', Boolean(message));
    if (errorEl) errorEl.textContent = message || '';
  };

  const validateField = (input, message) => {
    const valid = input.checkValidity();
    setFieldError(input, valid ? '' : message);
    return valid;
  };

  [cfName, cfEmail].forEach((input) => {
    input.addEventListener('input', () => setFieldError(input, ''));
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Honeypot: real visitors never fill this hidden field, bots often do.
    if (contactForm.elements.website.value) {
      return;
    }

    const nameValid = validateField(cfName, formMessages.nameRequired);
    const emailValid = validateField(cfEmail, formMessages.emailInvalid);
    if (!nameValid || !emailValid) {
      (nameValid ? cfEmail : cfName).focus();
      return;
    }

    contactForm.elements.time.value = new Date().toLocaleString();

    const submitBtn = contactForm.querySelector('.contact-submit');
    submitBtn.disabled = true;
    formStatus.textContent = formMessages.sending;
    formStatus.className = 'form-status';

    loadEmailJS()
      .then((emailjs) => emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, contactForm))
      .then(() => {
        formStatus.textContent = formMessages.success;
        formStatus.classList.add('is-success');
        contactForm.reset();
      })
      .catch(() => {
        formStatus.textContent = formMessages.error;
        formStatus.classList.add('is-error');
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}
