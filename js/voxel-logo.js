// May i — 3D chrome voxel logo (locked settings from the approved design)
// Self-contained ES module. Auto-mounts into any [data-voxel-logo] element.
// All pieces are merged into ONE mesh (single draw call) for performance.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- locked design values ----
// phones can't afford 7 live WebGL loops — lower res, freeze minis, 30fps
const MOBILE = matchMedia('(max-width: 768px)').matches;
// resolve image paths against this module's own location (not document.baseURI) —
// keeps default shape paths correct no matter how deep the HTML page is nested
const ASSET_BASE = new URL('../assets/', import.meta.url);

const CFG = {
  image: new URL('may i shape.png', ASSET_BASE).href,
  alphaCutoff: 96,
  res: 48, gap: 0.34, depth: 1.4, rad: 0.18, rough: 0.04,
  bar: 3, seed: 12345,
  cleanCircle: true, circleCubes: 10, cubeSize: 1.4,
  autoSpeed: 0.0045,
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function findTopCircle(opaque, cols, rows) {
  const label = new Int32Array(cols * rows).fill(-1);
  const comps = [], stack = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!opaque[i] || label[i] !== -1) continue;
    const id = comps.length;
    let minR = rows, maxR = 0, minC = cols, maxC = 0, count = 0;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop(), gx = p % cols, gy = (p / cols) | 0;
      count++;
      if (gy < minR) minR = gy; if (gy > maxR) maxR = gy;
      if (gx < minC) minC = gx; if (gx > maxC) maxC = gx;
      if (gx > 0        && opaque[p - 1]    && label[p - 1]    === -1) { label[p - 1]    = id; stack.push(p - 1); }
      if (gx < cols - 1 && opaque[p + 1]    && label[p + 1]    === -1) { label[p + 1]    = id; stack.push(p + 1); }
      if (gy > 0        && opaque[p - cols] && label[p - cols] === -1) { label[p - cols] = id; stack.push(p - cols); }
      if (gy < rows - 1 && opaque[p + cols] && label[p + cols] === -1) { label[p + cols] = id; stack.push(p + cols); }
    }
    comps.push({ minR, maxR, minC, maxC, count });
  }
  if (comps.length < 2) return null;
  comps.sort((a, b) => a.minR - b.minR);
  const top = comps[0], next = comps[1];
  if (top.maxR < next.minR && top.count < cols * rows * 0.25) return top;
  return null;
}

