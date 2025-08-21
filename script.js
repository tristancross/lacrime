// ---------- Gallery Thumbnails ----------
const mainImage = document.getElementById("mainImage");
const thumbs = document.getElementById("thumbs");

if (mainImage && thumbs) {
  thumbs.addEventListener("click", (e) => {
    const btn = e.target.closest(".thumb");
    if (!btn) return;

    mainImage.src = btn.dataset.src;

    document
      .querySelectorAll(".thumb")
      .forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
}

// ---------- Accordions ----------
document.querySelectorAll(".acc-item .acc-hdr").forEach((hdr) => {
  hdr.addEventListener("click", () => {
    const item = hdr.parentElement;
    item.classList.toggle("is-open");
  });
});


// ---- Tabs ----
(function initTabs(){
  const nav = document.querySelector('.tabs .tabs-nav');
  if (!nav) return;

  const tabs = [...nav.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.tabs .tab-panel')];
  const underline = nav.querySelector('.tab-underline');

  function activateTab(btn) {
    // buttons
    tabs.forEach(t => {
      t.classList.toggle('is-active', t === btn);
      t.setAttribute('aria-selected', t === btn ? 'true' : 'false');
      t.tabIndex = t === btn ? 0 : -1;
    });
    // panels
    panels.forEach(p => {
      const match = p.id === btn.getAttribute('aria-controls');
      p.classList.toggle('is-active', match);
      if (match) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });
    // underline
    const rect = btn.getBoundingClientRect();
    const parentRect = nav.getBoundingClientRect();
    underline.style.width = rect.width + 'px';
    underline.style.transform = `translateX(${rect.left - parentRect.left}px)`;
  }

  // init to first active
  const current = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
  requestAnimationFrame(() => activateTab(current));

  nav.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (btn) activateTab(btn);
  });

  // keyboard a11y
  nav.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); const t = tabs[(i+1)%tabs.length]; t.focus(); activateTab(t); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); const t = tabs[(i-1+tabs.length)%tabs.length]; t.focus(); activateTab(t); }
  });

  // re-position underline on resize
  window.addEventListener('resize', () => {
    const active = nav.querySelector('.tab.is-active');
    if (active) activateTab(active);
  });
})();

// ===== Jitter‑free version: single ScrollTrigger + smoothed progress (no tween driver) =====
window.addEventListener('DOMContentLoaded', () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const frameCount = 26;
  const imgEl = document.getElementById('mainImage');
  const row = document.querySelector('.row--product');
  const details = document.querySelector('.col--details');

  const frameSrc = i => `imgAnim/${i.toString().padStart(4, '0')}.png`;

  // Preload frames
  for (let i = 0; i < frameCount; i++) new Image().src = frameSrc(i);

  // Draw helper
  let lastIdx = -1;
  function setFrame(i) {
    const idx = Math.max(0, Math.min(frameCount - 1, Math.floor(i)));
    if (idx === lastIdx) return;
    lastIdx = idx;
    const src = frameSrc(idx);
    imgEl.src = src;
    imgEl.dataset.src = src;
    const hud = document.getElementById('seqHUD');
    if (hud) hud.textContent = `frame ${idx} / ${frameCount - 1}`;
  }

  // Always start at first frame
  setFrame(0);

  // robust end distance so there’s always scrub room on wide viewports
  const endDistance = () => {
    const h = details?.scrollHeight || 0;
    const vh = window.innerHeight || 0;
    return "+=" + Math.max(h - vh, vh * 1.5);  // at least 150vh
  };

  // Smoothed progress state (manual lerp)
  const state = { p: 0 };        // smoothed progress 0..1
  const EPS = 0.0005;
  const START_DEAD = 0.02;       // dead‑zone at start
  const END_DEAD   = 0.98;       // dead‑zone at end

  ScrollTrigger.matchMedia({
    "(min-width: 951px)": () => {

      const st = ScrollTrigger.create({

        trigger: row,
        start: "top top",         // start exactly when row hits top of viewport
        end: endDistance,         // robust fixed/fallback distance
        pin: ".gallery-pin",
        pinSpacing: true,
        pinReparent: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // markers: { startColor: "#42d6c2", endColor: "#f93822", indent: 20 },

        onRefreshInit: () => { lastIdx = -1; setFrame(0); state.p = 0; },
        onEnter:       () => { setFrame(0); state.p = 0; },
        onEnterBack:   () => { setFrame(0); state.p = 0; },

        onUpdate: self => {
          // raw progress
          let t = self.progress;

          // dead‑zones clamp to exact ends (kills edge jitter)
          if (t <= START_DEAD) { setFrame(0); state.p = 0.03; return; }
          if (t >= END_DEAD)   { setFrame(frameCount - 1); state.p = 0.97; return; }

          // lerp to smooth fast flicks; overwrite ensures only one tween at a time
          gsap.to(state, {
            p: t,
            duration: 0.2,      // smoothing amount (0.1–0.25 feels good)
            ease: "none",
            overwrite: true,
            onUpdate: () => {
              const f = (frameCount - 1 - EPS) * state.p;  // never request exact last integer
              setFrame(f);
            }
          });
        },

        onLeaveBack: () => { setFrame(0); state.p = 0; },
        onLeave:     () => { setFrame(frameCount - 1); state.p = 1; },
      });

      

      // refresh after fonts/images so measurements are final
      const postAssetsRefresh = () => ScrollTrigger.refresh();
      if (document.fonts?.ready) document.fonts.ready.then(postAssetsRefresh);
      window.addEventListener('load', postAssetsRefresh);

      return () => st.kill();
    },

    "(max-width: 950px)": () => {
      // No pin/scrub on mobile
      lastIdx = -1; setFrame(0); state.p = 0;
    }
  });
});

