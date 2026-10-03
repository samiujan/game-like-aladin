// THE WARLORD OF THE IRON GATE — final boss.
// Phase 1: great-sword lunges + jump slams (ground shockwaves).
// Phase 2 (hp <= 13): faster, adds knife volleys.

import { overlap, moveY } from './physics.js';
import { drawSprite } from './sprites.js';
import { Knife } from './projectiles.js';

const GRAV = 0.34;

export class Boss {
  constructor(x, y) { // x,y top-left of hitbox
    this.x = x; this.y = y;
    this.w = 20; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.onGround = false;
    this.hp = 26; this.maxHp = 26;
    this.state = 'intro';
    this.t = 0;
    this.flash = 0;
    this.guarding = false;
    this.dead = false;
    this.dying = false;
    this.deathT = 0;
    this.active = false;
    this.animT = 0;
    this.phase = 1;
    this.arena = null; // {x0, x1} set by game on spawn
  }

  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  activate(G) {
    if (this.active) return;
    this.active = true;
    G.audio.play('bossroar');
    G.cam.addShake(4);
    G.audio.music('boss');
  }

  damage(G, dmg, fromDir) {
    if (this.dead || this.dying || !this.active) return;
    if (this.state === 'lunge' && this.t < 18) {
      // armored mid-lunge
      G.audio.play('clang');
      G.parts.sparks(this.cx + this.dir * 10, this.y + 12, 4, '#c8d8e8');
      return;
    }
    this.hp -= dmg;
    this.flash = 1;
    G.audio.play('bosshit');
    G.game.hitStop(G, 45);
    G.parts.sparks(this.cx + fromDir * -6, this.y + 12, 4, '#f0d8b0');
    if (this.hp <= 0) { this.startDeath(G); return; }
    if (this.phase === 1 && this.hp <= 13) {
      this.phase = 2;
      this.state = 'stagger';
      this.t = 0;
      this.vx = 0;
      G.audio.play('bossroar');
      G.cam.addShake(4);
      G.parts.puff(this.cx, this.y + 14, '#e8c8a0', 2);
    }
  }

  startDeath(G) {
    this.dying = true;
    this.state = 'dying';
    this.t = 0;
    this.vx = 0;
    G.game.addScore(G, 5000, this.cx, this.y - 8);
    G.audio.play('bossdie');
    G.game.hitStop(G, 350);
    G.cam.addShake(6);
  }

  touchHurt(G) {
    const p = G.player;
    if (p.dead || p.invuln > 0) return;
    if (overlap(this.rect(), p.rect())) p.hurt(G, p.cx < this.cx ? -1 : 1);
  }

  physics(G) {
    this.vy = Math.min(7, this.vy + GRAV);
    // arena walls
    const x0 = this.arena ? this.arena.x0 : 0;
    const x1 = this.arena ? this.arena.x1 : G.level.px;
    this.x += this.vx;
    if (this.x < x0) { this.x = x0; this.hitWall = 1; }
    if (this.x + this.w > x1) { this.x = x1 - this.w; this.hitWall = 1; }
    // simple ground follow
    const ent = { x: this.x, y: this.y, w: this.w, h: this.h, vx: 0, vy: this.vy, noClip: false, dropThrough: 0 };
    moveY(ent, G);
    this.y = ent.y;
    this.onGround = ent.onGround;
    if (ent.onGround && this.vy > 0) this.justLanded = true;
    this.vy = ent.vy;
  }

  update(G) {
    this.animT++;
    if (this.flash > 0) this.flash -= 0.25;
    if (!this.active) {
      if (G.player.cx > this.x - 170) this.activate(G);
      else return;
    }
    this.t++;
    const p = G.player;
    const sp = this.phase === 2 ? 1.25 : 1;

    if (this.dying) {
      this.deathT++;
      if (this.deathT % 8 === 0 && this.deathT < 90) {
        G.parts.puff(this.x + Math.random() * this.w, this.y + Math.random() * this.h, '#f0e8d8', 1.2);
        G.audio.play('kill');
        G.cam.addShake(2);
      }
      if (this.deathT === 40) {
        for (let i = 0; i < 12; i++) G.parts.coinFly(this.cx, this.y + 10);
      }
      if (this.deathT > 130) {
        this.dead = true;
        G.parts.puff(this.cx, this.y + 14, '#f8f0e0', 3);
        G.game.victory(G);
      }
      return;
    }

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.t === 1) { G.cam.addShake(3); }
        if (this.t > 55) { this.state = 'think'; this.t = 0; }
        break;

      case 'think': {
        // pick next action
        this.vx = 0;
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        if (p.dead) break;
        const dx = Math.abs(p.cx - this.cx);
        let r = Math.random();
        if (this.phase === 2) r -= 0.15;
        if (dx < 60) {
          this.state = r < 0.55 ? 'windupLunge' : 'windupSlam';
        } else if (dx < 150) {
          this.state = r < 0.45 ? 'windupLunge' : r < 0.75 ? 'windupSlam' : 'windupVolley';
        } else {
          this.state = r < 0.5 ? 'approach' : r < 0.8 ? 'windupLunge' : 'windupVolley';
        }
        this.t = 0;
        break;
      }

      case 'approach': {
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        this.vx = this.dir * 0.7 * sp;
        if (this.t > 40 || Math.abs(p.cx - this.cx) < 56) { this.state = 'think'; this.t = 0; }
        break;
      }

      case 'windupLunge': {
        this.vx = 0;
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        if (this.t === 1) G.audio.play('ewind');
        if (this.t > 24 / sp) {
          this.state = 'lunge';
          this.t = 0;
          this.hitWall = 0;
          G.audio.play('eslash');
        }
        break;
      }

