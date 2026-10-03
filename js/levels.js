// Level data: coordinate-based builder + 3 levels + per-level palettes.
import { T } from './physics.js';

// per-level color palettes (tiles + parallax painters read from these)
export const PALETTES = {
  orchard: {
    time: 'morning',
    skyTop: '#6db8e0', skyMid: '#a8d4e8', skyLow: '#f6dcA0',
    sun: '#fff0c0', sunGlow: 'rgba(255,220,140,0.35)',
    cloud: 'rgba(255,250,240,0.85)',
    duneFar: '#d8b478', duneNear: '#c49c5c',
    mountain: '#b09c74', mountainShade: '#96845e',
    hill: '#c4a862', hillShade: '#a4884a',
    tree: '#6a8c3c', treeShade: '#50702c', trunk: '#6a4a28',
    adobe: '#dcac66', adobeShade: '#aa7c42', adobeLight: '#f0cc8c',
    dome: '#c05848', door: '#5c3a1e',
    dirt: '#c8a060', dirtDark: '#a07840', dirtLight: '#e4c488',
    sandTop: '#ecd49c', sandTopEdge: '#c49c5e',
    brick: '#d4b488', brickDark: '#a48252', brickLight: '#eedaae',
    wood: '#987040', woodDark: '#6a4a28',
    awnA: '#cc4444', awnB: '#f0e6cc', tentA: '#b8483c', tentB: '#eadcb4', spike: '#8a8f98',
  },
  bazaar: {
    time: 'noon',
    skyTop: '#4aa0dc', skyMid: '#8cc8ec', skyLow: '#d0e8f0',
    sun: '#ffffff', sunGlow: 'rgba(255,255,220,0.3)',
    cloud: 'rgba(255,255,255,0.9)',
    duneFar: '#d8bc80', duneNear: '#c8a464',
    mountain: '#c0b088', mountainShade: '#a89870',
    hill: '#ccae68', hillShade: '#ac8e4e',
    tree: '#5e8c34', treeShade: '#466c26', trunk: '#6a4a28',
    adobe: '#e0b070', adobeShade: '#b08248', adobeLight: '#f4d494',
    dome: '#b8483c', door: '#54371c',
    dirt: '#c4a468', dirtDark: '#9c7c44', dirtLight: '#e2c68c',
    sandTop: '#f0dcac', sandTopEdge: '#c8a464',
    brick: '#d8ba90', brickDark: '#a8865a', brickLight: '#f2debc',
    wood: '#a07848', woodDark: '#704e2a',
    awnA: '#2f7a74', awnB: '#f0e6cc', tentA: '#2f7a74', tentB: '#f0e6cc', spike: '#8a8f98',
  },
  gate: {
    time: 'dusk',
    skyTop: '#262450', skyMid: '#5c3c68', skyLow: '#c87848',
    sun: '#f8d888', sunGlow: 'rgba(240,160,90,0.3)',
    cloud: 'rgba(60,50,90,0.7)',
    duneFar: '#5c4860', duneNear: '#4c3c4c',
    mountain: '#3c3654', mountainShade: '#302c46',
    hill: '#585040', hillShade: '#464032',
    tree: '#3c5030', treeShade: '#2c3c24', trunk: '#4a341e',
    adobe: '#8a6c50', adobeShade: '#64503c', adobeLight: '#a8886a',
    dome: '#6c3830', door: '#2e1e10',
    dirt: '#96703e', dirtDark: '#6e5228', dirtLight: '#b48a52',
    sandTop: '#b89058', sandTopEdge: '#8a6a38',
    brick: '#a08a68', brickDark: '#74624a', brickLight: '#c0aa88',
    wood: '#785834', woodDark: '#523a1e',
    awnA: '#6c3830', awnB: '#b8a490', tentA: '#5c2820', tentB: '#96886f', spike: '#b8bcc4',
  },
};

