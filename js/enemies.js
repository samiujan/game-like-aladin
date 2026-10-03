// Enemies: sword bandit, knife thrower, spear charger, armored brute.
// Shared: sleep until player near, white hit-flash, coin-poof death.

import { moveX, moveY, overlap } from './physics.js';
import { drawSprite } from './sprites.js';
import { Knife } from './projectiles.js';

const GRAV = 0.34, MAXFALL = 6.5;

export class Enemy {
  constructor(x, y) { // x,y = top-left of hitbox
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.onGround = false;
    this.state = 'sleep';
    this.t = 0;
    this.flash = 0;
    this.dead = false;
    this.animT = Math.random() * 100;
  }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }

  activate(G) {
    if (this.state !== 'sleep') return;
    const p = G.player;
    if (Math.abs(p.cx - this.cx) < 250 && Math.abs(p.feet - this.feet) < 140) {
      this.state = 'idle';
      this.t = 0;
    }
  }

  physics(G) {
    this.vy = Math.min(MAXFALL, this.vy + GRAV);
    moveY(this, G);
    moveX(this, G);
  }

  turnAtLedges(G) {
    if (!this.onGround) return;
    const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
    const tx = Math.floor(aheadX / 16), ty = Math.floor((this.feet + 4) / 16);
    const t = G.level.tiles[ty * G.level.w + tx];
    const wallAhead = (() => {
      const twx = Math.floor((this.dir > 0 ? this.x + this.w + 2 : this.x - 2) / 16);
      const ty0 = Math.floor((this.y + 2) / 16), ty1 = Math.floor((this.feet - 2) / 16);
      for (let ty2 = ty0; ty2 <= ty1; ty2++) {
        const tt = G.level.tiles[ty2 * G.level.w + twx];
        if (tt === 1 || tt === 2) return true;
      }
      return false;
    })();
    if ((t !== 1 && t !== 2) || wallAhead) this.dir *= -1;
  }

  damage(G, dmg, fromDir) {
    if (this.dead) return;
    if (this.guarding && fromDir === this.dir) {
      G.audio.play('clang');
      G.parts.sparks(this.cx + this.dir * 6, this.y + 8, 4, '#c8d8e8');
      return;
    }
    this.hp -= dmg;
    this.flash = 1;
    G.audio.play('hit');
    G.game.hitStop(G, 40);
    this.vx += fromDir * 0.8;
    if (this.hp <= 0) this.die(G);
  }

  die(G) {
    this.dead = true;
    G.audio.play('kill');
    G.parts.puff(this.cx, this.feet - this.h / 2, '#f0e8d8', 1.4);
    const coins = this.score >= 500 ? 4 : 2;
    for (let i = 0; i < coins; i++) G.parts.coinFly(this.cx, this.y + 4);
    G.game.addScore(G, this.score, this.cx, this.y - 6);
    G.cam.addShake(1.5);
  }

  touchHurt(G) {
    const p = G.player;
    if (p.dead || p.invuln > 0) return;
    if (overlap({ x: this.x, y: this.y, w: this.w, h: this.h }, p.rect())) {
      p.hurt(G, p.cx < this.cx ? -1 : 1);
    }
  }

  update(G) {
    this.animT++;
    if (this.flash > 0) this.flash -= 0.25;
    if (this.y > G.level.py + 40) { this.dead = true; return; }
    this.activate(G);
    if (this.state === 'sleep') return;
    this.tick(G);
    if (!this.dead) this.touchHurt(G);
  }

  tick(G) { this.physics(G); }

  draw(ctx, G) {}
}