// build one merged geometry for the whole logo
function buildGeometry(imgData, W, H, cfg) {
  const cols  = Math.max(4, Math.round(cfg.res));
  const stepX = Math.max(1, Math.floor(W / cols));
  const rows  = Math.floor(H / stepX);

  const opaque = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < cols; gx++) {
      const px = Math.min(W - 1, gx * stepX + (stepX >> 1));
      const py = Math.min(H - 1, gy * stepX + (stepX >> 1));
      opaque[gy * cols + gx] = imgData[(py * W + px) * 4 + 3] >= cfg.alphaCutoff ? 1 : 0;
    }

  const rand = mulberry32(cfg.seed);
  const used = new Uint8Array(cols * rows);
  const maxLen = Math.max(1, cfg.bar);
  const mid = Math.floor(cols / 2);
  const hasCenter = (cols % 2) === 1;
  const geos = [];

  // force left/right symmetry (off for directional shapes like the flag)
  if (cfg.symmetry !== false)
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < mid; gx++)
        opaque[gy * cols + (cols - 1 - gx)] = opaque[gy * cols + gx];

  function box(cx, cy, w, h) {
    const width = w - cfg.gap, height = h - cfg.gap, depth = cfg.depth;
    const r = Math.min(cfg.rad, Math.min(width, height, depth) / 2 - 0.001);
    const g = new RoundedBoxGeometry(width, height, depth, 4, Math.max(0.001, r));
    g.translate(cx, cy, 0);
    geos.push(g);
  }

  // clean top circle from a ring of chunky cubes
  if (cfg.cleanCircle) {
    const c = findTopCircle(opaque, cols, rows);
    if (c) {
      const cxg = (c.minC + c.maxC + 1) / 2, cyg = (c.minR + c.maxR + 1) / 2;
      const wC = c.maxC - c.minC + 1, hC = c.maxR - c.minR + 1;
      const outerR = Math.max(wC, hC) / 2;
      const s = cfg.cubeSize;
      const placeR = Math.max(0.2, outerR - s / 2);
      const n = Math.max(4, Math.round(cfg.circleCubes));
      const ox = cxg - cols / 2, oy = rows / 2 - cyg;
      const r = Math.min(cfg.rad, s / 2 - 0.001);
      for (let k = 0; k < n; k++) {
        const ang = Math.PI / 2 + (k / n) * Math.PI * 2;
        const g = new RoundedBoxGeometry(s, s, cfg.depth, 4, Math.max(0.001, r));
        g.translate(ox + Math.cos(ang) * placeR, oy + Math.sin(ang) * placeR, 0);
        geos.push(g);
      }
      // mark circle cells used so the tiler skips them
      // (re-run the flood cells: recompute is cheap enough — just clear that bbox band)
      for (let gy = c.minR; gy <= c.maxR; gy++)
        for (let gx = c.minC; gx <= c.maxC; gx++)
          if (opaque[gy * cols + gx]) used[gy * cols + gx] = 1;
    }
  }

  // asymmetric shapes (flag): tile the FULL grid, no mirroring
  if (cfg.symmetry === false) {
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        if (!opaque[idx] || used[idx]) continue;
        const horiz = rand() < 0.5;
        const wantLen = 1 + Math.floor(rand() * maxLen);
        let w = 1, h = 1;
        if (horiz) {
          while (w < wantLen && gx + w < cols) {
            const j = gy * cols + (gx + w);
            if (!opaque[j] || used[j]) break; w++;
          }
        } else {
          while (h < wantLen && gy + h < rows) {
            const j = (gy + h) * cols + gx;
            if (!opaque[j] || used[j]) break; h++;
          }
        }
        for (let yy = 0; yy < h; yy++)
          for (let xx = 0; xx < w; xx++)
            used[(gy + yy) * cols + (gx + xx)] = 1;
        box(gx + w / 2 - cols / 2, rows / 2 - (gy + h / 2), w, h);
      }
    }
    const mergedA = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    mergedA.center();
    mergedA.computeBoundingSphere();
    return mergedA;
  }

  // tile left half into bars, mirror to the right
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < mid; gx++) {
      const idx = gy * cols + gx;
      if (!opaque[idx] || used[idx]) continue;
      const horiz = rand() < 0.5;
      const wantLen = 1 + Math.floor(rand() * maxLen);
      let w = 1, h = 1;
      if (horiz) {
        while (w < wantLen && gx + w < mid) {
          const j = gy * cols + (gx + w);
          if (!opaque[j] || used[j]) break; w++;
        }
      } else {
        while (h < wantLen && gy + h < rows) {
          const j = (gy + h) * cols + gx;
          if (!opaque[j] || used[j]) break; h++;
        }
      }
      for (let yy = 0; yy < h; yy++)
        for (let xx = 0; xx < w; xx++)
          used[(gy + yy) * cols + (gx + xx)] = 1;
      const cx = gx + w / 2 - cols / 2;
      const cy = rows / 2 - (gy + h / 2);
      box(cx, cy, w, h);
      box(-cx, cy, w, h);
    }
  }

  // center column (odd widths)
  if (hasCenter) {
    const gx = mid;
    for (let gy = 0; gy < rows; gy++) {
      const idx = gy * cols + gx;
      if (!opaque[idx] || used[idx]) continue;
      let h = 1;
      const wantLen = 1 + Math.floor(rand() * maxLen);
      while (h < wantLen && gy + h < rows) {
        const j = (gy + h) * cols + gx;
        if (!opaque[j] || used[j]) break; h++;
      }
      for (let yy = 0; yy < h; yy++) used[(gy + yy) * cols + gx] = 1;
      box(0, rows / 2 - (gy + h / 2), 1, h);
    }
  }

  const merged = mergeGeometries(geos, false);
  geos.forEach(g => g.dispose());
  merged.center();          // center on origin so it rotates & frames nicely
  merged.computeBoundingSphere();
  return merged;
}

