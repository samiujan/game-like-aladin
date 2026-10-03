// SILK & STEEL — main: game states, level loading, HUD, fixed-timestep loop.

import { Input } from './input.js';
import { Camera } from './camera.js';
import { T, TILE } from './physics.js';
import { HERO, PROPS, FX, BANDIT, THROWER, CHARGER, BRUTE, BOSS, SWIPES, HERO_FACE, makeTileSet, drawTiles, drawText, textWidth, drawSprite } from './sprites.js';
import { LEVELS, PALETTES } from './levels.js';
import { Player } from './player.js';
import { Enemy, Bandit, Thrower, Charger, Brute } from './enemies.js';
import { Boss, updateShocks, drawShocks } from './boss.js';
import { Knife } from './projectiles.js';
import { Pickup } from './pickups.js';
import { Particles } from './particles.js';
import { buildBackdrop, drawBackdrop } from './art_bg.js';
import { AudioSys } from './audio.js';

const VIEW_W = 320, VIEW_H = 180;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// integer scale to fit window
function fit() {
  const s = Math.max(1, Math.min(Math.floor(window.innerWidth / VIEW_W), Math.floor((window.innerHeight - 40) / VIEW_H)));
  canvas.style.width = VIEW_W * s + 'px';
  canvas.style.height = VIEW_H * s + 'px';
}
window.addEventListener('resize', fit);
fit();

// ---- game state ----
const game = {
  state: 'title',
  levelIndex: 0,
  lives: 3,
  score: 0,
  gems: 0,
  hitStopT: 0,
  paused: false,
  stateT: 0,
  checkpoint: null,
  toast: null,          // {text, t} — brief on-screen indicator
};
game.showToast = (text) => { game.toast = { text, t: 0 }; };

const G = {
  frame: 0,
  level: null, tiles: null, w: 0, h: 0, px: 0, py: 0,
  groundY: 0,
  player: null,
  enemies: [], shots: [], pickups: [], parts: new Particles(), shocks: [],
  boss: null,
  cam: new Camera(),
  tileset: null,
  backdrop: null,
  hints: [],
  checkpoint: null,
  HERO,
  sprites: {
    Coin: FX.coin, CoinFly: FX.coin, Knife: FX.knife[0],
    Apricot: PROPS.apricot[0],
    KnifePickup: PROPS.knifePickup[0],
    Chest: PROPS.chest[0], ChestOpen: PROPS.chestOpen[0],
    Pot: PROPS.pot[0],
    Checkpoint: PROPS.checkpoint,
    Heart: PROPS.heart[0], HeartEmpty: PROPS.heartEmpty[0],
    KnifeIcon: PROPS.knifeIcon[0],
    HeroFace: HERO_FACE[0],
    SwipeFwd: SWIPES.fwd, SwipeUp: SWIPES.up,
    BANDIT, THROWER, CHARGER, BRUTE, BOSS,
  },
  drawText,
  audio: new AudioSys(),
  input: null,
  game,
};

const input = new Input();
G.input = input;

