// ============================================================
// SILK & STEEL — procedural pixel art
// Sprites are authored as string pixel-maps; each character maps
// to a palette color. bake() renders them to offscreen canvases.
// ============================================================

export const PAL = {
  o: '#231319', // outline
  s: '#ecb98a', S: '#c07f52',            // skin
  h: '#3a2216', H: '#59371f',            // hair
  r: '#46549e', R: '#303d78',            // hero robe (indigo)
  y: '#d2453c', Y: '#97271f',            // sash red
  g: '#f2ca58', G: '#c49a38',            // gold
  w: '#efe6d0', W: '#c6b99c',            // white cloth
  b: '#8a5a30', B: '#5c3a1e',            // leather
  l: '#eaf2f6', L: '#a9beca',            // blade
  d: '#7a5530', D: '#4e3519',            // wood
  f: '#eae3d2', F: '#bdb49e',            // wool/fur white
  m: '#8f3128', M: '#611e17',            // bandit maroon
  v: '#417f3c', V: '#2b5827',            // thrower green
  t: '#2f7a74', T: '#1f534e',            // charger teal
  i: '#9aa0aa', I: '#646a76', K: '#3b3e47', // iron
  k: '#2a2732',                          // cape black
  p: '#c98a54', P: '#9a6136', q: '#7c4a2c', // clay
  x: '#f2a24c', X: '#c96f2a',            // apricot
  e: '#f4f0e8',                          // eye white
  c: '#88b04c', C: '#5e7f33',            // leaf green (tree dots)
  n: '#e8845c',                          // warm light accent
};

// Canvas factory is injectable so dev tooling (node) can rasterize the art too.
let createCanvas = () => document.createElement('canvas');
export function setCanvasFactory(f) { createCanvas = f; }

function bake(map, flip = false) {
  const h = map.length;
  const w = Math.max(...map.map(r => r.length));
  const cv = createCanvas();
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = PAL[ch];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return cv;
}

export function bakeFrames(maps) {
  return maps.map(m => bake(m));
}

// convenience: build a frame from stacked sections (head/torso/legs)
const stack = (...parts) => [].concat(...parts);

// ------------------------------------------------------------
// 3x5 micro pixel font (HUD + titles)
// ------------------------------------------------------------
export const FONT = {
  A: ['111','101','111','101','101'], B: ['110','101','110','101','110'],
  C: ['111','100','100','100','111'], D: ['110','101','101','101','110'],
  E: ['111','100','110','100','111'], F: ['111','100','110','100','100'],
  G: ['111','100','101','101','111'], H: ['101','101','111','101','101'],
  I: ['111','010','010','010','111'], J: ['011','001','001','101','111'],
  K: ['101','110','100','110','101'], L: ['100','100','100','100','111'],
  M: ['101','111','111','101','101'], N: ['101','111','111','111','101'],
  O: ['111','101','101','101','111'], P: ['111','101','111','100','100'],
  Q: ['111','101','101','111','011'], R: ['111','101','111','110','101'],
  S: ['111','100','111','001','111'], T: ['111','010','010','010','010'],
  U: ['101','101','101','101','111'], V: ['101','101','101','101','010'],
  W: ['101','101','111','111','101'], X: ['101','101','010','101','101'],
  Y: ['101','101','010','010','010'], Z: ['111','001','010','100','111'],
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','011','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','001','001','001'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  '.': ['0','0','0','0','1'], ',': ['00','00','00','01','10'],
  '!': ['1','1','1','0','1'], '?': ['111','001','011','000','010'],
  ':': ['0','1','0','1','0'], '-': ['000','000','111','000','000'],
  '+': ['000','010','111','010','000'], '/': ['001','001','010','100','100'],
  "'": ['1','1','0','0','0'], ' ': ['00','00','00','00','00'],
  '&': ['110','110','111','101','111'],
};

export function drawText(ctx, text, x, y, color = '#f2ca58', scale = 1) {
  let cx = x;
  ctx.fillStyle = color;
  for (const chRaw of text.toUpperCase()) {
    const glyph = FONT[chRaw] || FONT['?'];
    const gw = glyph[0].length;
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        if (glyph[gy][gx] === '1') ctx.fillRect(cx + gx * scale, y + gy * scale, scale, scale);
      }
    }
    cx += (gw + 1) * scale;
  }
  return cx - x;
}

export function textWidth(text, scale = 1) {
  let w = 0;
  for (const chRaw of text.toUpperCase()) {
    const glyph = FONT[chRaw] || FONT['?'];
    w += (glyph[0].length + 1) * scale;
  }
  return w - scale;
}

// ------------------------------------------------------------
// HERO — young silk-road swordsman: doppa cap, indigo chapan,
// red sash, throwing knives on the sash.
// ------------------------------------------------------------

const HERO_HEAD = [
  '.....oooooo.....',
  '....odddgggo....',
  '....ohhhhho.....',
  '....ossssSo.....',
  '....ossosSo.....',
  '....ossssSo.....',
  '.....oSSSo......',
  '......oso.......',
];

const HERO_TORSO = [
  '...oorrrroo.....',
  '..orrrrrrrro....',
  '..osrrrrrrso....',
  '..oyyYyyYyyo....',
  '..oyyyyyyyo.....',
  '..orrrrrrRo.....',
  '..oRrrrrRRo.....',
];

const HERO_LEGS_STAND = [
  '...oww.owwo.....',
  '...oww..owwo....',
  '...oWW..oWWo....',
  '...obbo.obbo....',
  '...oBBo.oBBo....',
  '..ooBBoooBBoo...',
];

