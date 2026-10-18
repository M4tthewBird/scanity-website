// Industry pages live at clean folder URLs (reality/, sport/, ...), which
// Netlify serves from each folder's index.html. Opened straight from disk
// (file://) a folder link shows a directory listing instead, so point local
// previews at the index.html itself.
if (location.protocol === 'file:') {
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (/^[a-z]+:/i.test(href)) return; // http:, mailto: ...
    // "../" -> "../index.html", "../#demo" -> "../index.html#demo"
    link.setAttribute('href', href.replace(/\/(#.*)?$/, '/index.html$1'));
  });
}

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

// "Využití" header menu: lists the industry pages. Opens on click (and on
// hover where there is a mouse), closes on Escape, outside click, or once
// keyboard focus leaves it.
const industryDropdown = document.getElementById('industryDropdown');
const industryToggle = document.getElementById('industryToggle');

if (industryDropdown && industryToggle) {
  let closeTimer;
  const setOpen = (open) => {
    clearTimeout(closeTimer);
    industryDropdown.classList.toggle('open', open);
    industryToggle.setAttribute('aria-expanded', String(open));
  };

  // Hovering opens it first, so the click that usually follows must not close it again
  let openedByHover = false;

  industryToggle.addEventListener('click', () => {
    if (openedByHover) {
      openedByHover = false;
      setOpen(true);
      return;
    }
    setOpen(!industryDropdown.classList.contains('open'));
  });

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    industryDropdown.addEventListener('mouseenter', () => {
      if (!industryDropdown.classList.contains('open')) openedByHover = true;
      setOpen(true);
    });
    // A short grace period, so a pointer cutting a corner doesn't snap it shut
    industryDropdown.addEventListener('mouseleave', () => {
      openedByHover = false;
      closeTimer = setTimeout(() => setOpen(false), 180);
    });
  }

  industryDropdown.addEventListener('focusout', (event) => {
    if (!industryDropdown.contains(event.relatedTarget)) setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!industryDropdown.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && industryDropdown.classList.contains('open')) {
      setOpen(false);
      industryToggle.focus();
    }
  });
}

// Industry pages: the bar under the header gets its own backdrop only once it
// has stuck below the header, so at the top it still reads as part of the hero.
const industryBar = document.getElementById('industryBar');

if (industryBar) {
  const siteHeader = document.querySelector('.site-header');
  let ticking = false;
  const updateStuck = () => {
    ticking = false;
    const headerBottom = siteHeader ? siteHeader.getBoundingClientRect().bottom : 0;
    industryBar.classList.toggle('is-stuck', industryBar.getBoundingClientRect().top <= headerBottom + 0.5 && window.scrollY > 0);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateStuck);
    }
  }, { passive: true });
  window.addEventListener('resize', updateStuck);
  updateStuck();

  // On narrow screens the switcher scrolls sideways; start it at the current
  // page, so "Hotely" isn't hidden off to the right while you're on it.
  const industrySwitcher = industryBar.querySelector('.industry-nav');
  const currentIndustry = industrySwitcher && industrySwitcher.querySelector('[aria-current="page"]');
  if (currentIndustry && industrySwitcher.scrollWidth > industrySwitcher.clientWidth) {
    industrySwitcher.scrollLeft = currentIndustry.offsetLeft - (industrySwitcher.clientWidth - currentIndustry.offsetWidth) / 2;
  }
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
  // Phones get a lighter field at half the frame rate, and with data saver on
  // the field stays a still frame: it's atmosphere, not worth the battery.
  const isSmallScreen = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const staticField = prefersReducedMotion || saveData;
  const dpr = Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1.5 : 2);
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
    const count = isSmallScreen
      ? Math.max(40, Math.min(90, Math.round((viewWidth * viewHeight) / 9000)))
      : Math.max(70, Math.min(220, Math.round((viewWidth * viewHeight) / 9000)));
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

  let skipFrame = false;
  function stepPointCloudFrame() {
    // Half rate on phones: draw every other frame, moving the points twice as far
    if (isSmallScreen) {
      skipFrame = !skipFrame;
      if (skipFrame) {
        rafId = requestAnimationFrame(stepPointCloudFrame);
        return;
      }
    }
    const stride = isSmallScreen ? 2 : 1;
    points.forEach((p) => {
      p.x += p.vx * stride;
      p.y += p.vy * stride;
      if (p.x < -10) p.x = viewWidth + 10;
      if (p.x > viewWidth + 10) p.x = -10;
      if (p.y < -10) p.y = viewHeight + 10;
      if (p.y > viewHeight + 10) p.y = -10;
    });
    drawPointCloudFrame();
    rafId = requestAnimationFrame(stepPointCloudFrame);
  }

  function startPointCloud() {
    if (running || staticField) return;
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

  // Storage can be blocked outright (strict privacy settings throw on any access); the hint
  // then simply shows on each visit instead of breaking the viewer's load handler.
  const hintSeen = () => {
    try {
      return localStorage.getItem(VIEWER_HINT_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  };
  const rememberHintSeen = () => {
    try {
      localStorage.setItem(VIEWER_HINT_SEEN_KEY, 'true');
    } catch {
      // not remembered: shown again next visit
    }
  };

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
    if (viewerHint && !hintSeen()) {
      viewerHint.classList.add('is-visible');
      const dismissHint = () => {
        viewerHint.classList.remove('is-visible');
        rememberHintSeen();
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
    const tabs = Array.from(viewerSwitch.querySelectorAll('.viewer-switch-btn'));

    const selectTab = (btn) => {
      if (btn.classList.contains('is-active')) return;

      // Roving tabindex, as a tablist expects: Tab reaches the selected scene only, and the
      // arrow keys below move between scenes.
      tabs.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        b.tabIndex = b === btn ? 0 : -1;
      });

      const src = `${VIEWER_BASE}/?id=${btn.dataset.id}`;
      if (viewerFrame.classList.contains('is-loaded')) {
        loadViewerSrc(src);
      } else {
        viewerIframe.dataset.src = src;
      }
    };

    tabs.forEach((b) => {
      b.tabIndex = b.classList.contains('is-active') ? 0 : -1;
    });

    viewerSwitch.addEventListener('click', (event) => {
      const btn = event.target.closest('.viewer-switch-btn');
      if (btn) selectTab(btn);
    });

    viewerSwitch.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      const next = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      selectTab(tabs[next]);
    });
  }
}