// ------------------------------------------------------------------
export class Bandit extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.w = 12; this.h = 20;
    this.hp = 3; this.score = 200;
    this.guarding = false;
    this.guardCd = 0;
  }

  tick(G) {
    const p = G.player;
    this.t++;
    if (this.guardCd > 0) this.guardCd--;
    const dx = p.cx - this.cx;
    const adx = Math.abs(dx);
    const dy = Math.abs(p.feet - this.feet);

    switch (this.state) {
      case 'idle': {
        // wander slowly, face player when near
        this.vx = this.dir * 0.3;
        this.turnAtLedges(G);
        if (!p.dead && adx < 110 && dy < 40) {
          this.dir = Math.sign(dx) || 1;
          this.state = 'chase';
          this.t = 0;
        }
        break;
      }
      case 'chase': {
        this.vx = this.dir * 0.75;
        this.turnAtLedges(G);
        if (p.dead) { this.state = 'idle'; break; }
        this.dir = Math.sign(dx) || this.dir;
        if (adx < 24 && dy < 24) {
          // consider guard if player is slashing
          if (p.state === 'slash' && this.guardCd <= 0 && Math.random() < 0.5) {
            this.state = 'guard';
            this.t = 0;
            this.guarding = true;
          } else {
            this.state = 'windup';
            this.t = 0;
            this.vx = 0;
          }
        } else if (adx > 150) {
          this.state = 'idle';
        }
        break;
      }
      case 'guard': {
        this.vx = 0;
        this.guarding = true;
        if (this.t > 34 || p.dead) {
          this.guarding = false;
          this.guardCd = 150;
          this.state = 'chase';
        }
        break;
      }
      case 'windup': {
        this.vx = 0;
        if (this.t > 16) { this.state = 'slash'; this.t = 0; G.audio.play('eslash'); }
        break;
      }
      case 'slash': {
        // active hitbox frames 2..6
        if (this.t >= 2 && this.t <= 6 && !p.dead) {
          const hb = { x: this.dir > 0 ? this.x + this.w : this.x - 16, y: this.y - 2, w: 16, h: this.h + 2 };
          if (overlap(hb, p.rect())) p.hurt(G, this.dir);
        }
        if (this.t > 14) { this.state = 'chase'; this.t = 0; }
        break;
      }
    }
    this.physics(G);
  }

  draw(ctx, G) {
    const B = G.sprites.BANDIT;
    let img, flip = this.dir < 0;
    switch (this.state) {
      case 'windup': img = B.windup[0]; break;
      case 'slash': img = B.slash[0]; break;
      case 'guard': img = B.guard[0]; break;
      case 'sleep': img = B.walk[0]; break;
      default: img = B.walk[(this.animT >> 4) % 4];
    }
    if (this.state === 'sleep') flip = true;
    drawSprite(ctx, img, this.cx, this.feet, flip, this.flash > 0 ? 1 : 0);
  }
}

// ------------------------------------------------------------------
export class Thrower extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.w = 12; this.h = 20;
    this.hp = 2; this.score = 250;
    this.cool = 40;
  }

  tick(G) {
    const p = G.player;
    this.t++;
    const dx = p.cx - this.cx;
    const adx = Math.abs(dx);
    const dy = Math.abs(p.feet - this.feet);

    switch (this.state) {
      case 'idle': {
        this.vx = 0;
        if (!p.dead && adx < 190 && dy < 60) {
          this.dir = Math.sign(dx) || 1;
          this.state = 'fight';
        }
        break;
      }
      case 'fight': {
        if (p.dead) { this.state = 'idle'; break; }
        this.dir = Math.sign(dx) || this.dir;
        if (adx < 55) {
          // retreat
          this.vx = -this.dir * 0.55;
          this.turnAtLedges(G);
        } else {
          this.vx = 0;
          if (adx < 175 && this.cool <= 0) {
            this.state = 'windup';
            this.t = 0;
          }
        }
        if (this.cool > 0) this.cool--;
        break;
      }
      case 'windup': {
        this.vx = 0;
        if (this.t === 14) {
          // throw arcing knife
          const lead = p.vx * 12;
          G.shots.push(new Knife(
            this.cx + this.dir * 7, this.y + 5,
            this.dir * 3.4 + Math.sign(lead) * 0.4, -2.4, false));
          G.audio.play('ethrow');
        }
        if (this.t > 22) {
          this.state = 'fight';
          this.cool = 85 + Math.random() * 50;
        }
        break;
      }
    }
    this.physics(G);
  }

  draw(ctx, G) {
    const S = G.sprites.THROWER;
    let img, flip = this.dir < 0;
    switch (this.state) {
      case 'windup': img = this.t < 14 ? S.windup[0] : S.thrown[0]; break;
      case 'sleep': img = S.walk[0]; break;
      default: img = Math.abs(this.vx) > 0.1 ? S.walk[(this.animT >> 4) % 2] : S.walk[0];
    }
    if (this.state === 'sleep') flip = true;
    drawSprite(ctx, img, this.cx, this.feet, flip, this.flash > 0 ? 1 : 0);
  }
}