// 6-frame run cycle (legs only; torso bobs via draw offset)
const HERO_LEGS_RUN = [
  [ // contact
    '...owww.owwo....',
    '...owwo..owwo...',
    '...oWWo...oWWo..',
    '..obbo.....obbo.',
    '..oBBo.....oBBo.',
    '.ooBBoo....oBBoo',
  ],
  [ // recoil
    '...owwwowwo.....',
    '...owwoowwo.....',
    '...oWWooWWo.....',
    '...obboobbo.....',
    '...oBBooBBo.....',
    '..ooBBooBBoo....',
  ],
  [ // push
    '....owwwoWWo....',
    '...owwo.oWWo....',
    '...oWWo..oWWo...',
    '..obbo....obbo..',
    '..oBBo....oBBo..',
    '.ooBBoo...oBBoo.',
  ],
  [ // passing
    '...owww.wwwo....',
    '...oww...owwo...',
    '...oWW...oWWo...',
    '...obbo..obbo...',
    '...oBBo..oBBo...',
    '..ooBBoo.oBBoo..',
  ],
  [ // reach
    '...owwwoWWWo....',
    '...owwo..oWWwo..',
    '...oWWo...oWWo..',
    '..obbo....oBbbo.',
    '..oBBo.....oBBo.',
    '.ooBBoo...ooBBoo',
  ],
  [ // lift
    '...owwwowwo.....',
    '...owwo.owwo....',
    '...oWWo.oWWo....',
    '...obbo.obbo....',
    '...oBBo.oBBo....',
    '..ooBBoo.oBBoo..',
  ],
];

const HERO_JUMP = stack(HERO_HEAD, [
  '...oorrrroo.....',
  '..orrrrrrrro....',
  '..osrrrrrrso....',
  '..oyyYyyYyyo....',
  '.ooyyyyyyyoo....',
  '.orrrrrrrRo.....',
  '.oRrrrrRRo......',
], [
  '.oww..owwo......',
  'owwo...owwo.....',
  'oWWo...oWWo.....',
  'obbo....obbo....',
  'oBBo....oBBo....',
  '.oo.....oo......',
]);

const HERO_FALL = stack(HERO_HEAD, [
  '...oorrrroo.....',
  '..orrrrrrrro....',
  '..osrrrrrrso....',
  '..oyyYyyYyyo....',
  '..oyyyyyyyo.....',
  '.oorrrrrrRoo....',
  '.oRrrrrRRRo.....',
], [
  '.owwo..owwo.....',
  '.owwo..owwo.....',
  '.oWWo..oWWo.....',
  'obbo....obbo....',
  'oBBo....oBBo....',
  'oo......oo......',
]);

const HERO_CROUCH = stack(
  ['.....oooooo.....', '....odddgggo....', '....ohhhhho.....', '....ossssSo.....', '....ossosSo.....', '....ossssSo.....', '.....oSSSo......', '......oso.......'],
  [
    '...oorrrrroo....',
    '..orrrrrrrrro...',
    '..osrryYyyYrso..',
    '..oyyyyyyyyYo...',
    '..orrrrrrrRRo...',
  ],
  [
    '.owwo...owwo....',
    '.oWWo...oWWo....',
    'obbo.....obbo...',
    'oBBo.....oBBo...',
    '.oo.......oo....',
  ]
);

// Slash frames are wider (26) — sword extends in front.
// Blade reads as: outline + silver edge (l) + steel shade (L), gold crossguard (g),
// leather grip (d), held in a skin hand (s) at arm height.
const HERO_SLASH1_A = stack(
  [ // head with raised blade at the right
    '.....oooooo......oo.......',
    '....odddgggo....olo.......',
    '....ohhhhho....olLo.......',
    '....ossssSo....olLo.......',
    '....ossosSo....olLo.......',
    '....ossssSo....olLo.......',
    '.....oSSSo.....olLo.......',
    '......oso......oggo.......',
  ],
  [ // torso: grip + gripping hand reaching forward
    '...oorrrroo.....do........',
    '..orrrrrrrrrso.odo........',
    '..oyyYyyYyyo..............',
    '..oyyyyyyyo...............',
    '..orrrrrrRo...............',
    '..oRrrrrRRo...............',
  ],
  HERO_LEGS_STAND);

const HERO_SLASH1_B = stack(HERO_HEAD, [
  '...oorrrroo....ggollllllo',
  '..orrrrrrrrso.gooLLLLLLLo',
  '..oyyYyyYyyo..odo........',
  '..oyyyyyyyo..............',
  '..orrrrrrRo..............',
  '..oRrrrrRRo..............',
], HERO_LEGS_STAND);

const HERO_SLASH2_A = stack(HERO_HEAD, [
  '...oorrrroo..............',
  '..orrrrrrrrrso...........',
  '..oyyYyyYyyo.ggo.........',
  '..oyyyyyyyo.oddo.........',
  '..orrrrrrRo.olllo........',
  '..oRrrrrRRo..olLo........',
], HERO_LEGS_STAND);

const HERO_SLASH2_B = stack(HERO_HEAD, [
  '...oorrrroo..............',
  '..orrrrrrrrsoggolllllllo.',
  '..oyyYyyYyyo..oLLLLLLLo..',
  '..oyyyyyyyo....odo.......',
  '..orrrrrrRo..............',
  '..oRrrrrRRo..............',
], HERO_LEGS_STAND);

const HERO_SLASH3_A = stack(HERO_HEAD, [
  '...oorrrroo..............',
  '..orrrrrrrrrso...........',
  '..oyyYyyYyyo.............',
  '..oyyyyyyyo.ggo..........',
  '..orrrrrrRo.oddo.........',
  '..oRrrrrRRo..ollLo.......',
], HERO_LEGS_STAND);