// Real-estate package video (reality/): the chapter list is the video's own
// navigation. Clicking a chapter seeks there; while it plays, the current
// chapter opens its description and fills a progress line. The video is
// silent, so it may start by itself (muted) once scrolled into view -- except
// under reduced motion or data saver, where it waits for a click. It only
// starts downloading once it is about to be seen.
const packagePlayer = document.getElementById('packagePlayer');

if (packagePlayer) {
  const video = packagePlayer.querySelector('.package-video');
  const toggle = packagePlayer.querySelector('.package-toggle');
  const chapters = Array.from(packagePlayer.querySelectorAll('.package-chapter')).map((button) => ({
    button,
    start: Number(button.dataset.start),
    end: Number(button.dataset.end),
  }));
  const canAutoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && !(navigator.connection && navigator.connection.saveData);
  let pausedByVisitor = false;
  let frame = null;

  const ensureSource = () => {
    if (!video.getAttribute('src')) video.src = video.dataset.src;
  };

  const play = () => {
    ensureSource();
    // Rejected when the browser blocks it; the big play button stays up then.
    video.play().catch(() => {});
  };

  const render = () => {
    const t = video.currentTime;
    chapters.forEach((chapter, i) => {
      const isLast = i === chapters.length - 1;
      const active = t >= chapter.start && (t < chapter.end || isLast);
      if (active) {
        chapter.button.setAttribute('aria-current', 'true');
        const progress = Math.min(1, Math.max(0, (t - chapter.start) / (chapter.end - chapter.start)));
        chapter.button.style.setProperty('--progress', progress.toFixed(4));
      } else {
        chapter.button.removeAttribute('aria-current');
        chapter.button.style.setProperty('--progress', '0');
      }
    });
  };

  const loop = () => {
    render();
    frame = requestAnimationFrame(loop);
  };

  video.addEventListener('play', () => {
    packagePlayer.classList.remove('is-idle');
    packagePlayer.classList.add('is-playing');
    toggle.setAttribute('aria-label', toggle.dataset.labelPause);
    cancelAnimationFrame(frame);
    loop();
  });

  video.addEventListener('pause', () => {
    packagePlayer.classList.remove('is-playing');
    toggle.setAttribute('aria-label', toggle.dataset.labelPlay);
    cancelAnimationFrame(frame);
    render();
  });

  video.addEventListener('seeked', render);

  toggle.addEventListener('click', () => {
    if (video.paused) {
      pausedByVisitor = false;
      play();
    } else {
      pausedByVisitor = true;
      video.pause();
    }
  });

  chapters.forEach((chapter) => {
    chapter.button.addEventListener('click', () => {
      pausedByVisitor = false;
      ensureSource();
      const seek = () => {
        video.currentTime = chapter.start;
        render();
      };
      if (video.readyState >= 1) {
        seek();
      } else {
        video.addEventListener('loadedmetadata', seek, { once: true });
      }
      play();
    });
  });

  if ('IntersectionObserver' in window) {
    // Fetch a little ahead of time, so playback can begin as it comes into view.
    // Kept tight: the player sits right under the hero, and a wider margin
    // would pull the 7 MB video on every page load, scrolled or not.
    const preloadObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        if (canAutoplay) {
          video.preload = 'auto';
          ensureSource();
        }
        preloadObserver.disconnect();
      }
    }, { rootMargin: '150px' });
    preloadObserver.observe(packagePlayer);

    // Plays only while mostly on screen, and never against a visitor's pause.
    const playObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (canAutoplay && !pausedByVisitor) play();
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.5 });
    playObserver.observe(video);
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

  // While a smooth scroll is still on its way, the page's position says nothing about where it is
  // going: a click then would count from somewhere mid-way and land on the same stop again. So a
  // move remembers its target, and the next click steps on from there until the page settles.
  let pendingIndex = null;
  let settleTimer;
  const settle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      pendingIndex = null;
    }, 150);
  };
  window.addEventListener('scroll', settle, { passive: true });

  const step = (delta) => {
    const index = pendingIndex ?? currentStopIndex();
    const next = Math.max(0, Math.min(stops.length - 1, index + delta));
    if (next === index) return;
    pendingIndex = next;
    settle();
    goTo(stops[next]);
  };

  scrollNavUp.addEventListener('click', () => step(-1));
  scrollNavDown.addEventListener('click', () => step(1));

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
    error: 'Něco se pokazilo. Napište nám prosím přímo na matyas.ptacek@scanity.cz.',
    nameRequired: 'Zadejte prosím své jméno.',
    emailInvalid: 'Zadejte platnou e-mailovou adresu.',
  },
  en: {
    sending: 'Sending...',
    success: 'Thanks — we’ll be in touch shortly.',
    error: 'Something went wrong. Please email us directly at matyas.ptacek@scanity.cz.',
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
      script.onerror = () => {
        // Forget the failure (a blocker, a dropped connection), so the next submit tries again
        // instead of failing on the same rejected promise until the page is reloaded.
        emailjsReady = null;
        script.remove();
        reject(new Error('Failed to load EmailJS'));
      };
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
