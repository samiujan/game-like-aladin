// Projectiles: throwing knives (player & enemy), reflected knives.

import { moveX, moveY, solidAt } from './physics.js';
import { TILE } from './physics.js';

export class Knife {
  constructor(x, y, vx, vy, friendly) {
    this.x = x; this.y = y;         // center
    this.w = 8; this.h = 4;
    this.vx = vx; this.vy = vy;
    this.friendly = friendly;       // hurts enemies?
    this.reflected = false;
    this.dead = false;
    this.gravity = 0.055;
    this.t = 0;
  }

  update(G) {
    this.t++;
    this.vy += this.gravity;
    // step in small increments so we don't tunnel through thin walls
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy)) / 4));
    for (let i = 0; i < steps; i++) {
      this.x += this.vx / steps;
      this.y += this.vy / steps;
      const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
      if (solidAt(G, tx, ty)) {
        this.dead = true;
        G.parts.sparks(this.x, this.y, 3, '#d8e0e8');
        G.audio.play(this.friendly ? 'thud' : 'tick');
        return;
      }
    }
    if (this.y > G.level.py + 40 || this.x < -20 || this.x > G.level.px + 20) this.dead = true;

    if (this.friendly) {
      // hits enemies
      for (const e of G.enemies) {
        if (e.dead || e.dying) continue;
        if (this.x > e.x && this.x < e.x + e.w && this.y > e.y && this.y < e.y + e.h) {
          if (e.blocksKnives && !this.reflected) {
            // blocked
            this.dead = true;
            G.parts.sparks(this.x, this.y, 4, '#c8d8e8');
            G.audio.play('clang');
          } else {
            e.damage(G, 1, Math.sign(this.vx) || 1);
            this.dead = true;
          }
          return;
        }
      }
      if (G.boss && !G.boss.dead && !G.boss.dying &&
          this.x > G.boss.x && this.x < G.boss.x + G.boss.w && this.y > G.boss.y && this.y < G.boss.y + G.boss.h) {
        if (G.boss.guarding) {
          this.dead = true;
          G.parts.sparks(this.x, this.y, 4, '#c8d8e8');
          G.audio.play('clang');
        } else {
          G.boss.damage(G, 1, Math.sign(this.vx) || 1);
          this.dead = true;
        }
        return;
      }
    } else {
      // hits player
      const p = G.player;
      if (!p.dead && !p.invuln &&
          this.x > p.x && this.x < p.x + p.w && this.y > p.y && this.y < p.y + p.h) {
        p.hurt(G, Math.sign(this.vx) || 1);
        this.dead = true;
        return;
      }
    }
  }

  draw(ctx, G) {
    const img = G.sprites.Knife;
    const flip = this.vx < 0;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (flip) ctx.scale(-1, 1);
    // slight arc tilt
    ctx.rotate(Math.max(-0.4, Math.min(0.4, this.vy * 0.06)));
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
}