// finisher: rising slash — blade sweeps from low-front to high
const HERO_SLASH3_B = stack(HERO_HEAD, [
  '.....oooooo....oollo.....',
  '....odddgggo..olLlo......',
  '....ohhhhho...olLo.......',
  '....ossssSo....olLo......',
  '....ossosSo.....olLo.....',
  '....ossssSo.....olLo.....',
  '.....oSSSo.......olLo....',
  '..oooorrroo......oggo....',
  '.osorrrrrrrsodo..oddo....',
  '.osoyyYyyYyyo............',
  '..ooyyyyyyo..............',
  '..orrrrrrrRo.............',
  '..oRrrrrRRRo.............',
], HERO_LEGS_STAND);

const HERO_THROW_A = stack(HERO_HEAD, [
  '...oorrrroo.....o..o.....',
  '..orrrrrrrro....ddo......',  // arm back-up with knife
  '..osrrrrrrso....olo......',
  '..oyyYyyYyyo.............',
  '..oyyyyyyyo..............',
  '..orrrrrrRo..............',
  '..oRrrrrRRo..............',
], HERO_LEGS_STAND);

const HERO_THROW_B = stack(HERO_HEAD, [
  '...oorrrroo..............',
  '..orrrrrrrrroo...........',
  '..oyrrrrrrrsoddogollo....',  // arm extended forward, knife leaving
  '..oyyYyyYyyo.............',
  '..oyyyyyyyo..............',
  '..orrrrrrRo..............',
  '..oRrrrrRRo..............',
], HERO_LEGS_STAND);

const HERO_HURT = [
  '.....oooooo.....',
  '....odddgggo....',
  '....ohhhhho.....',
  '....oSeSoSo.....',  // grimace
  '....ossosSo.....',
  '....ossssSo.....',
  '.....oSSSo......',
  '..oooorrrooo....',
  '.osorrrrrros....',
  'osoyyYyyYyoso...',
  '.ooyyyyyyyoo....',
  '.orrrrrrrrRo....',
  '.oRrrrrrRRRo....',
  '..owwo...owwo...',
  '.owwo.....owwo..',
  '.oWWo.....oWWo..',
  'obbo.......obbo.',
  'oBBo.......oBBo.',
  'oo...........oo.',
];

const HERO_DEAD = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....oooooo.....',
  '....odddgggo....',
  '..oooSSSSSoooo..',
  '.osoooSSSSossoo.',
  'osyYoyyooyyosso.',
  'orrrrrrrrrrrrso.',
  'oRrrrrrrrrrrrRo.',
  '.oWWoobboobWWo..',
  '..oo.oBBoo.oo...',
  '................',
];

const HERO_CLIMB = stack(HERO_HEAD, [
  '..oorrrrroo.....',
  '.osrrrrrrrro....',
  '.osoyyYyyYso....',
  '..oyyyyyyyo.....',
  '..orrrrrrRo.....',
  '..oRrrrrRRo.....',
], [
  '.owwo..owwo.....',
  '.oWWo..oWWo.....',
  '..obbo.obbo.....',
  '..oBBo.oBBo.....',
  '..oo...oo.......',
]);

export const HERO = {
  idle:  [bake(stack(HERO_HEAD, HERO_TORSO, HERO_LEGS_STAND))],
  run:   HERO_LEGS_RUN.map(l => bake(stack(HERO_HEAD, HERO_TORSO, l))),
  jump:  [bake(HERO_JUMP)],
  fall:  [bake(HERO_FALL)],
  crouch:[bake(HERO_CROUCH)],
  slash1:[bake(HERO_SLASH1_A), bake(HERO_SLASH1_B)],
  slash2:[bake(HERO_SLASH2_A), bake(HERO_SLASH2_B)],
  slash3:[bake(HERO_SLASH3_A), bake(HERO_SLASH3_B)],
  throw: [bake(HERO_THROW_A), bake(HERO_THROW_B)],
  hurt:  [bake(HERO_HURT)],
  dead:  [bake(HERO_DEAD)],
  climb: [bake(HERO_CLIMB)],
};

// ------------------------------------------------------------
// BANDIT — maroon robe, fur papak, beard, scimitar
// ------------------------------------------------------------
const BANDIT_HEAD = [
  '....oooooo......',
  '...offffffo.....',
  '...ofFFFFfo.....',
  '...omsssSo......',
  '...omsosSo......',
  '...oMsSsSo......',
  '....oMMMo.......',
  '.....oso........',
];

const BANDIT_TORSO = [
  '...oommmroo.....',
  '..ommmmmmrro....',
  '..osmmmmmrso....',
  '..oyyYmmmyyo....',
  '..oyyYyyyYyo....',
  '..ommmmmrMo.....',
  '..oMmmmmMMo.....',
];

const BANDIT_LEGS = [
  [ '...omm.omm......', '...oMM.oMMo.....', '...obb.oBBo.....', '..ooBBo.oBBoo...' ],
  [ '...omwoomm......', '...oMMooMMo.....', '...obboobBo.....', '..ooBBooBBoo....' ],
  [ '...ommo.wwo.....', '...oMMo.oWWo....', '...oBBo..obbo...', '..oBBoo..oBBoo..' ],
  [ '...owwoomm......', '...oWWooMMo.....', '...obbooBBo.....', '..oBBoooBBoo....' ],
];

const BANDIT_WALK = BANDIT_LEGS.map(l => bake(stack(BANDIT_HEAD, BANDIT_TORSO, l)));

const BANDIT_WINDUP = stack(BANDIT_HEAD, [
  '...oommmroo..oo.',
  '..ommmmmmrroollo',
  '..osmmmmmrsoddlo',
  '..oyyYmmmyyo.llo',
  '..oyyYyyyYyo.oo.',
  '..ommmmmrMo.....',
  '..oMmmmmMMo.....',
], BANDIT_LEGS[0]);