// builder -------------------------------------------------------------
class LevelBuilder {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.tiles = new Uint8Array(w * h);
    this.ents = [];      // {type, x, y} pixels, y = feet
    this.hints = [];     // {x, y, text}
  }
  set(x, y, t) { if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.tiles[y * this.w + x] = t; }
  fill(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); }
  ground(x0, x1, topRow) { this.fill(x0, topRow, x1, this.h - 1, T.DIRT); }
  brick(x0, y0, x1, y1) { this.fill(x0, y0, x1, y1, T.BRICK); }
  plat(x, y, wTiles) { for (let i = 0; i < wTiles; i++) this.set(x + i, y, T.PLATFORM); }
  awn(x, y, wTiles) { for (let i = 0; i < wTiles; i++) this.set(x + i, y, T.AWNING); }
  spikes(x, y, wTiles) { for (let i = 0; i < wTiles; i++) this.set(x + i, y, T.SPIKE); }
  // entity: x tiles, standRow = tile row it stands ON TOP of (feet = standRow*16)
  ent(type, x, standRow, extra = {}) { this.ents.push({ type, x: x * 16 + 8, y: standRow * 16, ...extra }); }
  coinRow(x, y, n) { for (let i = 0; i < n; i++) this.ent('coin', x + i, y); }
  coinArc(x, y, n) { // little arc of n coins peaking at y
    for (let i = 0; i < n; i++) {
      const dy = -Math.round(Math.sin((i + 0.5) / n * Math.PI) * 1.6);
      this.ent('coin', x + i, y + dy);
    }
  }
  hint(x, y, text) { this.hints.push({ x: x * 16, y: y * 16, text }); }
}

