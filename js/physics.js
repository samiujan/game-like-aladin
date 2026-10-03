// Tile-grid physics: sweep AABBs against the level tilemap.
// Tile codes: 0 empty, 1 dirt/sand (solid), 2 brick (solid), 3 wood platform (one-way),
// 4 awning (one-way + bounce), 5 spikes (hazard), 6 tent (solid).

export const T = { EMPTY: 0, DIRT: 1, BRICK: 2, PLATFORM: 3, AWNING: 4, SPIKE: 5, TENT: 6 };
export const TILE = 16;

export function tileAt(G, tx, ty) {
  const lv = G.level;
  if (tx < 0 || tx >= lv.w) return T.DIRT;      // side walls
  if (ty < 0) return T.EMPTY;
  if (ty >= lv.h) return T.EMPTY;
  return lv.tiles[ty * lv.w + tx];
}

export function solidAt(G, tx, ty) {
  const t = tileAt(G, tx, ty);
  return t === T.DIRT || t === T.BRICK || t === T.TENT;
}

function tileSolidFor(t, ent, dy, footY, tx, ty) {
  if (t === T.DIRT || t === T.BRICK || t === T.TENT) return true;
  if (t === T.PLATFORM || t === T.AWNING) {
    // one-way: only when falling onto its top surface
    if (dy <= 0) return false;
    if (ent.dropT > 0) return false;
    const top = ty * TILE;
    return footY <= top + 4;
  }
  return false;
}

// Horizontal movement + resolution.
export function moveX(ent, G) {
  ent.x += ent.vx;
  if (ent.noClip) return;
  const h = ent.h;
  if (ent.vx > 0) {
    const right = ent.x + ent.w;
    const tx = Math.floor((right - 0.01) / TILE);
    const ty0 = Math.floor((ent.y + 1) / TILE);
    const ty1 = Math.floor((ent.y + h - 1) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (solidAt(G, tx, ty)) { ent.x = tx * TILE - ent.w; ent.vx = 0; ent.hitWall = 1; break; }
    }
  } else if (ent.vx < 0) {
    const tx = Math.floor(ent.x / TILE);
    const ty0 = Math.floor((ent.y + 1) / TILE);
    const ty1 = Math.floor((ent.y + h - 1) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (solidAt(G, tx, ty)) { ent.x = (tx + 1) * TILE; ent.vx = 0; ent.hitWall = -1; break; }
    }
  }
}

// Vertical movement + resolution. Sets ent.onGround, ent.groundTile.
export function moveY(ent, G) {
  const prevFoot = ent.y + ent.h;
  ent.y += ent.vy;
  ent.onGround = false;
  ent.groundTile = 0;
  if (ent.noClip) return;
  const w = ent.w;
  if (ent.vy >= 0) {
    const foot = ent.y + ent.h;
    const ty = Math.floor((foot - 0.01) / TILE);
    const tx0 = Math.floor((ent.x + 1) / TILE);
    const tx1 = Math.floor((ent.x + w - 1) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(G, tx, ty);
      if (tileSolidFor(t, ent, ent.vy, prevFoot, tx, ty)) {
        ent.y = ty * TILE - ent.h;
        ent.vy = 0;
        ent.onGround = true;
        ent.groundTile = t;
        break;
      }
    }
  } else {
    const ty = Math.floor(ent.y / TILE);
    const tx0 = Math.floor((ent.x + 1) / TILE);
    const tx1 = Math.floor((ent.x + w - 1) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (solidAt(G, tx, ty)) { ent.y = (ty + 1) * TILE; ent.vy = 0; break; }
    }
  }
}

// True when there is ground just below the leading edge (used for ledge detection).
export function groundAhead(ent, G) {
  const foot = ent.y + ent.h + 2;
  const tx = Math.floor((ent.x + (ent.vx >= 0 ? ent.w + 2 : -2)) / TILE);
  const ty = Math.floor(foot / TILE);
  return solidAt(G, tx, ty);
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function spikeUnderFoot(ent, G) {
  const foot = ent.y + ent.h + 1;
  const ty = Math.floor(foot / TILE);
  const tx0 = Math.floor((ent.x + 2) / TILE);
  const tx1 = Math.floor((ent.x + ent.w - 2) / TILE);
  for (let tx = tx0; tx <= tx1; tx++) {
    if (tileAt(G, tx, ty) === T.SPIKE) return true;
  }
  return false;
}