const BANDIT_SLASH = stack(BANDIT_HEAD, [
  '...oommmroo.....',
  '..ommmmmmrro....',
  '..osmmmmmrssoso.',
  '..oyyYmmmyyoollo',
  '..oyyYyyyYyo.llo',
  '..ommmmmrMo..olo',
  '..oMmmmmMMo.....',
], BANDIT_LEGS[2]);

const BANDIT_GUARD = stack(BANDIT_HEAD, [
  '...oommmroo.....',
  '..ommmmmmmmmo...',
  '..osmmmmlmmso...',
  '..oyyYmlLlmyo...',
  '..oyyYolLLlyo...',
  '..ommmollloMo...',
  '..oMmmmoMMo.....',
], BANDIT_LEGS[1]);

export const BANDIT = {
  walk: BANDIT_WALK,
  windup: [bake(BANDIT_WINDUP)],
  slash: [bake(BANDIT_SLASH)],
  guard: [bake(BANDIT_GUARD)],
};

// ------------------------------------------------------------
// KNIFE THROWER — green robe, head wrap, sly
// ------------------------------------------------------------
const THROW_HEAD = [
  '....oooooo......',
  '...ovvvvvvo.....',
  '...ovvvvvvo.....',
  '...ovsssSo......',
  '...ovsosSo......',
  '...oVsssSo......',
  '....oSSSo.......',
  '.....oso........',
];

const THROW_TORSO = [
  '...oovvvvoo.....',
  '..ovvvvvvvvo....',
  '..osvvvvvvso....',
  '..owwWwwWwwo....',
  '..owwWwwwWwo....',
  '..ovvvvvvVo.....',
  '..oVvvvvVVo.....',
];

const THROW_LEGS_A = ['...ovv.ovv......', '...oVV.oVVo.....', '...odd.oddo.....', '..ooDDo.oDDoo...'];
const THROW_LEGS_B = ['...ovvoovvo.....', '...oVVooVVo.....', '...oddooddo.....', '..ooDDooDDoo....'];

const THROW_WINDUP = stack(THROW_HEAD, [
  '...oovvvvoo..o..',
  '..ovvvvvvvvoPllo',
  '..osvvvvvvsodlo.',
  '..owwWwwWwwo.l..',
  '..owwWwwwWwo....',
  '..ovvvvvvVo.....',
  '..oVvvvvVVo.....',
], THROW_LEGS_A);

const THROW_THROW = stack(THROW_HEAD, [
  '...oovvvvoo.....',
  '..ovvvvvvvvo....',
  '..osvvvvvvssoso.',
  '..owwWwwWwwoo...',
  '..owwWwwwWwo....',
  '..ovvvvvvVo.....',
  '..oVvvvvVVo.....',
], THROW_LEGS_B);

export const THROWER = {
  walk: [bake(stack(THROW_HEAD, THROW_TORSO, THROW_LEGS_A)), bake(stack(THROW_HEAD, THROW_TORSO, THROW_LEGS_B))],
  windup: [bake(THROW_WINDUP)],
  thrown: [bake(THROW_THROW)],
};

// ------------------------------------------------------------
// SPEAR CHARGER — lean rider-less sentry, long spear
// ------------------------------------------------------------
const CHG_HEAD = [
  '....ooooo.......',
  '...ottttto......',
  '...otTTTto......',
  '...otsssSo......',
  '...otsosSo......',
  '...oTsssSo......',
  '....oSSSo.......',
  '.....oso........',
];

const CHG_TORSO = [
  '...ootttto......',
  '..otttttttto....',
  '..osttttttso....',
  '..oyyYyyYyyo....',
  '..oyyyyyyyo.....',
  '..ottttttTo.....',
  '..oTttttTTo.....',
];

const CHG_WALK_A = stack(CHG_HEAD, CHG_TORSO, [
  '...ott.ott......', '...oTT.oTTo.....', '...obb.oBBo.....', '..ooBBo.oBBoo...',
]);
const CHG_WALK_B = stack(CHG_HEAD, CHG_TORSO, [
  '...ottoott......', '...oTTooTTo.....', '...obboobBo.....', '..oBBoooBBoo....',
]);

const CHG_TELEGRAPH = stack(CHG_HEAD, [
  '...ootttto......',
  '..otttttttto.dd.',
  '..osttttttsoddlo',
  '..oyyYyyYyyodlo.',
  '..oyyyyyyyo.dlo.',
  '..ottttttTo..l..',
  '..oTttttTTo.....',
], CHG_WALK_B.slice(15));

const CHG_CHARGE = stack(CHG_HEAD, [
  '...ootttto......',
  '..ottttttttodd..',
  '..osttttttsollo.',
  '..oyyYyyYyyodlo.',
  '..oyyyyyyyodllo.',
  '..ottttttTo.llo.',
  '..oTttttTTo.ol..',
], [
  '..otto.otto.....',
  '..oTTo...oTTo...',
  '..obbo....obbo..',
  '.oBBoo....oBBoo.',
]);

export const CHARGER = {
  walk: [bake(CHG_WALK_A), bake(CHG_WALK_B)],
  telegraph: [bake(CHG_TELEGRAPH)],
  charge: [bake(CHG_CHARGE)],
};

// ------------------------------------------------------------
// BRUTE — big caravan guard, iron helm, club
// ------------------------------------------------------------
const BRUTE_HEAD = [
  '.....oooooo.....',
  '....oiiiiiio....',
  '....oiIIIIio....',
  '....ossssSo.....',
  '....ossosSo.....',
  '....oSSSSSo.....',
  '.....oSSSo......',
];

const BRUTE_TORSO = [
  '..oorrrBBBbbo...',
  '.obbrBBBbbbbbo..',
  '.obbrBBBbbbbbo..',
  '.obbobbBbbobbo..',
  '.oyyoyyYyyoyyo..',
  '.oyyoyyYyyoyyo..',
  '.oBBooooooooBBo.',
];

