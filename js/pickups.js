// Pickups: coins, apricots (heal), knife packs, chests, pots (breakables),
// checkpoint posts, exit gate.

import { overlap } from './physics.js';

export class Pickup {
  constructor(type, x, y) {
    // x = center px, y = feet px
    this.type = type;
    this.x = x; this.y = y;
    this.dead = false;
    this.t = Math.random() * 100;
    this.taken = false;
    switch (type) {
      case 'coin': this.w = 8; this.h = 8; this.bobA = 1.5; break;
      case 'apricot': this.w = 8; this.h = 8; this.bobA = 1.5; break;
      case 'knife': this.w = 10; this.h = 6; this.bobA = 1.5; break;
      case 'chest': this.w = 14; this.h = 11; this.bobA = 0; break;
      case 'pot': this.w = 8; this.h = 8; this.bobA = 0; this.hp = 1; break;
      case 'checkpoint': this.w = 6; this.h = 19; this.bobA = 0; this.active = false; break;
      case 'exit': this.w = 20; this.h = 32; this.bobA = 0; break;
      case 'spawn': this.w = 1; this.h = 1; this.bobA = 0; break;
    }
    this.baseY = y;
  }

  rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  update(G) {
    this.t++;
    const p = G.player;
    switch (this.type) {
      case 'coin':
      case 'apricot':
      case 'knife': {
        if (p.dead) break;
        const bob = { x: this.x - this.w / 2, y: this.y - this.h + Math.sin(this.t / 14) * this.bobA, w: this.w, h: this.h };
        if (overlap(bob, p)) this.collect(G);
        break;
      }
      case 'chest': {
        if (!this.open && !p.dead && overlap(this.rect(), p)) {
          this.open = true;
          G.audio.play('chest');
          G.game.gems += 10;
          G.game.addScore(G, 1000, this.x, this.y - 12);
          for (let i = 0; i < 8; i++) G.parts.coinFly(this.x, this.y - 8);
        }
        break;
      }
      case 'checkpoint': {
        if (!this.active && !p.dead && overlap(this.rect(), p)) {
          this.active = true;
          G.checkpoint = { x: this.x, y: this.y };
          G.game.checkpoint = G.checkpoint;
          p.hp = p.maxHp;
          G.audio.play('check');
          G.parts.sparks(this.x, this.y - 14, 8, '#f2ca58');
          G.parts.text(this.x, this.y - 26, 'CHECKPOINT', '#f2ca58');
        }
        break;
      }
      case 'exit': {
        if (!p.dead && overlap(this.rect(), p)) {
          G.game.levelClear(G);
        }
        break;
      }
    }
  }

  collect(G) {
    this.dead = true;
    const p = G.player;
    if (this.type === 'coin') {
      G.game.gems++;
      G.game.addScore(G, 100, this.x, this.y - 10);
      G.parts.coinFly(this.x, this.y - 6);
      G.audio.play('coin');
    } else if (this.type === 'apricot') {
      if (p.hp < p.maxHp) { p.hp++; G.parts.text(this.x, this.y - 12, '+1', '#8ce08c'); }
      else G.game.addScore(G, 250, this.x, this.y - 12);
      G.parts.sparks(this.x, this.y - 4, 5, '#f2a24c');
      G.audio.play('heal');
    } else if (this.type === 'knife') {
      p.ammo = Math.min(9, p.ammo + 3);
      G.parts.text(this.x, this.y - 12, '+3 KNIVES', '#c8d8e8');
      G.parts.sparks(this.x, this.y - 4, 5, '#d8e0e8');
      G.audio.play('pickup');
    }
  }

  // pots are breakable: sword/knife calls this
  smash(G) {
    if (this.type !== 'pot' || this.dead) return;
    this.dead = true;
    G.parts.puff(this.x, this.y - 4, '#d8b088');
    G.audio.play('smash');
    // contents: seeded by position
    const roll = (Math.abs(this.x * 7919) % 10);
    if (roll < 4) {
      G.pickups.push(new Pickup('coin', this.x, this.y - 4));
      G.pickups.push(new Pickup('coin', this.x + 4, this.y - 4));
    } else if (roll < 7) {
      G.pickups.push(new Pickup('knife', this.x, this.y - 4));
    } else if (roll < 9) {
      G.pickups.push(new Pickup('apricot', this.x, this.y - 4));
    } else {
      G.pickups.push(new Pickup('coin', this.x, this.y - 4));
      G.pickups.push(new Pickup('apricot', this.x - 5, this.y - 4));
    }
  }

  draw(ctx, G) {
    const S = G.sprites;
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.type === 'coin') {
      const f = S.Coin[(this.t >> 3) % 4];
      ctx.drawImage(f, x - f.width / 2, y - 8 + Math.round(Math.sin(this.t / 14) * this.bobA));
    } else if (this.type === 'apricot') {
      const f = S.Apricot;
      ctx.drawImage(f, x - f.width / 2, y - 8 + Math.round(Math.sin(this.t / 14) * this.bobA));
    } else if (this.type === 'knife') {
      const f = S.KnifePickup;
      ctx.drawImage(f, x - f.width / 2, y - 6 + Math.round(Math.sin(this.t / 14) * this.bobA));
    } else if (this.type === 'chest') {
      const f = this.open ? S.ChestOpen : S.Chest;
      ctx.drawImage(f, x - f.width / 2, y - f.height);
    } else if (this.type === 'pot') {
      const f = S.Pot;
      ctx.drawImage(f, x - f.width / 2, y - f.height);
    } else if (this.type === 'checkpoint') {
      const flut = this.active ? (G.frame >> 3) % 2 : 0;
      const img = S.Checkpoint[flut];
      ctx.drawImage(img, x - img.width / 2, y - img.height);
    } else if (this.type === 'exit') {
      drawGate(ctx, G, x, y);
    }
  }
}

// ornate wooden gate = level exit
function drawGate(ctx, G, x, y) {
  const t = G.frame;
  const glow = Math.sin(t / 20) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(242,202,88,${0.10 + glow * 0.10})`;
  ctx.fillRect(x - 14, y - 36, 28, 36);
  // frame
  ctx.fillStyle = '#4e3519';
  ctx.fillRect(x - 11, y - 34, 22, 34);
  ctx.fillStyle = '#6a4a28';
  ctx.fillRect(x - 9, y - 32, 18, 32);
  ctx.fillStyle = '#4e3519';
  ctx.fillRect(x - 9, y - 32, 18, 2);
  ctx.fillRect(x - 2, y - 32, 2, 32);
  ctx.fillRect(x - 9, y - 18, 18, 2);
  // arch top
  ctx.fillStyle = '#f2ca58';
  ctx.fillRect(x - 3, y - 30, 4, 3);
  ctx.fillRect(x - 6, y - 24, 10, 2);
}