export function mountVoxelLogo(container, options = {}) {
  const cfg = { ...CFG, ...options };
  const lite = !!cfg.lite;   // reduced quality (mobile minis) — main May i logo stays full

  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  RectAreaLightUniformsLib.init();
  const soft = (x, y, z, i, w, h) => {
    const l = new THREE.RectAreaLight(0xffffff, i, w, h);
    l.position.set(x, y, z); l.lookAt(0, 0, 0); scene.add(l);
  };
  soft( 40,  30, 40, 5.0, 45, 45);
  soft(-45,  10, 35, 4.0, 45, 45);
  soft(  0, -30, 45, 2.5, 55, 30);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

  const material = new THREE.MeshPhysicalMaterial({
    color: cfg.color ? new THREE.Color(cfg.color) : 0xd9dde3,
    metalness: 1.0, roughness: cfg.rough,
    envMapIntensity: 1.6, clearcoat: 0.4, clearcoatRoughness: 0.08,
  });

  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  // pivot lets us hold a fixed tilt (e.g. 45° upper-left) while the mesh spins on Y
  const pivot = new THREE.Group();
  pivot.rotation.z = cfg.tilt || 0;
  pivot.add(mesh);
  scene.add(pivot);

  // frame the camera so the logo fits the container
  let fitRadius = 20;
  function fit() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h);   // updateStyle:true -> canvas always matches its container
    camera.aspect = w / h;
    const fov = camera.fov * Math.PI / 180;
    const vFit = fitRadius / Math.sin(fov / 2);
    const hFit = fitRadius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
    camera.position.z = Math.max(vFit, hFit) * 1.15;
    camera.updateProjectionMatrix();
  }

  // load image -> pixels -> geometry
  new THREE.ImageLoader().load(cfg.image, (img) => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const geo = buildGeometry(data, img.width, img.height, cfg);
    mesh.geometry.dispose();
    mesh.geometry = geo;
    fitRadius = geo.boundingSphere.radius;
    fit();
  }, undefined, (e) => console.error('[voxel-logo] image load failed:', e));

  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';

  // only render while actually shown (perf) — container is `position:fixed`
  // and geometrically fills the viewport at all times, so IntersectionObserver
  // reports "visible" even while GSAP has faded it to opacity:0. Read the live
  // inline opacity GSAP writes each scrub tick instead — cheap (no reflow),
  // and correctly skips the WebGL render() call while the shape is hidden.
  function isVisible() {
    const op = parseFloat(container.style.opacity);
    return Number.isNaN(op) ? true : op > 0.02;
  }

  if (cfg.hover) {
    // MINI mode: subtle sway + gentle "toward us" breathing (no 360 spin); tilt to cursor on hover
    let t = 0, hTX = 0, hTY = 0, hX = 0, hY = 0;
    container.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      hTX = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
      hTY = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
    container.addEventListener('pointerleave', () => { hTX = 0; hTY = 0; });
    let snapFrames = 0, snapped = false;
    (function loop() {
      if (snapped) return;
      requestAnimationFrame(loop);
      if (!isVisible()) return;
      t += 0.016;
      hX += (hTX - hX) * 0.08;
      hY += (hTY - hY) * 0.08;
      mesh.rotation.y = Math.sin(t * 0.6) * 0.42 + hX;      // gentle side-to-side sway
      mesh.rotation.x = Math.sin(t * 0.9) * 0.10 + hY;      // gentle nod
      mesh.scale.setScalar(1 + 0.06 * Math.sin(t * 0.85));  // breathe toward / away from viewer
      renderer.render(scene, camera);
      // snapshot mode (mobile non-brand minis): freeze into an <img>, free the GPU context
      if (cfg.snapshot && mesh.geometry.attributes.position && ++snapFrames > 3) {
        const img = new Image();
        img.src = renderer.domElement.toDataURL('image/png');
        img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;';
        img.alt = '';
        snapped = true;
        container.replaceChild(img, renderer.domElement);
        try { ro.disconnect(); } catch {}
        renderer.dispose();
      }
    })();
  } else {
    // FULL mode: auto-rotate + drag + inertia
    let velY = 0, velX = 0, down = false, lastX = 0, lastY = 0;
    if (cfg.interactive !== false) {
      el.addEventListener('pointerdown', (e) => { down = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = (e.clientX - lastX) * 0.008, dy = (e.clientY - lastY) * 0.008;
        mesh.rotation.y += dx; mesh.rotation.x += dy;
        velY = dx; velX = dy; lastX = e.clientX; lastY = e.clientY;
      });
      addEventListener('pointerup', () => { down = false; });
    }
    let skip = false, idle = 0;
    (function loop() {
      requestAnimationFrame(loop);
      if (!isVisible()) return;
      if (lite && (skip = !skip)) return;                   // 30fps for lite mounts only
      // frozen logo at rest: once geometry is in, render a few warm-up frames, then sleep
      if (cfg.autoSpeed === 0 && !down && Math.abs(velY) < 1e-4 && Math.abs(velX) < 1e-4 &&
          mesh.geometry.attributes.position) {
        if (++idle > 10) return;
      } else idle = 0;
      if (!down) {
        mesh.rotation.y += cfg.autoSpeed + velY;
        mesh.rotation.x += velX;
        velY *= 0.94; velX *= 0.94;
        mesh.rotation.x += (0 - mesh.rotation.x) * 0.02;
      }
      renderer.render(scene, camera);
    })();
  }

  const ro = new ResizeObserver(fit);
  ro.observe(container);
  fit();

  return { renderer, scene, camera, mesh };
}