const BRUTE_LEGS = [
  ['..oBBBo.oBBBo...', '..oKKKo.oKKKo...', '.ooKKKoo.oKKKoo.'],
  ['..oBBBooBBBo....', '..oKKKooKKKo....', '.ooKKKooKKKoo...'],
];

const BRUTE_WINDUP = stack(BRUTE_HEAD, [
  '..oorrrBBBbbo.D.',
  '.obbrBBBbbbbodDo',
  '.obbrBBBbbbbodd.',
  '.obbobbBbbobo...',
  '.oyyoyyYyyoyyo..',
  '.oyyoyyYyyoyyo..',
  '.oBBooooooooBBo.',
], BRUTE_LEGS[0]);

const BRUTE_SLAM = stack(BRUTE_HEAD, [
  '..oorrrBBBbbo...',
  '.obbrBBBbbbbbo..',
  '.obbrBBBbbbbbboD',
  '.obbobbBbboboddD',
  '.oyyoyyYyyoyyoD.',
  '.oyyoyyYyyoyyo..',
  '.oBBooooooooBBo.',
], BRUTE_LEGS[1]);

export const BRUTE = {
  walk: [
    bake(stack(BRUTE_HEAD, BRUTE_TORSO, BRUTE_LEGS[0])),
    bake(stack(BRUTE_HEAD, BRUTE_TORSO, BRUTE_LEGS[1])),
  ],
  windup: [bake(BRUTE_WINDUP)],
  slam: [bake(BRUTE_SLAM)],
};

// ------------------------------------------------------------
// BOSS — THE WARLORD OF THE IRON GATE. Tall iron warlord,
// horned helm, black cape, great curved sword.
// 28 wide x 34 tall
// ------------------------------------------------------------
const BOSS_HEAD = [
  '..o..........o...',
  '.oIo........oIo..',
  '.oIIo......oIIo..',
  '..oIIo....oIIo...',
  '...oKoooooooKo...',
  '...oKKKKKKKKo....',
  '...oKsssssKo.....',
  '...oKsosssKo.....',
  '...oKssssKKo.....',
  '....oKKKKKo......',
  '.....ooooo.......',
];

const BOSS_TORSO = [
  '...okoiKKKiko....',
  '..okkiKKKKKiko...',
  '..okkoiKKKiko....',
  '..okkoigggiko....',
  '.okkoiyyyyiko....',
  '.okkoiyYyYiko....',
  '.okkoiyyyyiko....',
  '.okkoiKKKKiko....',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
];

const BOSS_LEGS = [
  ['...oKKKo.oKKKo....', '...oKKKo.oKKKo....', '...oIIIo.oIIIo....', '..oIIIIo.oIIIIo...', '..ooooo...ooooo...'],
  ['...oKKKoKKKo......', '...oKKKoKKKo......', '...oIIIoIIIo......', '..oIIIIIKIIo......', '...ooooooooo......'],
];

const BOSS_IDLE = stack(BOSS_HEAD, BOSS_TORSO, BOSS_LEGS[0]);

const BOSS_WINDUP = stack(BOSS_HEAD, [
  '...okoiKKKiko....',
  '..okkiKKKKKiko.DD',
  '..okkoiKKKikoddLL',
  '..okkoigggikodLLo',
  '.okkoiyyyyikoLLo.',
  '.okkoiyYyYikoLo..',
  '.okkoiyyyyiko....',
  '.okkoiKKKKiko....',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
], BOSS_LEGS[0]);

const BOSS_LUNGE = stack(BOSS_HEAD, [
  '...okoiKKKiko....',
  '..okkiKKKKKiko...',
  '..okkoiKKKikodd..',
  '..okkoigggikolllo',
  '.okkoiyyyyikoLLL.',
  '.okkoiyYyYikollL.',
  '.okkoiyyyyiko.l..',
  '.okkoiKKKKiko....',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
], [
  '..oKKKo..oKKKo...',
  '.oKKKoo...oKKKo..',
  '.oIIIo.....oIIIo.',
  'oIIIIo......oIIo.',
  'ooooo........ooo.',
]);

const BOSS_SLAM_A = stack(BOSS_HEAD, [
  '...okoiKKKiko.DD.',
  '..okkiKKKKKikodLL',
  '..okkoiKKKikodLLo',
  '..okkoigggikoLLo.',
  '.okkoiyyyyikoLo..',
  '.okkoiyYyYiko....',
  '.okkoiyyyyiko....',
  '.okkoiKKKKiko....',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
], BOSS_LEGS[0]);

const BOSS_SLAM_B = stack(BOSS_HEAD, [
  '...okoiKKKiko....',
  '..okkiKKKKKiko...',
  '..okkoiKKKiko....',
  '..okkoigggiko....',
  '.okkoiyyyyiko.DD.',
  '.okkoiyYyYikodLLo',
  '.okkoiyyyyikoLLo.',
  '.okkoiKKKKikodDo.',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
], BOSS_LEGS[1]);

const BOSS_VOLLEY = stack(BOSS_HEAD, [
  '...okoiKKKiko....',
  '..okkiKKKKKikoo..',
  '..okkoiKKKikoppo.',
  '..okkoigggikopo..',
  '.okkoiyyyyiko....',
  '.okkoiyYyYiko....',
  '.okkoiyyyyiko....',
  '.okkoiKKKKiko....',
  '.okkoiIKKIiko....',
  '..oooiIKKIioo....',
], BOSS_LEGS[0]);

