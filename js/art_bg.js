// Parallax backdrops: sky, far mountains, mid village skyline, near props.
// Each layer is painted once per level load into offscreen canvases.

// seeded RNG (same look every boot)
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cv = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

// ---------------- primitive painters ----------------

function ridge(ctx, w, baseY, amp, col, seed, step = 26) {
  const r = rng(seed);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  let y = baseY;
  for (let x = 0; x <= w + step; x += step) {
    y = baseY - r() * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + step, 200);
  ctx.lineTo(0, 200);
  ctx.closePath();
  ctx.fill();
}

function jaggedPeaks(ctx, w, baseY, hMax, col, shade, seed) {
  const r = rng(seed);
  ctx.fillStyle = col;
  let x = -10;
  const pts = [[x, baseY]];
  while (x < w + 20) {
    const px = x + 20 + r() * 34;
    const py = baseY - (hMax * 0.5 + r() * hMax * 0.5);
    pts.push([px, py]);
    x = px + 16 + r() * 26;
    pts.push([x, baseY - r() * hMax * 0.25]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.lineTo(w + 30, baseY); ctx.lineTo(w + 30, 220); ctx.lineTo(-10, 220);
  ctx.closePath();
  ctx.fill();
  // snow / light caps
  ctx.fillStyle = shade;
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [px, py] = pts[i];
    if (py < baseY - hMax * 0.55) {
      ctx.fillRect(px - 3, py + 2, 7, 2);
      ctx.fillRect(px - 1, py, 3, 2);
    }
  }
}

// rolling dunes with soft crests (Aladdin-style desert)
function dunes(ctx, w, baseY, amp, col, seed) {
  const r = rng(seed);
  ctx.fillStyle = col;
  let x = -30;
  ctx.beginPath();
  ctx.moveTo(x, 200);
  while (x < w + 60) {
    const wdt = 70 + r() * 130;
    const h = amp * (0.35 + r() * 0.65);
    ctx.quadraticCurveTo(x + wdt / 2, baseY - h, Math.min(x + wdt, w + 60), baseY + (r() * 6 - 3));
    x += wdt;
  }
  ctx.lineTo(w + 60, 200);
  ctx.closePath();
  ctx.fill();
}

// 4-row graduated checker transition (Bayer-like, Genesis dither)
function ditherBand(ctx, y, col) {
  ctx.fillStyle = col;
  const cut = [1, 2, 2, 3]; // fraction of 4 kept per row: 25/50/50/75%
  for (let dy = 0; dy < 4; dy++) {
    for (let x = (dy % 2); x < 320; x += 2) {
      if (((x + dy * 2) >> 1) % 4 >= cut[dy]) continue;
      ctx.fillRect(x, y + dy, 1, 1);
    }
  }
}

function house(ctx, x, gy, w, h, pal, dome) {
  ctx.fillStyle = pal.adobe;
  ctx.fillRect(x, gy - h, w, h);
  ctx.fillStyle = pal.adobeShade;
  ctx.fillRect(x, gy - h, w, 2);
  ctx.fillRect(x + w - 2, gy - h, 2, h);
  if (dome) {
    ctx.fillStyle = pal.dome;
    ctx.beginPath();
    ctx.arc(x + w / 2, gy - h, w * 0.34, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = pal.door;
    ctx.fillRect(x + w / 2 - 1, gy - h - w * 0.34 - 3, 2, 3);
  } else {
    // parapet
    ctx.fillStyle = pal.adobeLight;
    for (let i = 0; i < w; i += 5) ctx.fillRect(x + i, gy - h - 2, 3, 2);
  }
  // door + windows
  ctx.fillStyle = pal.door;
  ctx.fillRect(x + w / 2 - 2, gy - 7, 5, 7);
  ctx.fillStyle = pal.adobeShade;
  ctx.fillRect(x + 3, gy - h + 4, 3, 3);
  if (w > 22) ctx.fillRect(x + w - 7, gy - h + 4, 3, 3);
}

function minaret(ctx, x, gy, pal) {
  const h = 52;
  ctx.fillStyle = pal.adobe;
  ctx.fillRect(x - 3, gy - h, 7, h);
  ctx.fillStyle = pal.adobeShade;
  ctx.fillRect(x + 2, gy - h, 2, h);
  // balcony
  ctx.fillStyle = pal.adobeLight;
  ctx.fillRect(x - 5, gy - h + 8, 11, 2);
  // cone top
  ctx.fillStyle = pal.dome;
  ctx.beginPath();
  ctx.moveTo(x - 4, gy - h);
  ctx.lineTo(x + 5, gy - h);
  ctx.lineTo(x + 0.5, gy - h - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2ca58';
  ctx.fillRect(x - 1, gy - h - 13, 2, 3);
}

function poplar(ctx, x, gy, h, pal) {
  ctx.fillStyle = pal.trunk;
  ctx.fillRect(x, gy - h * 0.25, 1, h * 0.25);
  ctx.fillStyle = pal.tree;
  for (let i = 0; i < 5; i++) {
    const ww = 4 - i * 0.55;
    ctx.fillRect(x - ww / 2, gy - h * 0.3 - i * (h * 0.16), ww, h * 0.18);
  }
  ctx.fillStyle = pal.treeShade;
  ctx.fillRect(x + 0.5, gy - h * 0.3, 1.5, h * 0.75);
}

function apricotTree(ctx, x, gy, s, pal) {
  ctx.fillStyle = pal.trunk;
  ctx.fillRect(x - 1, gy - 8 * s, 2 * s, 8 * s);
  ctx.fillRect(x - 4 * s, gy - 8 * s, 4 * s, 2 * s);
  ctx.fillRect(x + 1 * s, gy - 8 * s, 4 * s, 2 * s);
  ctx.fillStyle = pal.tree;
  ctx.beginPath();
  ctx.arc(x, gy - 11 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 5 * s, gy - 9 * s, 4 * s, 0, Math.PI * 2);
  ctx.arc(x + 5 * s, gy - 9 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.treeShade;
  ctx.fillRect(x + 2 * s, gy - 12 * s, 4 * s, 5 * s);
  // fruit
  ctx.fillStyle = '#f2a24c';
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 4 * s + i * 2 * s, gy - 12 * s + (i % 2) * 3 * s, s, s);
}

function yurt(ctx, x, gy, w, pal, tint) {
  ctx.fillStyle = tint || '#e8e0cc';
  ctx.beginPath();
  ctx.arc(x, gy, w / 2, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - w / 2, gy - w * 0.22, w, w * 0.22);
  ctx.fillStyle = tint ? 'rgba(0,0,0,0.18)' : '#b8ac8e';
  ctx.fillRect(x - w / 2, gy - w * 0.14, w, 2);
  // roof ribs
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * w * 0.12, gy - w * 0.34, 1, w * 0.1);
  // door
  ctx.fillStyle = '#7a4c28';
  ctx.fillRect(x - 2, gy - 7, 5, 7);
  // finial
  ctx.fillStyle = '#c05848';
  ctx.fillRect(x - 1, gy - w * 0.5 - 4, 2, 4);
}

function stall(ctx, x, gy, w, pal, awnA, awnB) {
  ctx.fillStyle = pal.wood || '#785834';
  ctx.fillRect(x, gy - 10, 2, 10);
  ctx.fillRect(x + w - 2, gy - 10, 2, 10);
  // awning
  for (let i = 0; i < w; i += 4) {
    ctx.fillStyle = (i / 4) % 2 ? awnA : awnB;
    ctx.fillRect(x + i, gy - 14, 4, 3);
  }
  // goods
  ctx.fillStyle = pal.adobeShade;
  ctx.fillRect(x + 3, gy - 4, 4, 4);
  ctx.fillStyle = '#c05848';
  ctx.fillRect(x + 9, gy - 3, 3, 3);
  ctx.fillStyle = '#4e8c34';
  ctx.fillRect(x + 13, gy - 4, 4, 4);
}

function tower(ctx, x, gy, w, h, pal) {
  ctx.fillStyle = pal.brick;
  ctx.fillRect(x, gy - h, w, h);
  ctx.fillStyle = pal.brickDark;
  ctx.fillRect(x + w - 3, gy - h, 3, h);
  // crenellations
  ctx.fillStyle = pal.brickLight;
  for (let i = 0; i < w; i += 6) ctx.fillRect(x + i, gy - h - 3, 4, 3);
  // arrow slit
  ctx.fillStyle = '#1a1216';
  ctx.fillRect(x + w / 2 - 1, gy - h + 6, 2, 6);
}

function bush(ctx, x, gy, s, col, col2) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, gy - 2 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 3 * s, gy - 1 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col2;
  ctx.fillRect(x - 1, gy - 2, 2, 2);
}

// ---------------- per-level build ----------------

export function buildBackdrop(level, pal) {
  const px = level.px;
  const W = 180; // layer height

  // --- sky (static 320x180, tiled horizontally at runtime) ---
  const sky = cv(320, W);
  {
    const c = sky.getContext('2d');
    // banded sky with dithered transitions
    c.fillStyle = pal.skyTop; c.fillRect(0, 0, 320, 60);
    ditherBand(c, 56, pal.skyMid);
    c.fillStyle = pal.skyMid; c.fillRect(0, 60, 320, 62);
    ditherBand(c, 118, pal.skyLow);
    c.fillStyle = pal.skyLow; c.fillRect(0, 122, 320, W - 122);
    if (pal.time === 'dusk') {
      // stars
      const r = rng(99);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) c.fillRect((r() * 320) | 0, (r() * 90) | 0, 1, 1);
      // moon
      c.fillStyle = '#f0e8c8';
      c.beginPath(); c.arc(250, 34, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = pal.skyTop;
      c.beginPath(); c.arc(255, 31, 9, 0, Math.PI * 2); c.fill();
    } else {
      // sun
      c.fillStyle = pal.sunGlow;
      c.beginPath(); c.arc(pal.time === 'noon' ? 160 : 60, pal.time === 'noon' ? 30 : 46, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = pal.sun;
      c.beginPath(); c.arc(pal.time === 'noon' ? 160 : 60, pal.time === 'noon' ? 30 : 46, 13, 0, Math.PI * 2); c.fill();
    }
    // clouds
    const r = rng(41);
    c.fillStyle = pal.cloud;
    for (let i = 0; i < 5; i++) {
      const cx0 = r() * 300, cy0 = 14 + r() * 40, s = 0.7 + r() * 0.8;
      c.fillRect(cx0, cy0, 26 * s, 4 * s);
      c.fillRect(cx0 + 5 * s, cy0 - 3 * s, 14 * s, 4 * s);
      c.fillRect(cx0 + 12 * s, cy0 + 3 * s, 18 * s, 3 * s);
    }
  }

  // --- far layer (f 0.15) ---
  const farW = Math.ceil(px * 0.15) + 340;
  const far = cv(farW, W);
  {
    const c = far.getContext('2d');
    if (pal.time === 'dusk') {
      jaggedPeaks(c, farW, 150, 70, pal.mountain, '#8a8898', 5);
      ridge(c, farW, 160, 16, pal.mountainShade, 6);
    } else {
      // hazy dune sea
      dunes(c, farW, 148, 30, pal.duneFar, 5);
      dunes(c, farW, 158, 20, pal.duneNear, 9);
    }
  }

  // --- mid layer (f 0.4): village skyline ---
  const midW = Math.ceil(px * 0.4) + 340;
  const mid = cv(midW, W);
  {
    const c = mid.getContext('2d');
    const r = rng(77);
    const gy = 158;
    // distant hill
    c.fillStyle = pal.hill;
    c.beginPath();
    c.moveTo(0, gy);
    for (let x = 0; x <= midW; x += 60) c.lineTo(x, gy - 6 - r() * 14);
    c.lineTo(midW, 200); c.lineTo(0, 200);
    c.fill();

    if (level.music === 'level2') {
      // dense bazaar city
      let x = 6;
      while (x < midW - 30) {
        const w = 22 + r() * 26, h = 20 + r() * 22;
        house(c, x, gy, w, h, pal, r() < 0.4);
        if (r() < 0.3) minaret(c, x + w + 6, gy, pal);
        x += w + 8 + r() * 16;
      }
    } else if (pal.time === 'dusk') {
      // fortress walls + towers
      tower(c, 20, gy, 26, 46, pal);
      for (let x = 50; x < midW - 30; x += 44) {
        c.fillStyle = pal.brick;
        c.fillRect(x, gy - 26, 40, 26);
        c.fillStyle = pal.brickDark;
        c.fillRect(x, gy - 26, 40, 2);
        c.fillStyle = pal.brickLight;
        for (let i = 0; i < 40; i += 8) c.fillRect(x + i, gy - 29, 5, 3);
        if (r() < 0.5) tower(c, x + 30, gy, 20, 40, pal);
      }
      tower(c, midW - 40, gy, 30, 54, pal);
      // dark village behind
      for (let x = 0; x < midW - 40; x += 30) {
        if (r() < 0.5) house(c, x + r() * 14, gy - 24, 18 + r() * 10, 12 + r() * 8, pal, r() < 0.3);
      }
    } else {
      // orchard village: houses, minaret, poplars, yurts
      let x = 10;
      while (x < midW - 40) {
        const pick = r();
        if (pick < 0.3) {
          house(c, x, gy, 20 + r() * 16, 14 + r() * 10, pal, r() < 0.35);
          x += 34 + r() * 18;
        } else if (pick < 0.42) {
          minaret(c, x + 4, gy, pal);
          x += 26;
        } else if (pick < 0.58) {
          poplar(c, x, gy, 30 + r() * 18, pal);
          x += 12;
        } else if (pick < 0.68) {
          yurt(c, x + 10, gy, 22, pal);
          x += 34;
        } else {
          poplar(c, x, gy, 24 + r() * 14, pal);
          x += 10 + r() * 10;
        }
      }
    }
  }

  // --- near layer (f 0.7): orchards / stalls / rocks ---
  const nearW = Math.ceil(px * 0.7) + 340;
  const near = cv(nearW, W);
  {
    const c = near.getContext('2d');
    const r = rng(123);
    const gy = 172;
    if (level.music === 'level1') {
      for (let x = 8; x < nearW; x += 34 + r() * 22) {
        apricotTree(c, x, gy, 0.9 + r() * 0.5, pal);
        if (r() < 0.3) bush(c, x + 14, gy, 1, pal.tree, pal.treeShade);
      }
      // dry grass tufts on the sand
      c.fillStyle = '#b09048';
      for (let x = 6; x < nearW; x += 22 + r() * 34) {
        c.fillRect(x, gy - 2, 1, 2);
        c.fillRect(x + 2, gy - 3, 1, 3);
        c.fillRect(x + 4, gy - 2, 1, 2);
      }
    } else if (level.music === 'level2') {
      for (let x = 10; x < nearW; x += 44 + r() * 30) {
        stall(c, x, gy, 22 + r() * 10, pal, pal.awnA, pal.awnB);
        if (r() < 0.4) bush(c, x + 34, gy, 1, pal.tree, pal.treeShade);
      }
    } else {
      // dead trees, rocks, banners
      for (let x = 8; x < nearW; x += 40 + r() * 40) {
        const pick = r();
        if (pick < 0.4) {
          // dead tree
          c.strokeStyle = '#3c2c1c';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x, gy);
          c.lineTo(x - 2, gy - 18 - r() * 10);
          c.moveTo(x - 1, gy - 12);
          c.lineTo(x - 8, gy - 22);
          c.moveTo(x - 1, gy - 14);
          c.lineTo(x + 6, gy - 24);
          c.stroke();
        } else if (pick < 0.7) {
          c.fillStyle = '#5a5044';
          c.beginPath(); c.arc(x, gy, 3 + r() * 3, Math.PI, 0); c.fill();
          c.fillStyle = '#463e34';
          c.fillRect(x, gy - 3, 6, 3);
        } else {
          // war banner
          c.fillStyle = '#3c2c1c';
          c.fillRect(x, gy - 26, 1, 26);
          c.fillStyle = '#6c1e18';
          c.fillRect(x + 1, gy - 26, 9, 7);
          c.fillStyle = '#f2ca58';
          c.fillRect(x + 4, gy - 24, 3, 3);
        }
      }
    }
  }

  return { sky, far, mid, near };
}

// Draw all layers with camera. groundTopY = world y of main ground line.
export function drawBackdrop(ctx, G) {
  const bg = G.backdrop;
  const cam = G.cam;
  const cyMax = Math.max(0, G.level.py - 180);
  const anchor = G.groundY - cyMax;
  const place = (imgCv, f) => {
    const dx = -cam.x * f;
    const dy = anchor - 180 + cam.y * f;
    ctx.drawImage(imgCv, Math.round(dx), Math.round(dy));
  };
  // sky fixed
  const skyOff = -Math.floor((cam.x * 0.05) % 320);
  ctx.drawImage(bg.sky, skyOff, 0);
  ctx.drawImage(bg.sky, skyOff + 320, 0);
  place(bg.far, 0.15);
  place(bg.mid, 0.4);
  // drifting clouds overlay is baked in sky; near layer
  place(bg.near, 0.7);
}