// Three people in ONE canvas/WebGL context (device-safety: iOS drops extra contexts).
// Middle person is larger and exposes its own material for the scroll colour beat.
export function mountVoxelPeople(container, options = {}) {
  const cfg = { ...CFG, res: MOBILE ? 20 : 26, cleanCircle: false, image: new URL('person shape.png', ASSET_BASE).href, ...options };

  const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  RectAreaLightUniformsLib.init();
  [[40, 30, 40, 5.0], [-45, 10, 35, 4.0], [0, -30, 45, 2.5]].forEach(([x, y, z, i]) => {
    const l = new THREE.RectAreaLight(0xffffff, i, 45, 45);
    l.position.set(x, y, z); l.lookAt(0, 0, 0); scene.add(l);
  });

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9dde3, metalness: 1.0, roughness: cfg.rough,
    envMapIntensity: 1.6, clearcoat: 0.4, clearcoatRoughness: 0.08,
  });
  const midMaterial = sideMaterial.clone();   // unique — only the middle one recolours

  const group = new THREE.Group();
  scene.add(group);

  let fitRadius = 20;
  function fit() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const fov = camera.fov * Math.PI / 180;
    const vFit = fitRadius / Math.sin(fov / 2);
    const hFit = fitRadius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
    camera.position.z = Math.max(vFit, hFit) * 1.15;
    camera.updateProjectionMatrix();
  }

  new THREE.ImageLoader().load(cfg.image, (img) => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const geo = buildGeometry(data, img.width, img.height, cfg);

    geo.computeBoundingBox();
    const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
    const MID = 1.45, SIDE = 1.0;

    const midMesh = new THREE.Mesh(geo, midMaterial);
    midMesh.scale.setScalar(MID);
    const left = new THREE.Mesh(geo, sideMaterial);
    const right = new THREE.Mesh(geo, sideMaterial);
    const dx = w * (MID + SIDE) / 2 * 0.92;   // slight overlap pulls the trio close
    left.position.set(-dx, -h * 0.14, 0);
    right.position.set(dx, -h * 0.14, 0);
    group.add(left, midMesh, right);

    // idle "alive" motion (like the mini mark): sway + nod + breathe, offset phases
    trio = [
      { mesh: left,    base: SIDE, phase: 0.0 },
      { mesh: midMesh, base: MID,  phase: 2.1 },
      { mesh: right,   base: SIDE, phase: 4.2 },
    ];

    // frame the trio
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    fitRadius = sphere.radius;
    group.position.y -= sphere.center.y;
    fit();
  }, undefined, (e) => console.error('[voxel-people] image load failed:', e));

  // alive trio — gentle sway/nod/breathe per person; render only while actually shown.
  // container is `position:fixed` and geometrically fills the viewport at all times
  // (even once GSAP fades it out at the star-swap beat), so IntersectionObserver
  // alone never goes false — read the live inline opacity GSAP writes instead.
  let trio = null, t = 0;
  function isVisible() {
    const op = parseFloat(container.style.opacity);
    return Number.isNaN(op) ? true : op > 0.02;
  }
  renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
  // phones: full rate while the user scrolls (the trio is scroll-choreographed),
  // slow breathing (~12fps) when the page is at rest
  let lastScroll = 0, frameNo = 0;
  if (MOBILE) addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  (function loop() {
    requestAnimationFrame(loop);
    if (!isVisible()) return;
    frameNo++;
    if (MOBILE) {
      const active = performance.now() - lastScroll < 1500;
      if (active ? (frameNo & 1) : (frameNo % 5)) return;   // 30fps scrolling / 12fps idle
      t += active ? 0.032 : 0.08;
    } else t += 0.016;
    if (trio) for (const { mesh, base, phase } of trio) {
      mesh.rotation.y = Math.sin(t * 0.6 + phase) * 0.22;          // gentle side sway
      mesh.rotation.x = Math.sin(t * 0.9 + phase) * 0.05;          // tiny nod
      mesh.scale.setScalar(base * (1 + 0.035 * Math.sin(t * 0.85 + phase))); // breathe
    }
    renderer.render(scene, camera);
  })();

  new ResizeObserver(fit).observe(container);
  fit();

  return { renderer, scene, camera, midMaterial, sideMaterial };
}