// ---- Science stats: gradient rings with centered numbers ----
window.addEventListener('DOMContentLoaded', () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const items = Array.from(document.querySelectorAll('.science-stats li'));
  if (!items.length) return;

  // unique IDs for gradients
  let uid = 0;
  const nextId = (p = 'grad') => `${p}-${++uid}`;

  items.forEach(li => {
    // Parse % and keep author HTML (bold/italics) for the label
    const rawHTML  = li.innerHTML.trim();
    const rawText  = li.textContent.trim();

    const m   = rawText.match(/(\d+)\s*%/);
    const pct = m ? Math.min(100, Math.max(0, parseInt(m[1], 10)))
                  : (li.dataset.pct ? +li.dataset.pct : 0);

    const labelHTML = rawHTML.replace(/^\s*\d+\s*%\s*/,'').trim();
    const tmp = document.createElement('div'); tmp.innerHTML = labelHTML;
    const labelText = tmp.textContent.trim(); // a11y

    // Rebuild item
    li.innerHTML = '';

    // Geometry (SVG viewBox is 100x100; CSS scales the whole ring)
    const cx = 50, cy = 50, r = 36;
    const C  = 2 * Math.PI * r;

    // Wrapper
    const wrap = document.createElement('div');
    wrap.className = 'ring-wrap';

    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'science-ring');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${pct}% ${labelText}`);

    // defs + stroke-following gradient
    const defs  = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradId = nextId('grad-pill');
    const grad  = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', gradId);

    // Use real coords and align gradient along the circle's diameter, then rotate
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', String(cx - r));
    grad.setAttribute('y1', String(cy));
    grad.setAttribute('x2', String(cx + r));
    grad.setAttribute('y2', String(cy));
    // We rotate our stroke -90deg to start at 12 o'clock; rotate gradient +90deg to match
    grad.setAttribute('gradientTransform', `rotate(90, ${cx}, ${cy})`);

    const stopA = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopA.setAttribute('offset', '0%');
    stopA.setAttribute('stop-color',
      getComputedStyle(document.documentElement).getPropertyValue('--teal-a').trim() || '#3684b5'
    );

    const stopB = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopB.setAttribute('offset', '100%');
    stopB.setAttribute('stop-color',
      getComputedStyle(document.documentElement).getPropertyValue('--pill').trim() || '#e53935'
    );

    grad.appendChild(stopA);
    grad.appendChild(stopB);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Circles
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('class', 'ring-bg');
    bg.setAttribute('cx', String(cx));
    bg.setAttribute('cy', String(cy));
    bg.setAttribute('r',  String(r));

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('class', 'ring-fg');
    fg.setAttribute('cx', String(cx));
    fg.setAttribute('cy', String(cy));
    fg.setAttribute('r',  String(r));
    fg.setAttribute('stroke', `url(#${gradId})`);
    fg.style.strokeDasharray  = String(C);
    fg.style.strokeDashoffset = String(C); // start empty

    svg.appendChild(bg);
    svg.appendChild(fg);

    // Centered number
    const center = document.createElement('div');
    center.className = 'ring-center';
    center.innerHTML = `<span class="num">0</span><span class="unit">%</span>`;

    // Label
    const copy = document.createElement('div');
    copy.className = 'science-copy';
    const lbl = document.createElement('div');
    lbl.className = 'science-label';
    lbl.innerHTML = labelHTML; // preserve <strong>/<span> etc.
    copy.appendChild(lbl);

    wrap.appendChild(svg);
    wrap.appendChild(center);
    li.appendChild(wrap);
    li.appendChild(copy);

    // Stash for animation
    li._ring = { fg, C, pct, numEl: center.querySelector('.num') };
  });

  // Start hidden; GSAP reveals
  gsap.set(items, { opacity: 0, y: 20 });

  // Reduced motion: set final states immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(li => {
      const { fg, C, pct, numEl } = li._ring;
      fg.style.strokeDashoffset = String(C * (1 - pct / 100));
      numEl.textContent = String(pct);
    });
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }

  // Animate in