      case 'lunge': {
        this.vx = this.dir * 4.4 * sp;
        if (this.t > 2 && this.t < 18) {
          const hb = { x: this.dir > 0 ? this.x + this.w : this.x - 26, y: this.y - 4, w: 26, h: this.h + 4 };
          if (!p.dead && overlap(hb, p.rect())) p.hurt(G, this.dir);
          if (this.t % 2 === 0) G.parts.sparks(this.cx + this.dir * 16, this.y + 14, 1, '#e8f0f8');
        }
        if (this.t > 20 || this.hitWall) {
          this.hitWall = 0;
          this.vx = 0;
          G.parts.dust(this.cx + this.dir * 10, this.feet, 5);
          G.cam.addShake(1.5);
          this.state = 'recover';
          this.t = 0;
        }
        break;
      }

      case 'recover': {
        this.vx = 0;
        if (this.t > (this.phase === 2 ? 20 : 34)) { this.state = 'think'; this.t = 0; }
        break;
      }

      case 'windupSlam': {
        this.vx = 0;
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        if (this.t === 1) G.audio.play('ewind');
        if (this.t > 26 / sp) {
          this.state = 'slamJump';
          this.t = 0;
          this.vy = -6.4;
          this.vx = Math.sign(p.cx - this.cx) * 1.6;
          this.justLanded = false;
        }
        break;
      }

      case 'slamJump': {
        // airborne; on landing → shock
        if (this.justLanded) {
          this.justLanded = false;
          this.state = 'slamLand';
          this.t = 0;
          this.vx = 0;
          G.cam.addShake(5);
          G.audio.play('slam');
          G.parts.dust(this.cx, this.feet, 10);
          G.parts.dust(this.cx - 10, this.feet, 4);
          G.parts.dust(this.cx + 10, this.feet, 4);
          G.game.hitStop(G, 50);
          // shockwaves
          G.shocks.push({ x: this.cx, y: this.feet - 5, vx: 2.6, t: 0, dead: false });
          G.shocks.push({ x: this.cx, y: this.feet - 5, vx: -2.6, t: 0, dead: false });
          if (this.phase === 2) {
            G.shocks.push({ x: this.cx, y: this.feet - 5, vx: 3.4, t: 0, dead: false });
            G.shocks.push({ x: this.cx, y: this.feet - 5, vx: -3.4, t: 0, dead: false });
          }
        }
        break;
      }

      case 'slamLand': {
        this.vx = 0;
        if (this.t > 30) { this.state = 'think'; this.t = 0; }
        break;
      }

      case 'windupVolley': {
        this.vx = 0;
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        if (this.t === 1) G.audio.play('ewind');
        if (this.t === 20 / sp) {
          const n = this.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2);
            G.shots.push(new Knife(
              this.cx + this.dir * 10, this.y + 10,
              this.dir * 4.2, spread * 0.9 - 0.8, false));
          }
          G.audio.play('ethrow');
        }
        if (this.t > 40 / sp) { this.state = 'recover'; this.t = 0; }
        break;
      }

      case 'stagger': {
        this.vx = 0;
        if (this.t % 5 === 0) G.parts.sparks(this.cx, this.y + 12, 2, '#e8c8a0');
        if (this.t > 55) { this.state = 'think'; this.t = 0; }
        break;
      }
    }

    this.physics(G);
    if (!p.dead) this.touchHurt(G);
  }

  draw(ctx, G) {
    const B = G.sprites.BOSS;
    let img;
    const flip = this.dir < 0;
    switch (this.state) {
      case 'windupLunge': case 'windupVolley': img = B.windup[0]; break;
      case 'lunge': img = B.lunge[0]; break;
      case 'windupSlam': case 'slamJump': img = B.slamA[0]; break;
      case 'slamLand': img = B.slamB[0]; break;
      case 'stagger': img = B.stagger[0]; break;
      case 'dying': img = B.stagger[0]; break;
      case 'approach': img = B.walk[(this.animT >> 4) % 2]; break;
      default: img = B.idle[0];
    }
    if (this.dying && (this.deathT >> 2) % 2 === 0) {
      drawSprite(ctx, img, this.cx, this.feet, flip, 1);
      return;
    }
    drawSprite(ctx, img, this.cx, this.feet, flip, this.flash > 0 ? 1 : 0);
  }
}

// shockwave update/draw (ground-travelling)
export function updateShocks(G) {
  for (const s of G.shocks) {
    if (s.dead) continue;
    s.t++;
    s.x += s.vx;
    // die on walls
    const tx = Math.floor(s.x / 16), ty = Math.floor(s.y / 16);
    const t = G.level.tiles[ty * G.level.w + tx];
    if (t === 1 || t === 2) s.dead = true;
    if (s.t > 100) s.dead = true;
    const p = G.player;
    if (!p.dead && p.invuln <= 0 &&
        Math.abs(s.x - p.cx) < 7 && Math.abs(s.y - (p.feet - 4)) < 10) {
      p.hurt(G, Math.sign(s.vx));
      s.dead = true;
    }
  }
  G.shocks = G.shocks.filter(s => !s.dead);
}

export function drawShocks(ctx, G) {
  for (const s of G.shocks) {
    const h = Math.sin(s.t / 3) * 2;
    ctx.fillStyle = '#e8c8a0';
    ctx.fillRect(Math.round(s.x - 3), Math.round(s.y - 6 - h), 2, 6);
    ctx.fillRect(Math.round(s.x + 1), Math.round(s.y - 4 - h), 2, 5);
    ctx.fillStyle = '#a8886a';
    ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - 3), 2, 4);
  }
}