// auto-mount
function mountPeopleEl(el) {
  el._voxel = mountVoxelPeople(el);
}
function mountLogoEl(el) {
  const mini = el.hasAttribute('data-voxel-mini');
  // May i brand marks (default image) always stay fully alive.
  // Other mobile shapes (target/star/question/rocket) get degraded — minis become
  // one-shot snapshots (no live WebGL), non-mini decorative shapes (rocket) go lite (30fps).
  const mayi = !el.dataset.voxelImage;
  const snapshot = MOBILE && mini && !mayi;
  const lite = MOBILE && !mini && !mayi;
  const still = el.hasAttribute('data-voxel-still');
  const baseRes = el.dataset.voxelRes ? parseFloat(el.dataset.voxelRes) : (mini ? 22 : CFG.res);
  el._voxel = mountVoxelLogo(el, {
    image: el.dataset.voxelImage || CFG.image,
    interactive: still ? false : !mini,
    hover: mini,
    snapshot,
    lite,
    res: snapshot ? Math.max(16, Math.round(baseRes * 0.8)) : (lite ? Math.max(18, Math.round(baseRes * 0.7)) : baseRes),
    autoSpeed: still ? 0 : (mini ? 0.006 : CFG.autoSpeed),
    // the head-ring cleanup is specific to the May i logo; turn off for other shapes
    cleanCircle: el.dataset.voxelCircle === 'off' ? false : CFG.cleanCircle,
    // fixed tilt in degrees (e.g. 45 = leaning to the upper-left)
    tilt: el.dataset.voxelTilt ? parseFloat(el.dataset.voxelTilt) * Math.PI / 180 : 0,
    // left/right mirroring — turn off for directional shapes (flag)
    symmetry: el.dataset.voxelSym === 'off' ? false : true,
    // custom chrome tint (e.g. "#dfa422" mustard star) — default silver
    color: el.dataset.voxelColor || null,
  });
}
// mounting a WebGL voxel logo is inherently ~150-400ms of synchronous
// main-thread work (mesh built from the source image) — requestIdleCallback
// looked like the fix but a throttled device still has per-frame "idle" gaps
// while the hero spin/morph loop runs, so it just fired the mount mid-animation
// anyway. Mounting all 6-7 shapes together made it worse (this used to be
// mobile-only, but the same collision — every shape mounting synchronously
// right as the card-spin loop starts — stutters the spin on desktop too).
// Fix: only the hero mark is needed soon (fades in right after the loading
// screen) — mount it a beat after the gallery has visibly settled, not the
// instant it settles. The .story shapes (rocket/people/pin/star/question)
// stay invisible until the user scrolls to the .voxel section, so skip
// paying for them up front at all — mount lazily once that section is
// actually being scrolled into view.
function boot() {
  const hero = document.querySelector('.hero');
  const settle = (fn) => {
    if (!hero || hero.classList.contains('is-gallery')) { setTimeout(fn, 600); return; }
    new MutationObserver((_, obs) => {
      if (hero.classList.contains('is-gallery')) { obs.disconnect(); setTimeout(fn, 600); }
    }).observe(hero, { attributes: true, attributeFilter: ['class'] });
  };
  settle(() => document.querySelectorAll('.hero__mark[data-voxel-logo]').forEach(mountLogoEl));

  // One mount per idle slot, with a paint in between. Firing them as a burst
  // is what used to stall the scroll for a beat and make the rocket appear
  // late, in one pop, instead of already being there when the story starts.
  const queue = [];
  let draining = false;
  const idle = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 400 })
    : (fn) => setTimeout(fn, 40);
  const drain = () => {
    const job = queue.shift();
    if (!job) {
      draining = false;
      // pins were measured before these shapes existed — re-measure once
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      return;
    }
    job();
    requestAnimationFrame(() => idle(drain));
  };
  const enqueue = (job) => {
    queue.push(job);
    if (!draining) { draining = true; idle(drain); }
  };

  // The rocket and the trio carry the story section itself, so they are built
  // as soon as the hero has settled — well before the user can scroll to them.
  // Rocket first: it is the first shape the story reveals.
  settle(() => {
    document.querySelectorAll('.story__rocket[data-voxel-logo]').forEach((el) => enqueue(() => mountLogoEl(el)));
    document.querySelectorAll('.story [data-voxel-people]').forEach((el) => enqueue(() => mountPeopleEl(el)));
  });

  // The four small shapes only ever appear next to a specific section further
  // down, so each one waits for its own section to come within a screen.
  [['.story__target', '.proc'], ['.story__star', '.revs'],
   ['.story__question', '.faq'], ['.story__mayi', '.lform']].forEach(([shapeSel, secSel]) => {
    const el = document.querySelector(shapeSel + '[data-voxel-logo]');
    if (!el) return;
    const sec = document.querySelector(secSel);
    if (!sec) { enqueue(() => mountLogoEl(el)); return; }
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      enqueue(() => mountLogoEl(el));
    }, { rootMargin: '100% 0px 0px 0px' }).observe(sec);
  });
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