// Animate each stat independently
items.forEach((li) => {
  const { fg, C, pct, numEl } = li._ring;
  const counter = { v: 0 };

  // ensure each item starts hidden (already set globally, but safe)
  gsap.set(li, { opacity: 0, y: 20 });

  gsap.timeline({
    scrollTrigger: {
      trigger: li,          // <-- each list item is its own trigger
      start: 'top 85%',     // similar feel to your science section; tweak to taste
      once: true
      // markers: true
    }
  })
  .to(li, {
    opacity: 1,
    y: 0,
    duration: 0.45,
    ease: 'power2.out'
  })
  // start ring fill slightly overlapping the fade
  .to(fg, {
    strokeDashoffset: C * (1 - pct / 100),
    duration: 0.95,
    ease: 'power2.out'
  }, '-=0.25')
  // number ticks up in sync with the ring
  .to(counter, {
    v: pct,
    duration: 0.95,
    ease: 'power2.out',
    onUpdate: () => { numEl.textContent = String(Math.round(counter.v)); }
  }, '<');
});


  items.forEach((li, i) => {
    const { fg, C, pct, numEl } = li._ring;
    const counter = { v: 0 };
    const base = i * 0.18;

    tl.to(li, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, base)
      .to(fg, {
        strokeDashoffset: C * (1 - pct / 100),
        duration: 0.95,
        ease: 'power2.out'
      }, base + 0.05)
      .to(counter, {
        v: pct,
        duration: 0.95,
        ease: 'power2.out',
        onUpdate: () => { numEl.textContent = String(Math.round(counter.v)); }
      }, base + 0.05);
  });

  // Ensure positions are correct below the pinned gallery
  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts?.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
});

// ---- Quote reveal (fade-up) ----
window.addEventListener('DOMContentLoaded', () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const quoteEl = document.querySelector('.row--quote .quote');
  if (!quoteEl) return;

  // reduced motion: show immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(quoteEl, { opacity: 1, y: 0 });
    return;
  }

  // start hidden
  gsap.set(quoteEl, { opacity: 0, y: 24 });

  gsap.timeline({
    scrollTrigger: {
      trigger: '.row--quote',
      start: 'top 75%',  
      once: true
      // markers: true
    }
  })
  .to(quoteEl, {
    opacity: 1,
    y: 0,
    duration: 0.75,
    ease: 'power2.out'
  })
  .from(quoteEl.querySelector('cite'), {
    opacity: 0,
    y: 8,
    duration: 0.75,
    ease: 'power2.out'
  }, '-=0.2');
});