// ---- level loading ----
function loadLevel(i, keepCheckpoint = true) {
  const def = LEVELS[i];
  const b = def.build();
  G.level = def;
  G.tiles = b.tiles;
  G.w = b.w; G.h = b.h;
  G.px = b.w * TILE; G.py = b.h * TILE;
  G.level = { ...def, tiles: b.tiles, w: b.w, h: b.h, px: G.px, py: G.py };
  G.groundY = def.groundRow * TILE;
  G.tileset = makeTileSet(def.pal);
  G.backdrop = buildBackdrop(G.level, def.pal);
  G.enemies = []; G.shots = []; G.pickups = []; G.shocks = [];
  G.parts.clear();
  G.boss = null;
  G.hints = b.hints;
  G.checkpoint = (keepCheckpoint && game.checkpoint) ? game.checkpoint : null;

  let spawn = { x: 40, y: 170 };
  for (const e of b.ents) {
    switch (e.type) {
      case 'spawn': spawn = { x: e.x - 5, y: e.y - 20 }; break;
      case 'coin': case 'apricot': case 'knife': case 'chest': case 'pot': case 'checkpoint': case 'exit':
        G.pickups.push(new Pickup(e.type, e.x, e.y));
        break;
      case 'bandit': G.enemies.push(new Bandit(e.x - 6, e.y - 20)); break;
      case 'thrower': G.enemies.push(new Thrower(e.x - 6, e.y - 20)); break;
      case 'charger': G.enemies.push(new Charger(e.x - 6, e.y - 19)); break;
      case 'brute': G.enemies.push(new Brute(e.x - 9, e.y - 24)); break;
      case 'boss': {
        const boss = new Boss(e.x - 10, e.y - 30);
        boss.arena = { x0: e.x - 260, x1: G.px - TILE * 2 };
        G.boss = boss;
        break;
      }
    }
  }
  if (G.checkpoint) spawn = { x: G.checkpoint.x - 5, y: G.checkpoint.y - 20 };
  G.player = new Player(spawn.x, spawn.y);
  G.cam.lockedTo = null;
  G.cam.follow(G.player, G, true);
  G.audio.music(def.music);
}

// ---- helpers used by gameplay ----
game.addScore = (G2, n, x, y) => {
  game.score += n;
  if (x !== undefined) G2.parts.text(x, y, '+' + n);
};
game.hitStop = (G2, ms) => { game.hitStopT = Math.max(game.hitStopT, ms); };
game.levelClear = (G2) => {
  if (game.state !== 'play') return;
  game.state = 'clear';
  game.stateT = 0;
  G2.audio.play('jingle');
  G2.audio.music(null);
};
game.victory = (G2) => {
  game.state = 'victory';
  game.stateT = 0;
  G2.audio.play('jingle');
  G2.audio.music('title');
};

// ---- ambient particles ----
function ambient() {
  const pal = G.level ? G.level.pal : null;
  if (!pal) return;
  if (pal.time === 'morning' && Math.random() < 0.05) {
    G.parts.list.push({
      kind: 'leaf', x: G.cam.x + Math.random() * 320, y: G.cam.y - 4,
      vx: -0.2 - Math.random() * 0.3, vy: 0.3 + Math.random() * 0.3,
      life: 200, t: 0, ph: Math.random() * 6,
    });
  }
  if (pal.time === 'dusk' && Math.random() < 0.06) {
    G.parts.list.push({
      kind: 'fly', x: G.cam.x + Math.random() * 320, y: G.cam.y + 60 + Math.random() * 110,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
      life: 150 + Math.random() * 100, t: 0, ph: Math.random() * 6,
    });
  }
}

// ---- update ----
function updatePlay() {
  G.frame++;
  if (input.hit('pause')) game.paused = !game.paused;
  if (game.paused) return;

  G.player.update(G);
  for (const e of G.enemies) e.update(G);
  G.enemies = G.enemies.filter(e => !e.dead);
  for (const s of G.shots) s.update(G);
  G.shots = G.shots.filter(s => !s.dead);
  for (const p of G.pickups) p.update(G);
  G.pickups = G.pickups.filter(p => !p.dead);
  updateShocks(G);
  G.parts.update(G);
  G.cam.update();
  G.cam.follow(G.player, G);
  ambient();
  G.audio.update();

  // boss: always update (handles its own activation), lock camera when it wakes
  if (G.boss) {
    G.boss.update(G);
    if (G.boss.active && !G.boss.dead) {
      if (!G.cam.lockedTo) G.cam.lockedTo = { x0: G.boss.arena.x0, x1: Math.min(G.boss.arena.x1 + 40, G.level.px) };
      const minX = G.cam.lockedTo.x0 + 2;
      if (G.player.x < minX) { G.player.x = minX; if (G.player.vx < 0) G.player.vx = 0; }
    }
  }

  // player death → respawn / game over
  const p = G.player;
  if (p.dead && p.deathT > 95) {
    game.lives--;
    if (game.lives <= 0) {
      game.state = 'gameover';
      game.stateT = 0;
      game.checkpoint = null;
      G.audio.music(null);
    } else {
      loadLevel(game.levelIndex, true);
      G.audio.play('pickup');
    }
  }
}