// ------------------------------------------------------------------
export class Charger extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.w = 12; this.h = 19;
    this.hp = 2; this.score = 250;
    this.chargeLeft = 0;
  }

  tick(G) {
    const p = G.player;
    this.t++;
    const dx = p.cx - this.cx;
    const adx = Math.abs(dx);
    const dy = Math.abs(p.feet - this.feet);

    switch (this.state) {
      case 'idle': {
        this.vx = this.dir * 0.35;
        this.turnAtLedges(G);
        if (!p.dead && adx < 170 && dy < 22) {
          this.dir = Math.sign(dx) || 1;
          this.state = 'telegraph';
          this.t = 0;
          this.vx = 0;
          G.audio.play('alert');
        }
        break;
      }
      case 'telegraph': {
        this.vx = 0;
        if (this.t % 6 === 0) G.parts.dust(this.cx, this.feet, 1);
        if (this.t > 26) { this.state = 'charge'; this.t = 0; this.hitWall = 0; }
        break;
      }
      case 'charge': {
        this.vx = this.dir * 3.4;
        // spear tip hitbox
        if (!p.dead && this.t > 2) {
          const hb = { x: this.dir > 0 ? this.x + this.w : this.x - 12, y: this.y + 4, w: 12, h: 10 };
          if (overlap(hb, p.rect())) p.hurt(G, this.dir);
        }
        if (this.hitWall || this.t > 80) {
          this.state = 'dizzy';
          this.t = 0;
          this.vx = 0;
          G.cam.addShake(2);
          G.parts.dust(this.cx + this.dir * 8, this.feet, 6);
          G.audio.play('thud');
        }
        if (this.t % 3 === 0) G.parts.dust(this.cx - this.dir * 6, this.feet, 1);
        break;
      }
      case 'dizzy': {
        this.vx = 0;
        if (this.t > 45) { this.state = 'idle'; this.t = 0; }
        break;
      }
    }
    this.hitWall = 0;
    this.physics(G);
  }

  draw(ctx, G) {
    const S = G.sprites.CHARGER;
    let img, flip = this.dir < 0;
    switch (this.state) {
      case 'telegraph': img = S.telegraph[0]; break;
      case 'charge': img = S.charge[0]; break;
      case 'dizzy': img = S.walk[0]; break;
      case 'sleep': img = S.walk[0]; break;
      default: img = S.walk[(this.animT >> 4) % 2];
    }
    if (this.state === 'sleep') flip = true;
    if (this.state === 'dizzy') {
      ctx.save();
      ctx.translate(Math.round(this.cx), Math.round(this.feet));
      if (flip) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(this.t / 4) * 0.08);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      return;
    }
    drawSprite(ctx, img, this.cx, this.feet, flip, this.flash > 0 ? 1 : 0);
  }
}

// ------------------------------------------------------------------
export class Brute extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.w = 18; this.h = 24;
    this.hp = 8; this.score = 800;
    this.blocksKnives = true;
    this.kb = 0.25; // knockback resist
  }

  damage(G, dmg, fromDir) {
    if (this.dead) return;
    if (this.state === 'slam' && this.t <= 8) {
      // armored during active swing
      G.audio.play('clang');
      G.parts.sparks(this.cx + this.dir * 8, this.y + 10, 4, '#c8d8e8');
      return;
    }
    this.hp -= dmg;
    this.flash = 1;
    G.audio.play('hit');
    G.game.hitStop(G, 45);
    this.vx += fromDir * this.kb;
    G.parts.sparks(this.cx, this.y + 10, 3, '#f0d8b0');
    if (this.hp <= 0) this.die(G);
  }

  tick(G) {
    const p = G.player;
    this.t++;
    const dx = p.cx - this.cx;
    const adx = Math.abs(dx);
    const dy = Math.abs(p.feet - this.feet);

    switch (this.state) {
      case 'idle': {
        this.vx = this.dir * 0.25;
        this.turnAtLedges(G);
        if (!p.dead && adx < 130 && dy < 40) {
          this.dir = Math.sign(dx) || 1;
          this.state = 'chase';
        }
        break;
      }
      case 'chase': {
        if (p.dead) { this.state = 'idle'; break; }
        this.dir = Math.sign(dx) || this.dir;
        this.vx = this.dir * 0.45;
        this.turnAtLedges(G);
        if (adx < 26 && dy < 28) {
          this.state = 'windup';
          this.t = 0;
          this.vx = 0;
          G.audio.play('ewind');
        }
        break;
      }
      case 'windup': {
        this.vx = 0;
        if (this.t > 26) { this.state = 'slam'; this.t = 0; }
        break;
      }
      case 'slam': {
        this.vx = this.dir * 0.6;
        if (this.t >= 3 && this.t <= 8) {
          const hb = { x: this.dir > 0 ? this.x + this.w : this.x - 22, y: this.y - 4, w: 22, h: this.h + 4 };
          if (!p.dead && overlap(hb, p.rect())) p.hurt(G, this.dir);
          if (this.t === 4) { G.cam.addShake(2); G.audio.play('eslash'); G.parts.dust(this.cx + this.dir * 14, this.feet, 5); }
        }
        if (this.t > 34) { this.state = 'chase'; this.t = 0; }
        break;
      }
    }
    this.physics(G);
  }

  draw(ctx, G) {
    const S = G.sprites.BRUTE;
    let img, flip = this.dir < 0;
    switch (this.state) {
      case 'windup': img = S.windup[0]; break;
      case 'slam': img = S.slam[0]; break;
      default: img = S.walk[(this.animT >> 5) % 2];
    }
    drawSprite(ctx, img, this.cx, this.feet, flip, this.flash > 0 ? 1 : 0);
  }
}