const BOSS_STAGGER = [
  '..................',
  '.oIo........oIo...',
  '.oIIo......oIIo...',
  '..oIIo....oIIo....',
  '...oKooooooKo.....',
  '..oKKKKKKKKKo.....',
  '..oKeSsesKSo......',
  '..oKseSsesKo......',
  '..oKssssKKo.......',
  '...oKKKKKo........',
  '..ooiKKKikoo......',
  '.oikKKKKKKKio.....',
  '.okiKKKKKKiko.....',
  '..oiyyyyyyiko.....',
  '.oiyYyYyYyyiko....',
  '.oiyyyyyyyyiko....',
  '.oiKKKKKKKKiko....',
  '.oiIKKIIKKIiko....',
  '..ooiIKKIioo......',
  '...oKKKo.oKKKo....',
  '...oKKKo..oKKKo...',
  '..oIIIo....oIIIo..',
  '.oIIIIo.....oIIIo.',
  '.oooo.........ooo.',
];

export const BOSS = {
  idle: [bake(BOSS_IDLE)],
  walk: [bake(stack(BOSS_HEAD, BOSS_TORSO, BOSS_LEGS[0])), bake(stack(BOSS_HEAD, BOSS_TORSO, BOSS_LEGS[1]))],
  windup: [bake(BOSS_WINDUP)],
  lunge: [bake(BOSS_LUNGE)],
  slamA: [bake(BOSS_SLAM_A)],
  slamB: [bake(BOSS_SLAM_B)],
  volley: [bake(BOSS_VOLLEY)],
  stagger: [bake(BOSS_STAGGER)],
};

// ------------------------------------------------------------
// Props & pickups
// ------------------------------------------------------------

// faceted ruby gems (Aladdin-style pickup): white facet + dark base + twinkle
const COIN_A = ['..oooo..', '.oyeeo..', 'oyeeYYo.', 'oyyyYYo.', 'oyYYYYo.', '.oYYYYo.', '..oooo..'];
const COIN_B = ['..oooo..', '.oyyyo..', 'oyyyeYo.', 'oyyyeYo.', 'oyYYYYo.', '.oYYYYo.', '..oooo..'];
const COIN_C = ['..oooo..', '.oyyyo..', 'oyyyyYo.', 'oyyeYYo.', 'oyeYYYo.', '.oYYYYo.', '..oooo..'];

export const COIN = [bake(COIN_A), bake(COIN_B), bake(COIN_C), bake(COIN_B)];

// tiny hero face for the lives display
const HERO_FACE_MAP = [
  '..oooo..',
  '.oddggo.',
  '.ohhhho.',
  '.osssso.',
  '.ossoso.',
  '.osssSo.',
  '..oSSo..',
  '...oo...',
];
export const HERO_FACE = [bake(HERO_FACE_MAP)];

const APRICOT = [
  '...oo....',
  '..oxo....',
  '.oxxxo...',
  'oxxxxxco.',
  'oXxxxxco.',
  'oXxxxxXo.',
  '.oXXXXo..',
  '..oooo...',
];

const KNIFE_PICKUP = [
  '..........',
  '.o......o..',
  'ollooplllo',
  'ollo.opllo',
  'oddo..oddo',
  '.oo....oo..',
];

const CHEST = [
  '...oooooooo...',
  '..oddddddddo..',
  '.odDddddddDdo.',
  '.odddddddddo..',
  '.oDdddddddDo..',
  '.oddddggdddo..',
  '.oddddggdddo..',
  '.oDdddddddDo..',
  '.odddddddddo..',
  '.oDDDDDDDDDo..',
  '..oooooooooo..',
];

const CHEST_OPEN = [
  '..oooooooo....',
  '.oDDDDDDDDo...',
  '.oddddddddo...',
  '.oDDDDDDDDo...',
  '...oooooo.....',
  '..odddddddo...',
  '.oddddggddo...',
  '.oddddggddo...',
  '.oDddddddDo...',
  '.oDDDDDDDDo...',
  '..oooooooo....',
];

const POT = [
  '...oooo..',
  '..oddo...',
  '.oppppqo.',
  'opPpppPqo',
  'opPqqqqqo',
  'opPqppqqo',
  '.oPqqqqo.',
  '..ooooo..',
];

const CHECKPOINT = [
  '....oyyyyo.....',
  '...oyyYyyyo....',
  '...oyyYyyyo....',
  '...oyyyyyyo....',
  '...oyyyyyyo....',
  '...ooyyyoo.....',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '...oddddo......',
  '..oddddddo.....',
];

const CHECKPOINT2 = [
  '..oyyyyyo......',
  '..oyyYyyyo.....',
  '..oyyYyyyoyo...',
  '..oyyyyyoyyyo..',
  '..oyyyyyoyyyo..',
  '..ooyyyooyyo...',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '....oddo.......',
  '...oddddo......',
  '..oddddddo.....',
];

const HEART = ['.oo.oo..', 'oyyoyyo.', 'oyyyyyyo', 'oyyyyyyo', '.oyyyyo.', '..oyyo..', '...oo...'];
const HEART_EMPTY = ['.oo.oo..', 'oWWoWWo.', 'oWwwWWo.', 'oWWWWWo.', '.oWWWo..', '..oWo...', '...oo...'];
const KNIFE_ICON = ['..o..', '.ollo', 'opllo', 'oddo.', '.oo..'];

const KNIFE_FLY = [
  '.......ooo..',
  '.ddogglllllo',
  '..ddogLLLLo.',
  '.......ooo..',
];

export const PROPS = {
  coin: COIN.map(c => c),
  apricot: [bake(APRICOT)],
  knifePickup: [bake(KNIFE_PICKUP)],
  chest: [bake(CHEST)],
  chestOpen: [bake(CHEST_OPEN)],
  pot: [bake(POT)],
  checkpoint: [bake(CHECKPOINT), bake(CHECKPOINT2)],
  heart: [bake(HEART)],
  heartEmpty: [bake(HEART_EMPTY)],
  knifeIcon: [bake(KNIFE_ICON)],
};

