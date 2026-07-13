// May i — living background: depth-layered drifting starfield on pitch black, with
// cursor gravity-warp, rare pink twinkles, and slow soft pink nebula orbs.
// Brand pink only, no green. One global fixed #space-bg canvas = continuous space.
(() => {
  const PINK = '#ff007f';
  const STAR = '#eaf0ff';
  // phones get half the stars, lower dpr and 30fps — the drift reads the same
  const MOBILE = matchMedia('(max-width: 768px)').matches;
  const DENSITY = MOBILE ? 0.00008 : 0.00016;     // stars per px²
  const WARP_R = 150;          // cursor influence radius
  const WARP_F = 9;            // cursor pull strength

  function mount(canvas) {
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = Math.min(MOBILE ? 1.25 : 2, window.devicePixelRatio || 1);
    let stars = [], orbs = [];
    let mx = -9999, my = -9999, t = 0;
    // wormhole mode: 0 = calm starfield, 1 = full tunnel (stars streak from the centre)
    let tunnel = 0;
    window.__spaceTunnel = (v) => { tunnel = v < 0 ? 0 : v > 1 ? 1 : v; };

    const rnd = (a, b) => a + Math.random() * (b - a);

    function build() {
      const count = Math.max(40, Math.round(W * H * DENSITY));
      stars = [];
      for (let i = 0; i < count; i++) {
        const layer = Math.random();
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          z: 0.35 + layer * 0.65,
          r: 0.5 + layer * 1.5,
          a: 0.22 + Math.random() * 0.6,
          tw: Math.random() * Math.PI * 2,
          tws: 0.5 + Math.random() * 1.4,
          vx: rnd(-0.04, 0.04), vy: rnd(-0.04, 0.04),
          pink: Math.random() < 0.09,
        });
      }
      orbs = [];
      // orb size scales with the viewport so phones aren't swallowed by pink
      const oMax = Math.min(340, Math.min(W, H) * 0.38);
      const oMin = oMax * 0.45;
      for (let i = 0; i < (MOBILE ? 3 : 5); i++) {
        orbs.push({
          x: Math.random() * W, y: Math.random() * H,
          r: rnd(oMin, oMax),
          vx: rnd(-0.06, 0.06), vy: rnd(-0.06, 0.06),
          a: rnd(0.04, 0.09),
        });
      }
    }

    function resize() {
      W = window.innerWidth; H = window.innerHeight;   // full viewport (fixed backdrop)
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    // cursor is in viewport coords — the canvas is fixed, so no offset needed
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

    function drawStars(animated) {
      for (const o of orbs) {
        if (animated) {
          o.x += o.vx; o.y += o.vy;
          if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
          if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
        }
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `rgba(255,0,127,${o.a})`);
        g.addColorStop(1, 'rgba(255,0,127,0)');
        ctx.fillStyle = g;
        ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }

      const px = (mx > -9999) ? (mx - W / 2) : 0;
      const py = (my > -9999) ? (my - H / 2) : 0;

      const cx = W / 2, cy = H / 2;

      for (const s of stars) {
        if (animated) {
          if (tunnel > 0.02) {
            // wormhole: stars rush outward from the vanishing point
            const rx = s.x - cx, ry = s.y - cy;
            const d = Math.hypot(rx, ry) || 1;
            const sp = tunnel * s.z * (0.5 + d * 0.011) * 2.0;
            s.x += rx / d * sp; s.y += ry / d * sp;
            if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
              const a2 = Math.random() * Math.PI * 2;
              const r0 = rnd(6, Math.min(W, H) * 0.2);
              s.x = cx + Math.cos(a2) * r0; s.y = cy + Math.sin(a2) * r0;
            }
          } else {
            s.x += s.vx; s.y += s.vy;
            if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W;
            if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H;
          }
        }
        let dx = s.x + px * 0.02 * s.z;
        let dy = s.y + py * 0.02 * s.z;

        if (mx > -9999) {
          const ddx = mx - dx, ddy = my - dy, dist = Math.hypot(ddx, ddy);
          if (dist > 0.5 && dist < WARP_R) {
            const f = (1 - dist / WARP_R) * WARP_F * s.z;
            dx += ddx / dist * f; dy += ddy / dist * f;
          }
        }

        const tw = animated ? (0.6 + 0.4 * Math.sin(t * s.tws + s.tw)) : 0.85;
        ctx.globalAlpha = s.a * tw;
        if (tunnel > 0.02) {
          // streak along the radial direction — length grows with distance + tunnel strength
          const rx = dx - cx, ry = dy - cy;
          const d = Math.hypot(rx, ry) || 1;
          const len = tunnel * d * 0.09 + 1;
          ctx.strokeStyle = s.pink ? PINK : STAR;
          ctx.lineWidth = Math.max(0.5, s.r * s.z);
          ctx.beginPath();
          ctx.moveTo(dx - rx / d * len, dy - ry / d * len);
          ctx.lineTo(dx, dy);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(dx, dy, s.r * s.z, 0, Math.PI * 2);
          ctx.fillStyle = s.pink ? PINK : STAR;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    let skip = false;
    function frame() {
      requestAnimationFrame(frame);
      if (MOBILE && (skip = !skip)) return;   // 30fps on phones
      t += MOBILE ? 0.032 : 0.016;
      ctx.clearRect(0, 0, W, H);
      drawStars(true);
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      ctx.clearRect(0, 0, W, H);
      drawStars(false);
    } else {
      requestAnimationFrame(frame);
    }
  }

  const bg = document.getElementById('space-bg');
  if (bg) mount(bg);
})();