// ---- HUD: Aladdin-style — clean sky, info hugged to the corners ----
function drawRugPanel(ctx, x, y, w, h) {
  // woven rug banner, like the gem/apple counter in Aladdin
  ctx.fillStyle = '#4e180e'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#8c2c1c'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#a83e26';
  for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 2);
  ctx.fillStyle = '#e8c05c';
  for (let xx = x + w - 6; xx > x + 3; xx -= 8) ctx.fillRect(xx, y + (h >> 1) - 1, 2, 2);
  ctx.fillStyle = '#4e180e';
  for (let xx = x; xx < x + w; xx += 6) ctx.fillRect(xx, y + h, 3, 2);
}

function drawHUD() {
  const p = G.player;
  // bottom-left: hearts + lives as hero faces
  for (let i = 0; i < p.maxHp; i++) {
    const img = i < p.hp ? G.sprites.Heart : G.sprites.HeartEmpty;
    ctx.drawImage(img, 6 + i * 10, 156);
  }
  const faces = Math.min(6, Math.max(0, game.lives - 1));
  for (let i = 0; i < faces; i++) {
    ctx.drawImage(G.sprites.HeroFace, 6 + i * 10, 168);
  }
  // bottom-right: rug panel with gems + knives
  drawRugPanel(ctx, 320 - 74, 162, 68, 12);
  ctx.drawImage(G.sprites.Coin[0], 320 - 70, 164);
  const gt = 'x' + game.gems;
  drawText(ctx, gt, 320 - 60, 164, '#f8f0dc');
  ctx.drawImage(G.sprites.KnifeIcon, 320 - 36, 164);
  drawText(ctx, 'x' + p.ammo, 320 - 27, 164, '#f8f0dc');
  // boss hp
  if (G.boss && G.boss.active && !G.boss.dead && !G.boss.dying) {
    const bw = 120;
    const bx = (VIEW_W - bw) / 2, by = 8;
    ctx.fillStyle = '#231319';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
    ctx.fillStyle = '#4e3519';
    ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = '#c05848';
    ctx.fillRect(bx + 1, by + 1, Math.max(0, (bw - 2) * G.boss.hp / G.boss.maxHp), 4);
    ctx.fillStyle = '#f2ca58';
    ctx.fillRect(bx - 2, by - 2, 3, 3); ctx.fillRect(bx + bw - 1, by - 2, 3, 3);
    const name = 'THE WARLORD';
    drawText(ctx, name, (VIEW_W - textWidth(name)) / 2, by + 9, '#e8c0a0');
  }
}

function drawHints() {
  ctx.globalAlpha = 0.55;
  for (const h of G.hints) {
    if (h.x < G.cam.x - 40 || h.x > G.cam.x + 360) continue;
    const bob = Math.sin(G.frame / 30) * 1.5;
    drawText(ctx, h.text, Math.round(h.x - textWidth(h.text) / 2), Math.round(h.y + bob), '#f8f0dc');
  }
  ctx.globalAlpha = 1;
}