export const FX = {
  coin: [bake(COIN_A), bake(COIN_B), bake(COIN_C), bake(COIN_B)],
  knife: [bake(KNIFE_FLY)],
};

// slash motion arcs (baked pixel crescents, drawn over the swing)
function bakeSwipeFwd() {
  const c = createCanvas(); c.width = 20; c.height = 22;
  const g = c.getContext('2d');
  const cx = 2, cy = 11;
  for (let a = -1.05; a <= 1.05; a += 0.075) {
    for (let r = 9; r <= 15; r++) {
      const px = Math.round(cx + Math.cos(a) * r);
      const py = Math.round(cy + Math.sin(a) * r);
      if (px < 0 || py < 0 || px >= 20 || py >= 22) continue;
      g.globalAlpha = r >= 14 ? 0.95 : r >= 12 ? 0.6 : 0.35;
      g.fillStyle = r >= 14 ? '#ffffff' : r >= 12 ? '#f6e8b0' : '#e8c88a';
      g.fillRect(px, py, 1, 1);
    }
  }
  g.globalAlpha = 1;
  return c;
}
function bakeSwipeUp() {
  const c = createCanvas(); c.width = 24; c.height = 18;
  const g = c.getContext('2d');
  const cx = 12, cy = 17;
  for (let a = -2.75; a <= -0.45; a += 0.075) {
    for (let r = 9; r <= 15; r++) {
      const px = Math.round(cx + Math.cos(a) * r);
      const py = Math.round(cy + Math.sin(a) * r);
      if (px < 0 || py < 0 || px >= 24 || py >= 18) continue;
      g.globalAlpha = r >= 14 ? 0.95 : r >= 12 ? 0.6 : 0.35;
      g.fillStyle = r >= 14 ? '#ffffff' : r >= 12 ? '#f6e8b0' : '#e8c88a';
      g.fillRect(px, py, 1, 1);
    }
  }
  g.globalAlpha = 1;
  return c;
}
export const SWIPES = { fwd: bakeSwipeFwd(), up: bakeSwipeUp() };

// ------------------------------------------------------------
// Tiles — painted procedurally (deterministic) rather than maps,
// with per-level palettes. Returns a 16x16 canvas per tile type.
// ------------------------------------------------------------

// tiny deterministic RNG so tiles look identical every boot
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTileSet(levelPal) {
  const { dirt, dirtDark, dirtLight, sandTop, sandTopEdge, brick, brickDark, brickLight, wood, woodDark, awnA, awnB, spike } = levelPal;
  const mk = (draw) => {
    const cv = createCanvas();
    cv.width = 16; cv.height = 16;
    draw(cv.getContext('2d'));
    return cv;
  };

  // sand below the surface: soft ripples + speckle
  const sandRaw = mk((c) => {
    c.fillStyle = dirt; c.fillRect(0, 0, 16, 16);
    const rnd = mulberry(7);
    c.fillStyle = dirtDark;
    for (let i = 0; i < 10; i++) {
      const x = (rnd() * 14) | 0, y = (rnd() * 15) | 0;
      c.fillRect(x, y, 2 + (rnd() * 2 | 0), 1); // ripple dashes
    }
    c.fillStyle = dirtLight;
    for (let i = 0; i < 6; i++) c.fillRect((rnd() * 15) | 0, (rnd() * 15) | 0, 1, 1);
  });

  // walking surface: packed sand, slightly lighter, wind-swept
  const sandTopTile = mk((c) => {
    c.drawImage(sandRaw, 0, 0);
    c.fillStyle = sandTop; c.fillRect(0, 0, 16, 3);
    c.fillStyle = sandTopEdge; c.fillRect(0, 3, 16, 1);
    const rnd = mulberry(11);
    for (let i = 0; i < 5; i++) {
      const x = (rnd() * 14) | 0;
      c.fillStyle = sandTopEdge; c.fillRect(x, 1, 2, 1);
      c.fillStyle = sandTop; c.fillRect(x + 1, 0, 2, 1);
    }
  });

  // rounded sandstone block — hand-carved look
  function block(c, x, y, w, h) {
    c.fillStyle = brick; c.fillRect(x, y, w, h);
    c.fillStyle = brickLight;               // top + left bevel
    c.fillRect(x + 1, y, w - 2, 1);
    c.fillRect(x, y + 1, 1, h - 2);
    c.fillStyle = brickDark;                // bottom + right shade
    c.fillRect(x + 1, y + h - 1, w - 2, 1);
    c.fillRect(x + w - 1, y + 1, 1, h - 2);
    // rounded corners: knock out with mortar color
    c.fillRect(x, y, 1, 1); c.fillRect(x + w - 1, y, 1, 1);
    c.fillRect(x, y + h - 1, 1, 1); c.fillRect(x + w - 1, y + h - 1, 1, 1);
  }
  const mortar = (c) => { c.fillStyle = brickDark; c.fillRect(0, 0, 16, 16); };

  function stoneTileA() {
    return mk((c) => {
      mortar(c);
      block(c, 1, 1, 6, 5); block(c, 9, 1, 6, 5);
      block(c, 1, 8, 3, 6); block(c, 6, 8, 6, 6); block(c, 14, 8, 2, 6);
      c.fillStyle = brickLight;
      c.fillRect(3, 3, 1, 1); c.fillRect(11, 10, 1, 1); // glints
    });
  }
  function stoneTileB() {
    return mk((c) => {
      mortar(c);
      block(c, 1, 1, 13, 5); block(c, 15, 1, 1, 5);
      block(c, 1, 8, 8, 6); block(c, 11, 8, 4, 6);
      c.fillStyle = brickLight;
      c.fillRect(6, 2, 1, 1); c.fillRect(3, 10, 1, 1);
    });
  }

  const woodTile = mk((c) => {
    c.fillStyle = wood; c.fillRect(0, 0, 16, 16);
    c.fillStyle = woodDark;
    c.fillRect(0, 0, 16, 2);
    c.fillRect(0, 13, 16, 3);
    c.fillRect(4, 2, 1, 11); c.fillRect(11, 2, 1, 11);
    c.fillStyle = wood;
    c.fillRect(5, 0, 1, 2); c.fillRect(12, 0, 1, 2);
  });

  const awningTile = mk((c) => {
    for (let x = 0; x < 16; x += 8) {
      c.fillStyle = awnA; c.fillRect(x, 0, 4, 12);
      c.fillStyle = awnB; c.fillRect(x + 4, 0, 4, 12);
    }
    c.fillStyle = awnA; c.fillRect(0, 12, 4, 2); c.fillStyle = awnB; c.fillRect(4, 12, 4, 2);
    c.fillStyle = awnA; c.fillRect(8, 12, 4, 2); c.fillStyle = awnB; c.fillRect(12, 12, 4, 2);
  });

  const spikeTile = mk((c) => {
    c.fillStyle = spike;
    for (let i = 0; i < 4; i++) {
      const bx = i * 4;
      c.fillRect(bx + 1, 10, 2, 6);
      c.fillRect(bx + 1, 7, 2, 3);
      c.fillRect(bx + 1, 5, 2, 2);
      c.fillRect(bx + 2, 4, 1, 1);
    }
    c.fillStyle = '#eaf2f6';
    for (let i = 0; i < 4; i++) c.fillRect(i * 4 + 2, 5, 1, 2);
  });

  // striped market tent (solid) — domed so tent runs read as a row of tents
  const tentA = levelPal.tentA, tentB = levelPal.tentB;
  const tentTile = mk((c) => {
    for (let y = 0; y < 16; y++) {
      let x0, x1;
      if (y === 0) { x0 = 6; x1 = 10; }
      else if (y === 1) { x0 = 5; x1 = 11; }
      else if (y === 2) { x0 = 4; x1 = 12; }
      else if (y < 5) { x0 = 3; x1 = 13; }
      else { x0 = 2; x1 = 14; }
      for (let x = x0; x < x1; x++) {
        c.fillStyle = ((x >> 2) % 2) ? tentA : tentB;
        c.fillRect(x, y, 1, 1);
      }
    }
    c.fillStyle = tentA; c.fillRect(7, 0, 2, 2);
    c.fillStyle = 'rgba(35,19,25,0.3)';
    c.fillRect(2, 14, 12, 2);
  });

  return {
    [1]: sandTopTile,
    [2]: stoneTileA(),
    [3]: woodTile,
    [4]: awningTile,
    [5]: spikeTile,
    [6]: tentTile,
    dirtRaw: sandRaw,
    stoneB: stoneTileB(),
  };
}