export const LEVELS = [
  // ------------------------------------------------------------------
  // LEVEL 1 — THE ORCHARD OUTSKIRTS (morning): a continuous village
  // street. Houses with walkable roofs, market tents, no pits at all.
  // ------------------------------------------------------------------
  {
    name: 'THE ORCHARD OUTSKIRTS',
    chapter: 'CHAPTER I',
    pal: PALETTES.orchard,
    music: 'level1',
    groundRow: 12,
    build() {
      const b = new LevelBuilder(190, 15);
      const tent = (x, w) => b.fill(x, 11, x + w - 1, 11, T.TENT);
      const house = (x, w, h) => {   // solid body + one-way roof you can jump through
        b.brick(x, 12 - h, x + w - 1, 11);
        b.plat(x, 11 - h, w);
      };
      b.ground(0, 189, 12);
      b.ent('spawn', 3, 12);
      b.hint(4, 8, 'MOVE + JUMP');
      b.hint(24, 9, 'X SWORD  C KNIFE');
      b.coinArc(9, 10, 3);
      // market tents
      tent(12, 3);
      b.coinRow(12, 9, 3);
      house(17, 6, 2);
      b.coinRow(18, 8, 3);
      b.ent('bandit', 25, 12);
      house(28, 7, 3);
      b.ent('knife', 30, 8);
      b.coinRow(31, 7, 3);
      b.awn(36, 11, 3);
      tent(39, 3);
      b.ent('bandit', 44, 12);
      b.ent('checkpoint', 48, 12);
      b.ent('thrower', 53, 12);
      house(56, 6, 2);
      b.ent('apricot', 58, 9);
      b.coinRow(57, 8, 3);
      b.awn(63, 10, 3);
      b.coinArc(66, 8, 3);
      b.ent('charger', 71, 12);
      b.spikes(78, 11, 2);
      tent(81, 3);
      house(84, 6, 3);
      b.ent('thrower', 86, 8);
      b.ent('checkpoint', 90, 12);
      b.ent('pot', 94, 12);
      b.ent('bandit', 99, 12);
      b.brick(101, 11, 102, 11);
      house(104, 7, 2);
      b.plat(105, 7, 5);
      b.ent('chest', 107, 7);
      b.coinRow(105, 6, 4);
      b.ent('knife', 104, 9);
      tent(113, 3);
      b.coinRow(116, 10, 3);
      b.ent('thrower', 119, 12);
      b.ent('checkpoint', 123, 12);
      house(126, 10, 2);
      b.ent('bandit', 130, 9);
      b.coinRow(128, 8, 4);
      b.ent('charger', 141, 12);
      b.ent('pot', 145, 12);
      b.ent('apricot', 147, 12);
      house(150, 6, 3);
      b.ent('thrower', 152, 8);
      b.coinRow(150, 7, 3);
      b.awn(158, 11, 3);
      b.ent('bandit', 161, 12);
      house(163, 7, 2);
      b.ent('chest', 166, 9);
      b.coinRow(163, 8, 3);
      b.ent('checkpoint', 171, 12);
      b.ent('bandit', 174, 12);
      // gate quarter: stepped terrace up to the city gate
      b.brick(176, 11, 177, 11);
      b.brick(178, 10, 189, 11);
      b.ent('pot', 181, 10);
      b.coinRow(183, 8, 4);
      b.ent('exit', 186, 10);
      return b;
    },
  },
  // ------------------------------------------------------------------
  // LEVEL 2 — BAZAAR OF THE RED DOMES (noon)
  // ------------------------------------------------------------------
  {
    name: 'BAZAAR OF THE RED DOMES',
    chapter: 'CHAPTER II',
    pal: PALETTES.bazaar,
    music: 'level2',
    groundRow: 13,
    build() {
      const b = new LevelBuilder(210, 17);
      const tent = (x, w) => b.fill(x, 12, x + w - 1, 12, T.TENT);
      b.ground(0, 209, 13);
      // market tents among the stalls
      tent(5, 3);
      b.coinRow(5, 10, 3);
      tent(24, 3);
      // stall awnings near start
      b.awn(9, 10, 3);
      b.awn(15, 9, 3);
      b.awn(22, 10, 3);
      b.coinRow(9, 7, 3);
      b.coinRow(15, 6, 3);
      b.ent('pot', 19, 13);
      b.ent('bandit', 27, 13);
      // brick building w/ rooftop route
      b.brick(33, 11, 40, 12);
      b.plat(33, 10, 8);
      b.ent('thrower', 37, 10);
      b.ent('bandit', 45, 13);
      b.ent('knife', 35, 9);
      b.coinRow(34, 8, 3);
      // caravanserai courtyard: walls & awning climbs (walls 4 tall — jumpable)
      b.awn(48, 11, 2);         // bounce in from outside
      b.brick(52, 9, 53, 12);   // west wall
      b.brick(70, 9, 71, 12);   // east wall
      b.awn(56, 11, 2);
      b.awn(61, 8, 2);
      b.awn(66, 11, 2);
      b.coinArc(58, 6, 3);
      b.coinRow(61, 5, 3);
      b.ent('thrower', 63, 7);
      b.plat(60, 7, 5);
      b.ent('chest', 62, 7);
      b.ent('checkpoint', 74, 13);
      // rooftops village section
      b.plat(80, 10, 4);
      b.plat(86, 8, 4);
      b.plat(92, 10, 4);
      b.ent('bandit', 87, 8);
      b.coinRow(86, 6, 3);
      b.ent('apricot', 93, 8);
      b.ent('bandit', 99, 13);
      b.ent('pot', 103, 13);
      tent(106, 3);
      // BRUTE ARENA (4-tall walls: jump in, or bounce off awnings)
      b.brick(110, 9, 111, 12);
      b.brick(128, 9, 129, 12);
      b.ent('brute', 120, 13);
      b.ent('chest', 125, 13);
      b.ent('knife', 114, 12);
      b.hint(114, 9, 'STRIKE AFTER HIS SWING');
      // upper bazaar route
      b.plat(136, 10, 4);
      b.awn(142, 8, 3);
      b.plat(148, 9, 4);
      b.awn(154, 11, 3);
      b.ent('thrower', 149, 9);
      b.coinRow(142, 5, 3);
      b.coinRow(155, 8, 3);
      b.ent('bandit', 160, 13);
      b.ent('charger', 168, 13);
      b.spikes(172, 12, 3);
      b.coinArc(172, 10, 3);
      b.ent('checkpoint', 180, 13);
      b.ent('thrower', 186, 13);
      b.ent('bandit', 190, 13);
      b.ent('pot', 193, 13);
      b.ent('apricot', 196, 12);
      // exit gate on final rooftop
      b.brick(198, 11, 207, 12);
      b.plat(198, 10, 10);
      b.awn(191, 9, 2);
      b.ent('exit', 204, 10);
      b.coinRow(200, 8, 4);
      return b;
    },
  },
  // ------------------------------------------------------------------
  // LEVEL 3 — PASS OF THE IRON GATE (dusk): a continuous mountain
  // road with fortress towers and the warlord's tent camp. No pits.
  // ------------------------------------------------------------------
  {
    name: 'PASS OF THE IRON GATE',
    chapter: 'CHAPTER III',
    pal: PALETTES.gate,
    music: 'level3',
    groundRow: 12,
    bossLevel: true,
    build() {
      const b = new LevelBuilder(226, 16);
      const tent = (x, w) => b.fill(x, 11, x + w - 1, 11, T.TENT);
      const tower = (x, w, h) => {  // fortress tower with a walkable top
        b.brick(x, 12 - h, x + w - 1, 11);
        b.plat(x, 11 - h, w);
      };
      b.ground(0, 225, 12);
      b.ent('spawn', 2, 12);
      b.ent('checkpoint', 6, 12);
      b.ent('bandit', 15, 12);
      b.ent('knife', 20, 11);
      b.spikes(25, 11, 3);
      b.coinArc(25, 9, 3);
      // watch terrace
      b.brick(28, 11, 36, 11);
      b.ent('thrower', 31, 11);
      b.coinRow(31, 9, 3);
      b.ent('bandit', 42, 12);
      b.ent('charger', 44, 12);
      b.ent('pot', 47, 12);
      tower(50, 4, 3);
      b.coinRow(50, 7, 3);
      b.ent('apricot', 47, 11);
      // caltrop field with a plank bridge over it
      b.spikes(62, 11, 4);
      b.plat(61, 9, 6);
      b.coinArc(62, 7, 4);
      b.ent('checkpoint', 58, 12);
      // the warlord's tent camp
      tent(73, 4);
      b.ent('bandit', 78, 12);
      tent(80, 4);
      b.ent('charger', 85, 12);
      tower(90, 4, 3);
      b.ent('apricot', 91, 8);
      b.ent('checkpoint', 97, 12);
      // terrace brute
      b.brick(100, 11, 108, 11);
      b.ent('brute', 104, 11);
      b.ent('thrower', 115, 12);
      b.spikes(118, 11, 2);
      b.coinArc(118, 9, 2);
      // gate courtyard
      b.brick(124, 9, 125, 11);
      b.brick(131, 9, 132, 11);
      b.ent('bandit', 127, 12);
      b.ent('thrower', 129, 12);
      b.ent('checkpoint', 136, 12);
      // camp gate
      tent(139, 4);
      b.ent('pot', 144, 12);
      tent(145, 4);
      b.brick(153, 11, 160, 11);
      b.ent('bandit', 155, 11);
      b.ent('bandit', 158, 11);
      b.ent('checkpoint', 162, 12);
      b.ent('knife', 163, 11);
      tower(165, 4, 3);
      b.ent('thrower', 166, 8);
      b.ent('charger', 173, 12);
      b.ent('bandit', 177, 12);
      b.ent('bandit', 180, 12);
      b.ent('chest', 183, 12);
      b.hint(177, 8, 'THE WARLORD AWAITS');
      // boss arena
      b.brick(186, 10, 187, 11);
      b.brick(224, 4, 225, 11);
      b.ent('boss', 205, 12);
      return b;
    },
  },
];
