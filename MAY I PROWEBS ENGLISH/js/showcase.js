// May i — prowebs/en · Showcase engine
// One set of cards: fly out → spin in a circle (loading) → morph straight into a
// horizontal moving gallery (hero). Continuous, madrepunk-style — no fade handoff.
(() => {
  const BASE = ['aurelia-yachts', 'smash-burger', 'forma-studio-tlv', 'noa-gross-photography', 'rongo', 'hasdeisaada', 'ask-reuven'];
  const NAMES = {
    'aurelia-yachts': 'Aurelia Yachts', 'smash-burger': 'SMASH Burger', 'forma-studio-tlv': 'Forma Studio',
    'noa-gross-photography': 'Noa Gross', 'rongo': 'Ron-go', 'hasdeisaada': 'Hasdei Saada', 'ask-reuven': 'Reuven Yosupov',
  };
  // live URLs for the in-popup iframe (null = blocks framing → screenshot fallback)
  const LIVE = {
    'aurelia-yachts': 'https://aurelia-yachts.vercel.app/',
    'smash-burger': 'https://smash-burger-co.vercel.app/',
    'forma-studio-tlv': 'https://demo-site-two-wheat.vercel.app/',  // public domain of same project (embeddable)
    'noa-gross-photography': 'https://noa-gross-photography.vercel.app/',
    'rongo': 'https://rongo.co.il/',
    'hasdeisaada': 'https://hasdeisaada.org/',
    'ask-reuven': 'https://ask-reuven.co.il/',
  };

  const stage     = document.querySelector('.hero__stage');
  const hero      = document.querySelector('.hero');
  const loadingUI = document.querySelector('.hero__loading');
  const intro     = document.querySelector('.hero__intro');
  const countB    = document.querySelector('.loader__count b');
  if (!stage || !hero) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = matchMedia('(max-width: 768px)').matches;

  // 2× the set — full enough circle, seamless marquee, not too crowded.
  // Mobile: 1× set — half the elements spinning/animating during the heaviest phase.
  const items = [];
  for (let r = 0; r < (MOBILE ? 1 : 2); r++) for (const id of BASE) items.push(id);
  const N = items.length;

  const cards = items.map((id, i) => {
    const el = document.createElement('div');
    el.className = 'hero-card'; el.dataset.id = id; el.dataset.name = NAMES[id] || '';
    el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Preview - ${NAMES[id] || ''}`);
    el.innerHTML = `<img src="../assets/cards/${id}.webp" srcset="../assets/cards/${id}-480.webp 480w, ../assets/cards/${id}.webp 900w" sizes="(max-width: 640px) 220px, 420px" alt="${NAMES[id] || ''}" decoding="async">
      <span class="tagn">${NAMES[id] || ''}</span>
      <button class="card-preview" type="button" tabindex="-1">Preview Site <span aria-hidden="true">↗</span></button>`;
    stage.appendChild(el);
    return { el, base: (i / N) * Math.PI * 2, radMul: 0.9 + ((i * 37) % 22) / 100, tilt: ((i * 53) % 22) - 11, depth: ((i * 29) % 50) - 25, wob: (i % 3) + 1 };
  });

  let cardW = 0, gap = 22, total = 0, rowY = 0;
  function measure() {
    const phone = innerWidth <= 768;
    cardW = phone
      ? Math.max(150, innerWidth * 0.42)                        // phones: smaller cards, ~2 in view
      : Math.min(330, Math.max(210, innerWidth * 0.23));        // desktop: unchanged
    gap = Math.max(16, innerWidth * 0.014);
    total = N * (cardW + gap);
    if (phone) {
      // phones: place row so CTA→gallery gap == mark→title gap, measured from
      // real layout (offsetTop — immune to intro entrance transform & Safari
      // innerHeight changes). Fallback to old factor if elements missing.
      const mark = hero.querySelector('.hero__mark');
      const h1 = intro?.querySelector('h1');
      const actions = intro?.querySelector('.hero__actions');
      if (mark && h1 && actions && intro) {
        const markBottom = mark.offsetTop + mark.offsetHeight;
        const h1Top = intro.offsetTop + h1.offsetTop;
        const ctaBottom = intro.offsetTop + actions.offsetTop + actions.offsetHeight;
        const gapTop = h1Top - markBottom;
        const cardH = cardW * 10 / 16;
        rowY = ctaBottom + gapTop + cardH / 2 + 10; // +10 = sine wobble amplitude on card Y
      } else {
        rowY = innerHeight * 0.635;
      }
    } else {
      rowY = innerHeight * 0.72;
    }
    document.documentElement.style.setProperty('--cardw', cardW + 'px');
  }
  measure(); addEventListener('resize', measure, { passive: true });

  const LOAD_MS = reduce ? 400 : (MOBILE ? 1100 : 2800), MORPH_MS = reduce ? 200 : (MOBILE ? 800 : 1400);
  const lerp = (a, b, m) => a + (b - a) * m;
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  let startTS = null, morphTS = 0, last = 0;
  let t = 0, entrance = 0, rowOff = 0, morph = 0, phase = 'load', paused = false, hoverCount = 0;

  // pause the marquee ONLY while the cursor is over a card, and make the
  // "Preview Site" button follow the cursor across the image.
  cards.forEach((c) => {
    const btn = c.el.querySelector('.card-preview');
    c.el.addEventListener('pointerenter', () => { if (phase === 'gallery') { hoverCount++; paused = true; } }, { passive: true });
    c.el.addEventListener('pointerleave', () => { hoverCount = Math.max(0, hoverCount - 1); paused = hoverCount > 0; }, { passive: true });
    c.el.addEventListener('pointermove', (e) => {
      const r = c.el.getBoundingClientRect();
      btn.style.left = (e.clientX - r.left) + 'px';
      btn.style.top = (e.clientY - r.top) + 'px';
    }, { passive: true });
  });

  let heroVisible = true;
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }, { rootMargin: '200px' }).observe(hero);

  let skip = false;
  function step(now) {
    // once the load/morph intro is done, this loop has nothing left to prove —
    // stop burning main-thread time animating 12 cards nobody can see once scrolled away.
    if (!heroVisible && phase === 'gallery') {
      last = now;
      setTimeout(() => requestAnimationFrame(step), 400);
      return;
    }
    // mobile: half the update rate (~30fps) — this loop runs through the heaviest
    // moment on the page (spin + morph + WebGL logo mounting all at once).
    if (MOBILE && (skip = !skip)) { requestAnimationFrame(step); return; }
    if (startTS === null) startTS = now;
    const dt = Math.min(50, now - last) / 1000; last = now;
    const el = now - startTS;

    if (entrance < 1) entrance = Math.min(1, entrance + dt / 1.0);
    const e = ease(entrance);
    t += dt * (reduce ? 0 : 0.30) * (1 - morph);                 // spin, eases out during morph
    if (!paused) rowOff += (reduce ? 0 : 1) * (phase === 'gallery' ? 85 : 34) * dt;

    if (countB && phase === 'load') countB.textContent = String(Math.min(100, Math.round(el / LOAD_MS * 100))).padStart(2, '0');

    if (phase === 'load' && el >= LOAD_MS) { phase = 'morph'; morphTS = now; onMorph(); }
    if (phase === 'morph') { morph = Math.min(1, (now - morphTS) / MORPH_MS); if (morph >= 1) { phase = 'gallery'; hero.classList.add('is-gallery'); } }

    const cx = innerWidth / 2, cy = innerHeight / 2;
    const R = Math.min(innerWidth, innerHeight) * 0.40;
    const m = ease(morph);

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i], ang = c.base + t;
      const wob = reduce ? 0 : Math.sin(now / 1000 * c.wob + i) * 5;
      const cX = cx + Math.cos(ang) * R * c.radMul * e;
      const cY = cy + Math.sin(ang) * R * 0.80 * c.radMul * e + wob;
      const cRot = c.tilt + (reduce ? 0 : Math.sin(now / 1600 + i) * 2);
      const cScale = 0.55 + 0.32 * e;

      const raw = i * (cardW + gap) - rowOff;
      const w = ((raw % total) + total) % total;          // 0..total
      const rX = w - cardW / 2;                            // wrap only when fully off the left edge
      const rY = rowY + Math.sin(i * 1.7) * 10;

      const X = lerp(cX, rX, m), Y = lerp(cY, rY, m);
      const Rt = lerp(cRot, 0, m), S = lerp(cScale, 1, m);
      const z = c.depth * (1 - m);
      c.el.style.transform =
        `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-50%) translateZ(${z.toFixed(0)}px) rotate(${Rt.toFixed(2)}deg) scale(${S.toFixed(3)})`;
      c.el.style.opacity = e.toFixed(3);
    }
    requestAnimationFrame(step);
  }

  function onMorph() {
    document.body.classList.remove('loading');
    loadingUI?.classList.add('hide');
    intro?.classList.add('is-live');
  }

  // ---- in-site preview popup (scroll the full site, no external navigation) ----
  const overlay = document.querySelector('.preview');
  const frame = overlay?.querySelector('.preview__frame');
  const imgwrap = overlay?.querySelector('.preview__imgwrap');
  const img = overlay?.querySelector('.preview__img');
  function openPreview(id, name) {
    if (!overlay) return;
    overlay.querySelector('.preview__title').textContent = name;
    overlay.classList.remove('ready');
    const live = LIVE[id];
    if (live) {                                   // scroll the actual live site inside the popup
      imgwrap.hidden = true; img.src = '';
      frame.hidden = false;
      frame.onload = () => overlay.classList.add('ready');
      frame.src = live;
      overlay.querySelector('.preview__hint').textContent = 'Live site · scroll inside the window';
    } else {                                      // site blocks embedding → full-page snapshot
      frame.hidden = true; frame.src = '';
      imgwrap.hidden = false; imgwrap.scrollTop = 0;
      img.onload = () => overlay.classList.add('ready');
      img.src = `../assets/previews/${id}.jpg`; img.alt = name;
      overlay.querySelector('.preview__hint').textContent = 'Snapshot view · scroll';
    }
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closePreview() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; frame.src = ''; img.src = ''; overlay.classList.remove('ready'); }, 320);
  }
  stage.addEventListener('click', (e) => {
    if (phase !== 'gallery') return;
    const card = e.target.closest('.hero-card');
    if (card) openPreview(card.dataset.id, card.dataset.name);
  });
  stage.addEventListener('keydown', (e) => {
    if (phase !== 'gallery' || (e.key !== 'Enter' && e.key !== ' ')) return;
    const card = e.target.closest('.hero-card');
    if (card) { e.preventDefault(); openPreview(card.dataset.id, card.dataset.name); }
  });
  if (overlay) {
    overlay.querySelector('.preview__close').addEventListener('click', closePreview);
    overlay.querySelector('.preview__backdrop').addEventListener('click', closePreview);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closePreview(); });
  }

  requestAnimationFrame(step);
})();