// draw the world tiles (sand auto-selects wind-blown top when exposed to air)
export function drawTiles(ctx, G) {
  const ts = G.tileset;
  const x0 = Math.max(0, Math.floor(G.cam.x / 16) - 1);
  const x1 = Math.min(G.level.w - 1, Math.ceil((G.cam.x + 320) / 16) + 1);
  const y0 = Math.max(0, Math.floor(G.cam.y / 16) - 1);
  const y1 = Math.min(G.level.h - 1, Math.ceil((G.cam.y + 180) / 16) + 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = G.level.tiles[ty * G.level.w + tx];
      if (!t) continue;
      let img = ts[t];
      if (t === 1) {
        const above = ty > 0 ? G.level.tiles[(ty - 1) * G.level.w + tx] : 0;
        if (above === 1 || above === 2) img = ts.dirtRaw;
      } else if (t === 2) {
        img = ((tx + ty) & 1) ? ts.stoneB : img;
      }
      if (img) ctx.drawImage(img, tx * 16, ty * 16);
      // wooden support posts under awning ends (until ground or another tile)
      if (t === 4) {
        const leftT = tx > 0 ? G.level.tiles[ty * G.level.w + tx - 1] : 0;
        const rightT = tx < G.level.w - 1 ? G.level.tiles[ty * G.level.w + tx + 1] : 0;
        let drop = 0;
        while (drop < 3) {
          const below = ty + 1 + drop < G.level.h ? G.level.tiles[(ty + 1 + drop) * G.level.w + tx] : 1;
          if (below) break;
          drop++;
        }
        const h = drop * 16 + 6;
        ctx.fillStyle = '#5c3a1e';
        if (leftT !== 4) ctx.fillRect(tx * 16 + 3, ty * 16 + 13, 2, h);
        if (rightT !== 4) ctx.fillRect(tx * 16 + 11, ty * 16 + 13, 2, h);
      }
    }
  }
}

// flip-aware sprite draw, anchored at feet-center
export function drawSprite(ctx, img, x, y, flip, flash = 0) {
  const w = img.width, h = img.height;
  const dx = Math.round(x - w / 2), dy = Math.round(y - h);
  if (flash > 0) {
    // white silhouette flash
    ctx.drawImage(flashCanvas(img), dx, dy);
    return;
  }
  if (flip) {
    ctx.save();
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(img, dx, dy);
  }
}

// tinted copy (cached per canvas)
const flashCache = new WeakMap();
function flashCanvas(img) {
  let c = flashCache.get(img);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cc = c.getContext('2d');
    cc.drawImage(img, 0, 0);
    cc.globalCompositeOperation = 'source-in';
    cc.fillStyle = '#ffffff';
    cc.fillRect(0, 0, c.width, c.height);
    flashCache.set(img, c);
  }
  return c;
}