// ---- Splash / Preload (Enter button) ----
(() => {
  const splash = document.getElementById('splash');
  const btn = document.getElementById('splashEnter');
  if (!splash || !btn) return;

  // lock scroll while splash is shown
  document.documentElement.classList.add('splash-open');
  document.body.classList.add('splash-open');

  const hideSplash = () => {
    if (splash.classList.contains('is-hidden')) return;
    splash.classList.add('is-hidden');
    document.documentElement.classList.remove('splash-open');
    document.body.classList.remove('splash-open');
  };

  // click the Enter button to dismiss
  btn.addEventListener('click', hideSplash);

  // focus the button for accessibility (Enter/Space will also activate it)
  queueMicrotask(() => btn.focus({ preventScroll: true }));
})();


// ---- Mobile menu (clone .nav-left links into a slide-in) ----
(() => {
  const btn   = document.getElementById('menuToggle');
  const menu  = document.getElementById('mobileMenu');
  const panel = menu?.querySelector('.mobile-menu__panel');
  const close = document.getElementById('menuClose');
  const sink  = document.getElementById('mobileLinks');
  const src   = document.querySelectorAll('.nav-left a');
  if (!btn || !menu || !panel || !close || !sink || !src.length) return;

  // Clone header links into the mobile menu
  sink.innerHTML = '';
  src.forEach(a => sink.appendChild(a.cloneNode(true)));

  const focusables = () => panel.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])');

  const openMenu = () => {
    // unhide first so initial transform applies
    menu.hidden = false;

    // ensure starting state is computed (panel at -100%)
    panel.getBoundingClientRect(); // force a reflow

    // next frame: add class to trigger transition
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
      document.body.classList.add('menu-open');

      const first = focusables()[0];
      setTimeout(() => (first ? first.focus() : close.focus()), 0);
    });
  };

  const closeMenu = () => {
    menu.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
    document.body.classList.remove('menu-open');

    // Wait for slide-out to finish, then hide for a11y/tab order
    const onEnd = (e) => {
      if (e.target !== panel) return;
      panel.removeEventListener('transitionend', onEnd);
      menu.hidden = true;
      btn.focus();
    };
    panel.addEventListener('transitionend', onEnd);
  };

  btn.addEventListener('click', openMenu);
  close.addEventListener('click', closeMenu);
  menu.addEventListener('click', (e) => { if (e.target === menu) closeMenu(); });

  // Esc + focus trap
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    if (e.key === 'Tab') {
      const f = [...focusables()];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0 || i === -1)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }
  });
})();


// ---- DERM section: fade-up reveals ----
window.addEventListener('DOMContentLoaded', () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const root = document.querySelector('.derm');
  if (!root) return;

  const rowItems = [
    root.querySelector('.derm--quote--section'),
    root.querySelector('.derm--img')
  ].filter(Boolean);

  const subItems = [
    root.querySelector('.derm--title'),
    root.querySelector('.derm--credentials'),
    root.querySelector('.derm--products')
  ].filter(Boolean);

  // Reduced motion: just show everything
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set([...rowItems, ...subItems], { opacity: 1, y: 0 });
    return;
  }

  // Start hidden
  gsap.set(rowItems, { opacity: 0, y: 24, willChange: 'transform, opacity' });
  gsap.set(subItems, { opacity: 0, y: 16, willChange: 'transform, opacity' });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: 'top 50%',
      once: true
      // markers: true
    }
  });

  // Bring in the two columns
  tl.to(rowItems, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: 'power2.out',
    stagger: 0.12
  });

  // Then the text under the image
  if (subItems.length) {
    tl.to(subItems, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: 'power2.out',
      stagger: 0.08
    }, '-=0.2'); // slight overlap with the previous step
  }
});

document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
  const originalText = btn.textContent;

  btn.addEventListener('mouseenter', () => {
    btn.textContent = 'SOLD OUT';
  });

  btn.addEventListener('mouseleave', () => {
    btn.textContent = originalText;
  });
});

