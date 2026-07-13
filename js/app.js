// May i — prowebs · content hydration (single source of truth = content.js)
import { SITE_CONTENT } from '../content.js';

const set = (sel, txt) => { const el = document.querySelector(sel); if (el && txt != null) el.textContent = txt; };

// meta
if (SITE_CONTENT.meta?.title) document.title = SITE_CONTENT.meta.title;

// hero intro (pulled from content.js hero)
const H = SITE_CONTENT.hero || {};
// NOTE: #hero-title is intentionally NOT hydrated here — it holds animated
// markup (pink span + typing caret) in index.html. content.js hero.title
// stays the source of truth for meta/fallback only.
set('.hero__intro .hero__sub', H.subtitle);
set('.hero__intro [data-cta]', H.cta);

// hero title — auto typing dots: "טוב." -> "טוב..." (hold 3s) -> "טוב." (hold 3s) -> loop
(() => {
  const dots = document.querySelector('#hero-title [data-dots]');
  if (!dots) return;
  const HOLD = 3000, STEP = 180;
  const type = () => {
    let n = 1;
    const t = setInterval(() => {
      n++; dots.textContent = '.'.repeat(n);
      if (n >= 3) { clearInterval(t); setTimeout(erase, HOLD); }
    }, STEP);
  };
  const erase = () => {
    let n = 3;
    const t = setInterval(() => {
      n--; dots.textContent = '.'.repeat(n);
      if (n <= 1) { clearInterval(t); setTimeout(type, HOLD); }
    }, STEP);
  };
  setTimeout(type, HOLD);
})();

// hero cursor spotlight — smooth-follow pink reveal through the headline/sub
(() => {
  const root = document.documentElement;
  let tx = -1000, ty = -1000, cx = -1000, cy = -1000, raf = 0;
  const loop = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    root.style.setProperty('--mx', cx + 'px');
    root.style.setProperty('--my', cy + 'px');
    if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) raf = requestAnimationFrame(loop);
    else raf = 0;
  };
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
})();

// hero pink splash — gooey metaball trail that follows the cursor and fades ~1.5s
(() => {
  const hero = document.getElementById('hero');
  const canvas = document.querySelector('.hero__splash');
  if (!hero || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // mobile: touch screens don't fire pointermove on hover (only mid-drag), so this
  // effect is basically invisible there anyway — but its RAF loop still runs forever,
  // clearing the canvas + doing 2 getBoundingClientRect() layout reads every frame.
  // skip the whole thing on mobile: nothing lost visually, one less perpetual loop
  // competing for main-thread time during the heaviest part of the page.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const ctx = canvas.getContext('2d');
  const PINK = (getComputedStyle(document.documentElement).getPropertyValue('--pink').trim()) || '#ff007f';
  const LIFE = 1500;   // ms a blob lives before fully faded
  const R = 52;        // base blob radius
  const STEP = 9;      // px between spawned blobs (denser = smoother trail)

  let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const accent = document.querySelector('#hero-title .hl-pink');
  const pts = [];
  let last = null;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const now = performance.now();
    if (last) {
      const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
      const n = Math.max(1, Math.floor(d / STEP));
      for (let i = 1; i <= n; i++) pts.push({ x: last.x + dx * i / n, y: last.y + dy * i / n, t: now });
    } else {
      pts.push({ x, y, t: now });
    }
    last = { x, y };
  }, { passive: true });

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now();
    ctx.fillStyle = PINK;
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      const age = now - p.t;
      if (age >= LIFE) { pts.splice(i, 1); continue; }
      const k = 1 - age / LIFE;         // 1 → 0 over lifetime
      ctx.globalAlpha = k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R * Math.sqrt(k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // flip the pink accent word white while the splash overlaps it
    if (accent) {
      const hr = hero.getBoundingClientRect();
      const ar = accent.getBoundingClientRect();
      const x0 = ar.left - hr.left - R, x1 = ar.right - hr.left + R;
      const y0 = ar.top - hr.top - R, y1 = ar.bottom - hr.top + R;
      let over = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) { over = true; break; }
      }
      accent.classList.toggle('lit', over);
    }

    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

// custom accessibility button — section-aware color, opens the UserWay panel.
// (UserWay locks its own icon color, so we hide theirs and drive our own.)
(() => {
  const root = document.documentElement;
  const DEFAULT = 'pink';
  let sectionAccent = DEFAULT;

  const setAccent = () => {
    root.dataset.accent = document.body.classList.contains('loading') ? 'green' : sectionAccent;
  };

  // build the button
  const fab = document.createElement('button');
  fab.className = 'a11y-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'תפריט נגישות');
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="3.6" r="2.1"/>' +
    '<path d="M20 8.2c0 .6-.5 1-1 1-.1 0-2.6-.3-4.5-.5V13l2.2 6.6c.2.6-.1 1.2-.7 1.4-.6.2-1.2-.1-1.4-.7L12.5 15h-1L8.4 20.3c-.2.6-.8.9-1.4.7-.6-.2-.9-.8-.7-1.4L8.5 13V8.7C6.6 8.9 4.1 9.2 4 9.2c-.6 0-1-.5-1-1s.5-1 1-1c.1 0 3.9.5 8 .5s7.9-.5 8-.5c.6 0 1 .5 1 1z"/>' +
    '</svg>';
  fab.addEventListener('click', () => {
    const uw = window.UserWay;
    if (uw && typeof uw.widgetOpen === 'function') uw.widgetOpen();
    else document.querySelector('#userwayAccessibilityIcon')?.click();
  });
  document.body.appendChild(fab);

  // hide UserWay's own (gold, non-recolorable) launcher once its API is ready
  let tries = 0;
  const hideIcon = setInterval(() => {
    const uw = window.UserWay;
    if (uw && typeof uw.iconVisibilityOff === 'function') { uw.iconVisibilityOff(); clearInterval(hideIcon); }
    else if (++tries > 60) clearInterval(hideIcon);
  }, 250);

  // section-aware accent (extensible: add data-accent="green|pink|mustard" to a <section>)
  const secs = document.querySelectorAll('main section');
  if (secs.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          sectionAccent = e.target.dataset.accent || DEFAULT;
          setAccent();
        }
      });
    }, { threshold: [0.5] });
    secs.forEach((s) => io.observe(s));
  }

  // loader → hero handoff toggles body.loading; recolor when it does
  new MutationObserver(setAccent).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  setAccent();
})();