// ---- screens ----
function drawTitle() {
  drawBackdrop(ctx, G);
  ctx.fillStyle = 'rgba(20,10,20,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t = 'SILK & STEEL';
  const w3 = textWidth(t, 3);
  drawText(ctx, t, (VIEW_W - w3) / 2 + 1, 33, '#231319', 3);
  drawText(ctx, t, (VIEW_W - w3) / 2, 32, '#f2ca58', 3);
  drawText(ctx, t, (VIEW_W - w3) / 2, 31, '#f2ca58', 3);
  const st = 'A TALE OF THE SILK ROAD';
  drawText(ctx, st, (VIEW_W - textWidth(st, 1)) / 2, 52, '#e8c0a0');
  // hero
  ctx.save();
  ctx.translate(VIEW_W / 2, 130);
  ctx.scale(2, 2);
  drawSprite(ctx, HERO.idle[0], 0, 0, false);
  ctx.restore();
  if ((game.stateT >> 4) % 2 === 0) {
    const pr = 'PRESS ENTER';
    drawText(ctx, pr, (VIEW_W - textWidth(pr)) / 2, 146, '#f8f0dc');
  }
  const c1 = 'ARROWS/WASD MOVE   SPACE JUMP';
  const c2 = 'X SWORD   C KNIFE   M MUSIC: ' + (G.audio.musicOn ? 'ON' : 'OFF');
  drawText(ctx, c1, (VIEW_W - textWidth(c1)) / 2, 160, '#a89078');
  drawText(ctx, c2, (VIEW_W - textWidth(c2)) / 2, 168, G.audio.musicOn ? '#c8e08c' : '#a89078');
}

function drawCard() {
  ctx.fillStyle = '#100a14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const a = Math.min(1, game.stateT / 30) * (game.stateT > 80 ? Math.max(0, 1 - (game.stateT - 80) / 25) : 1);
  ctx.globalAlpha = a;
  const def = LEVELS[game.levelIndex];
  drawText(ctx, def.chapter, (VIEW_W - textWidth(def.chapter, 2)) / 2, 66, '#e8c0a0', 2);
  drawText(ctx, def.name, (VIEW_W - textWidth(def.name)) / 2, 86, '#f2ca58');
  // ornament
  ctx.fillStyle = '#6c5a4a';
  ctx.fillRect(VIEW_W / 2 - 30, 100, 60, 1);
  ctx.fillRect(VIEW_W / 2 - 1, 98, 2, 5);
  ctx.globalAlpha = 1;
}

function drawClear() {
  ctx.fillStyle = 'rgba(16,10,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t1 = 'LEVEL CLEAR!';
  drawText(ctx, t1, (VIEW_W - textWidth(t1, 2)) / 2, 64, '#f2ca58', 2);
  const t2 = 'SCORE ' + game.score;
  drawText(ctx, t2, (VIEW_W - textWidth(t2)) / 2, 90, '#f8f0dc');
  if (game.stateT > 50 && (game.stateT >> 4) % 2 === 0) {
    const t3 = 'PRESS ENTER';
    drawText(ctx, t3, (VIEW_W - textWidth(t3)) / 2, 112, '#e8c0a0');
  }
}

function drawGameover() {
  ctx.fillStyle = 'rgba(10,6,10,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t1 = 'GAME OVER';
  drawText(ctx, t1, (VIEW_W - textWidth(t1, 2)) / 2, 66, '#c05848', 2);
  const t2 = 'THE RAIDERS PREVAIL...';
  drawText(ctx, t2, (VIEW_W - textWidth(t2)) / 2, 94, '#a89078');
  if ((game.stateT >> 4) % 2 === 0) {
    const t3 = 'PRESS ENTER';
    drawText(ctx, t3, (VIEW_W - textWidth(t3)) / 2, 116, '#f8f0dc');
  }
}

function drawVictory() {
  drawBackdrop(ctx, G);
  ctx.fillStyle = 'rgba(20,12,24,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t1 = 'VICTORY!';
  drawText(ctx, t1, (VIEW_W - textWidth(t1, 2)) / 2 + 1, 43, '#231319', 2);
  drawText(ctx, t1, (VIEW_W - textWidth(t1, 2)) / 2, 42, '#f2ca58', 2);
  const t2 = 'THE WARLORD IS VANQUISHED';
  drawText(ctx, t2, (VIEW_W - textWidth(t2)) / 2, 64, '#f8f0dc');
  const t3 = 'THE VILLAGE REJOICES';
  drawText(ctx, t3, (VIEW_W - textWidth(t3)) / 2, 74, '#e8c0a0');
  // hero triumphant
  ctx.save();
  ctx.translate(VIEW_W / 2, 132);
  ctx.scale(2, 2);
  drawSprite(ctx, HERO.slash3[1], 0, 0, false);
  ctx.restore();
  const t4 = 'SCORE ' + game.score;
  drawText(ctx, t4, (VIEW_W - textWidth(t4)) / 2, 138, '#f2ca58');
  if ((game.stateT >> 4) % 2 === 0) {
    const t5 = 'PRESS ENTER';
    drawText(ctx, t5, (VIEW_W - textWidth(t5)) / 2, 158, '#f8f0dc');
  }
}

// ---- render play ----
function drawPlay() {
  drawBackdrop(ctx, G);
  ctx.save();
  G.cam.apply(ctx);
  drawTiles(ctx, G);
  for (const p of G.pickups) p.draw(ctx, G);
  for (const e of G.enemies) e.draw(ctx, G);
  if (G.boss) G.boss.draw(ctx, G);
  drawShocks(ctx, G);
  G.player.draw(ctx, G);
  for (const s of G.shots) s.draw(ctx, G);
  G.parts.draw(ctx, G);
  drawHints();
  ctx.restore();
  drawHUD();
  if (game.paused) {
    ctx.fillStyle = 'rgba(10,6,10,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const t = 'PAUSED';
    drawText(ctx, t, (VIEW_W - textWidth(t, 2)) / 2, 80, '#f2ca58', 2);
  }
}

// ---- debug sprite sheet ----
function drawSheet() {
  ctx.fillStyle = '#40284a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const groups = [
    ['idle', HERO.idle], ['run', HERO.run], ['jump', HERO.jump], ['fall', HERO.fall],
    ['crouch', HERO.crouch], ['s1', HERO.slash1], ['s2', HERO.slash2], ['s3', HERO.slash3],
    ['throw', HERO.throw], ['hurt', HERO.hurt], ['dead', HERO.dead], ['climb', HERO.climb],
    ['bandit', G.sprites.BANDIT.walk.concat(G.sprites.BANDIT.windup, G.sprites.BANDIT.slash, G.sprites.BANDIT.guard)],
    ['thrower', G.sprites.THROWER.walk.concat(G.sprites.THROWER.windup, G.sprites.THROWER.thrown)],
    ['charger', G.sprites.CHARGER.walk.concat(G.sprites.CHARGER.telegraph, G.sprites.CHARGER.charge)],
    ['brute', G.sprites.BRUTE.walk.concat(G.sprites.BRUTE.windup, G.sprites.BRUTE.slam)],
    ['boss', G.sprites.BOSS.idle.concat(G.sprites.BOSS.walk, G.sprites.BOSS.windup, G.sprites.BOSS.lunge, G.sprites.BOSS.slamA, G.sprites.BOSS.slamB, G.sprites.BOSS.volley, G.sprites.BOSS.stagger)],
    ['props', [G.sprites.Coin[0], G.sprites.Apricot, G.sprites.KnifePickup, G.sprites.Chest, G.sprites.Pot, G.sprites.Checkpoint[0], G.sprites.Heart, G.sprites.KnifeIcon, G.sprites.Knife]],
  ];
  let y = 2;
  for (const [name, frames] of groups) {
    if (y > 170) break;
    let x = 2;
    let rowH = 0;
    for (const f of frames) {
      if (x + f.width > VIEW_W - 2) break;
      ctx.drawImage(f, x, y);
      x += f.width + 2;
      rowH = Math.max(rowH, f.height);
    }
    y += rowH + 3;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, y - 1, VIEW_W, 1);
  }
}

// ---- main loop ----
let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;
let lastFrameAt = last;

function frame(now) {
  requestAnimationFrame(frame);
  lastFrameAt = now;
  let dt = Math.min(100, now - last);
  last = now;
  acc += dt;

  const sheetMode = location.search.includes('sheet');

  while (acc >= STEP) {
    acc -= STEP;
    if (input.hit('mute')) {
      const on = G.audio.toggleMusic();
      game.showToast(on ? 'MUSIC ON - PRESS M TO TURN OFF' : 'MUSIC OFF');
    }
    if (game.toast) {
      game.toast.t++;
      if (game.toast.t > 110) game.toast = null;
    }
    G.audio.ensure();

    if (sheetMode) { input.endFrame(); continue; }

    game.stateT++;
    switch (game.state) {
      case 'title':
        G.frame++;
        if (input.hit('start')) {
          game.state = 'card';
          game.stateT = 0;
          game.levelIndex = 0;
          game.lives = 3;
          game.score = 0;
          game.gems = 0;
          game.checkpoint = null;
          loadLevel(0, false);
        } else {
          G.audio.update();
        }
        break;
      case 'card':
        if (game.stateT === 1) G.audio.music(null);
        if (game.stateT > 105 || (game.stateT > 30 && input.hit('start'))) {
          game.state = 'play';
          game.stateT = 0;
          G.audio.music(LEVELS[game.levelIndex].music);
        }
        break;
      case 'play':
        if (game.hitStopT > 0) {
          game.hitStopT -= STEP;
        } else {
          updatePlay();
        }
        break;
      case 'clear':
        G.parts.update(G);
        G.frame++;
        if (game.stateT > 60 && input.hit('start')) {
          game.levelIndex++;
          if (game.levelIndex >= LEVELS.length) {
            game.state = 'victory'; game.stateT = 0;
          } else {
            game.state = 'card'; game.stateT = 0;
            loadLevel(game.levelIndex, false);
          }
        }
        break;
      case 'gameover':
      case 'victory':
        if (game.stateT > 40 && input.hit('start')) {
          game.state = 'title';
          game.stateT = 0;
          game.checkpoint = null;
          // load a pretty backdrop for the title
          loadTitleScene();
        }
        break;
    }
    input.endFrame();
  }

  ctx.save();
  if (sheetMode) drawSheet();
  else {
    switch (game.state) {
      case 'title': drawTitle(); break;
      case 'card': drawCard(); break;
      case 'play': drawPlay(); break;
      case 'clear': drawPlay(); drawClear(); break;
      case 'gameover': drawGameover(); break;
      case 'victory': drawVictory(); break;
    }
    // music toggle toast
    if (game.toast) {
      const t = game.toast;
      ctx.globalAlpha = t.t < 75 ? 1 : Math.max(0, 1 - (t.t - 75) / 35);
      const w = textWidth(t.text);
      ctx.fillStyle = '#231319';
      ctx.fillRect((VIEW_W - w) / 2 - 3, 21, w + 6, 9);
      drawText(ctx, t.text, (VIEW_W - w) / 2, 23, '#f2ca58');
      ctx.globalAlpha = 1;
    }
    // subtle scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < VIEW_H; y += 3) ctx.fillRect(0, y, VIEW_W, 1);
  }
  ctx.restore();
}

function loadTitleScene() {
  const def = LEVELS[0];
  const b = def.build();
  G.level = { ...def, tiles: b.tiles, w: b.w, h: b.h, px: b.w * TILE, py: b.h * TILE };
  G.px = G.level.px; G.py = G.level.py;
  G.groundY = def.groundRow * TILE;
  G.backdrop = buildBackdrop(G.level, def.pal);
  G.cam.x = 120; G.cam.y = 40; G.cam.lockedTo = null;
  G.enemies = []; G.shots = []; G.pickups = []; G.shocks = []; G.boss = null;
  G.audio.music('title');
}

// level jump query param (?level=0..2, &sheet)
const lvlParam = new URLSearchParams(location.search).get('level');
if (lvlParam !== null && !location.search.includes('sheet')) {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, parseInt(lvlParam) || 0));
  game.state = 'play';
  loadLevel(idx, false);
} else {
  loadTitleScene();
}
// dev handle for automated playtesting (harmless in normal play)
window.__G = G;
window.__game = game;
// keep a readable record of runtime errors (used during dev testing)
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
requestAnimationFrame(frame);
// fallback driver for throttled/background tabs where rAF stalls
setInterval(() => {
  const now = performance.now();
  if (now - lastFrameAt > 250) frame(now);
}, 1000 / 60);
