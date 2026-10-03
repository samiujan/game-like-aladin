// The hero. Movement feel first: coyote time, jump buffering, variable jump,
// 3-hit sword combo with lunge, knife throws, projectile deflects, ledge climb.

import { moveX, moveY, spikeUnderFoot, TILE } from './physics.js';
import { drawSprite } from './sprites.js';
import { Knife } from './projectiles.js';

const GRAV = 0.30, MAXFALL = 6.5;         // floaty, big arcs
const HANG = 0.55;                        // reduced gravity near the apex (Aladdin hang)
const ACC = 0.38, AIRACC = 0.26, MAXRUN = 2.75, FRIC = 0.3;
const JUMPV = -7.9;

export class Player {
  constructor(x, y) {
    // x,y = top-left of hitbox
    this.x = x; this.y = y;
    this.w = 10; this.h = 20;
    this.vx = 0; this.vy = 0;
    this.dir = 1;
    this.hp = 4; this.maxHp = 4;
    this.ammo = 5;
    this.onGround = false;
    this.state = 'move';        // move | slash | throw | hurt | dead | climb
    this.t = 0;                 // frames in current state
    this.slashPhase = 0;        // 1..3
    this.slashQueued = false;
    this.swingId = 0;           // increments per swing; enemies take 1 hit per swing
    this.throwKnifeAt = -1;
    this.invuln = 0;
    this.coyote = 0; this.jbuf = 0;
    this.dropT = 0;
    this.runT = 0;
    this.crouch = false;
    this.dead = false;
    this.deathT = 0;
    this.climbFrom = null; this.climbTo = null;
    this.noClip = false;
    this.flash = 0;
    this.animT = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  // sword hitbox during active slash frames
  swordRect() {
    const r = 20;
    return {
      x: this.dir > 0 ? this.cx + 1 : this.cx - 1 - r,
      y: this.y - 4, w: r, h: this.h + 2,
    };
  }

  startSlash(G) {
    this.state = 'slash';
    this.t = 0;
    this.slashPhase = 1;
    this.slashQueued = false;
    this.swingId++;
    G.audio.play('slash1');
  }

  hurt(G, fromDir) {
    if (this.invuln > 0 || this.dead) return;
    this.hp--;
    G.audio.play('hurt');
    G.cam.addShake(3);
    G.game.hitStop(G, 70);
    G.parts.sparks(this.cx, this.y + 8, 6, '#e86a5c');
    if (this.hp <= 0) {
      this.die(G);
      return;
    }
    this.state = 'hurt';
    this.t = 0;
    this.invuln = 75;
    this.vx = -fromDir * 2.4;
    this.vy = -3.2;
  }

  die(G) {
    this.dead = true;
    this.state = 'dead';
    this.t = 0;
    this.vy = -5;
    G.audio.play('die');
    G.cam.addShake(4);
    G.parts.sparks(this.cx, this.y + 10, 10, '#e86a5c');
  }

  update(G) {
    const inp = G.input;
    this.animT++;
    if (this.invuln > 0) this.invuln--;
    if (this.dropT > 0) this.dropT--;
    if (this.flash > 0) this.flash -= 0.2;

    if (this.state === 'dead') {
      this.deathT++;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      moveY(this, G);
      this.vx *= 0.9;
      moveX(this, G);
      return;
    }

    if (this.state === 'climb') {
      this.t++;
      const k = Math.min(1, this.t / 18);
      this.x = this.climbFrom.x + (this.climbTo.x - this.climbFrom.x) * k;
      this.y = this.climbFrom.y + (this.climbTo.y - this.climbFrom.y) * k;
      if (this.t >= 18) {
        this.noClip = false;
        this.state = 'move';
        this.vx = 0; this.vy = 0;
        G.parts.dust(this.cx, this.feet, 4);
      }
      return;
    }

    if (this.state === 'hurt') {
      this.t++;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      moveY(this, G);
      this.vx *= 0.92;
      moveX(this, G);
      if (this.t > 18 && this.onGround) this.state = 'move';
      // pit
      if (this.y > G.level.py + 24) { this.hp = 0; this.die(G); }
      return;
    }

    if (this.state === 'slash') {
      this.t++;
      const ph = this.slashPhase;
      const finisher = ph === 3;
      // lunge
      if (this.t >= 2 && this.t <= 8) {
        if (this.onGround) this.vx = this.dir * (finisher ? 1.7 : 1.3);
      } else if (this.onGround) {
        this.vx *= 0.8;
      }
      // gravity
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      moveY(this, G);
      moveX(this, G);

      // active frames: 4..10
      if (this.t >= 4 && this.t <= 10) {
        this.doSlashHits(G, finisher);
        // sparks at blade tip
        const sx = this.cx + this.dir * 16, sy = this.y + 8;
        if (this.t % 3 === 0) G.parts.sparks(sx, sy, 1, '#fff8e0');
      }
      // combo input window
      if (inp.hit('sword')) {
        if (this.t >= 5 && this.t <= 15 && ph < 3) this.slashQueued = true;
      }
      // jump cancel out of slash recovery (keeps flow)
      if (this.t > 8 && this.onGround && inp.hit('jump')) {
        this.jbuf = 7;
        this.state = 'move';
      }
      if (this.t >= (finisher ? 20 : 15)) {
        if (this.slashQueued && ph < 3) {
          this.slashPhase = ph + 1;
          this.t = 0;
          this.slashQueued = false;
          this.swingId++;
          G.audio.play(ph === 1 ? 'slash2' : 'slash3');
        } else {
          this.state = 'move';
        }
      }
      if (this.y > G.level.py + 24) { this.hp = 0; this.die(G); }
      return;
    }

    if (this.state === 'throw') {
      this.t++;
      if (this.t === this.throwKnifeAt) {
        G.shots.push(new Knife(this.cx + this.dir * 8, this.y + 6, this.dir * 5.4, -0.9, true));
        G.audio.play('throw');
      }
      if (this.onGround) this.vx *= 0.8;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      moveY(this, G);
      moveX(this, G);
      if (this.t > 12) this.state = 'move';
      return;
    }

    // ------- normal movement -------
    const left = inp.isDown('left'), right = inp.isDown('right');
    const down = inp.isDown('down');

    // crouch
    if (this.onGround && down && this.state === 'move' && !this.crouch) {
      this.crouch = true;
      this.y += 6; this.h = 14;
    } else if ((!down || !this.onGround) && this.crouch) {
      // stand up if room
      const headTy = Math.floor((this.y - 7) / TILE);
      const tx0 = Math.floor((this.x + 1) / TILE), tx1 = Math.floor((this.x + this.w - 1) / TILE);
      let blocked = false;
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = G.level.tiles[headTy * G.level.w + tx];
        if (t === 1 || t === 2) blocked = true;
      }
      if (!blocked) { this.crouch = false; this.y -= 6; this.h = 20; }
    }

    const moveDir = (right ? 1 : 0) - (left ? 1 : 0);
    if (moveDir !== 0 && !this.crouch) {
      this.dir = moveDir;
      const acc = this.onGround ? ACC : AIRACC;
      this.vx += moveDir * acc;
      this.vx = Math.max(-MAXRUN, Math.min(MAXRUN, this.vx));
    } else if (this.onGround) {
      if (Math.abs(this.vx) <= FRIC) this.vx = 0; else this.vx -= Math.sign(this.vx) * FRIC;
    } else {
      this.vx *= 0.99;
    }

    // jump buffering & coyote
    if (inp.hit('jump')) this.jbuf = 7;
    if (this.onGround) this.coyote = 7; else if (this.coyote > 0) this.coyote--;

    // drop through one-way platforms: down + jump
    if (this.jbuf > 0 && this.onGround && down) {
      const t = this.groundTile;
      if (t === 3 || t === 4) {
        this.dropT = 12;
        this.jbuf = 0;
        this.y += 2;
        this.onGround = false;
      }
    }

    if (this.jbuf > 0 && (this.onGround || this.coyote > 0) && !this.crouchBlockedJump()) {
      this.vy = JUMPV;
      this.onGround = false;
      this.coyote = 0; this.jbuf = 0;
      G.audio.play('jump');
      G.parts.dust(this.cx, this.feet, 3);
    }
    if (this.jbuf > 0) this.jbuf--;
    // variable jump height
    if (!inp.isDown('jump') && this.vy < -3.4) this.vy = -3.4;

    // ledge climb
    if (!this.onGround && this.vy > 0.5 && inp.isDown('up')) {
      if (this.tryLedgeGrab(G)) return;
    }

    // sword
    if (inp.hit('sword') && !this.crouch) {
      this.startSlash(G);
      return;
    }
    // knife
    if (inp.hit('knife') && this.ammo > 0) {
      this.ammo--;
      this.state = 'throw';
      this.t = 0;
      this.throwKnifeAt = 4;
      return;
    }

    // physics (gravity lightens near the jump apex for that big Aladdin arc)
    const grav = (!this.onGround && Math.abs(this.vy) < 1.6) ? GRAV * HANG : GRAV;
    this.vy = Math.min(MAXFALL, this.vy + grav);
    const wasGround = this.onGround;
    moveY(this, G);
    moveX(this, G);

    // awning bounce
    if (this.onGround && this.groundTile === 4) {
      this.onGround = false;
      this.vy = -9.4;
      G.audio.play('boing');
      G.parts.dust(this.cx, this.feet, 5, '#f0e6cc');
    }

    // landing dust
    if (!wasGround && this.onGround) G.parts.dust(this.cx, this.feet, 4);

    // spikes
    if (spikeUnderFoot(this, G)) {
      this.vy = -4.5;
      this.hurt(G, -this.dir);
    }

    // ran animation timer
    if (this.onGround) this.runT += Math.abs(this.vx);

    // fell into pit
    if (this.y > G.level.py + 24) { this.hp = 0; this.die(G); }
  }

  crouchBlockedJump() { return false; }

  doSlashHits(G, finisher) {
    const hb = this.swordRect();
    // enemies — once per swing
    for (const e of G.enemies) {
      if (e.dead || e.dying) continue;
      if (e.lastSwingHit === this.swingId) continue;
      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (hb.x < er.x + er.w && hb.x + hb.w > er.x && hb.y < er.y + er.h && hb.y + hb.h > er.y) {
        e.lastSwingHit = this.swingId;
        const dmg = finisher ? 2 : 1;
        e.damage(G, dmg, this.dir);
      }
    }
    // boss
    if (G.boss && !G.boss.dead && !G.boss.dying) {
      const b = G.boss;
      if (b.lastSwingHit !== this.swingId &&
          hb.x < b.x + b.w && hb.x + hb.w > b.x && hb.y < b.y + b.h && hb.y + hb.h > b.y) {
        b.lastSwingHit = this.swingId;
        if (b.guarding) {
          G.audio.play('clang');
          G.parts.sparks(hb.x + (this.dir > 0 ? hb.w : 0), hb.y + 8, 4, '#c8d8e8');
        } else {
          b.damage(G, finisher ? 2 : 1, this.dir);
        }
      }
    }
    // pots
    for (const pk of G.pickups) {
      if (pk.type === 'pot' && !pk.dead) {
        const pr = pk.rect();
        if (hb.x < pr.x + pr.w && hb.x + hb.w > pr.x && hb.y < pr.y + pr.h && hb.y + pr.h > pr.y) {
          pk.smash(G);
        }
      }
    }
    // DEFLECT enemy knives
    for (const s of G.shots) {
      if (!s.friendly && !s.dead) {
        const sr = { x: s.x - 4, y: s.y - 3, w: 8, h: 6 };
        if (hb.x < sr.x + sr.w && hb.x + hb.w > sr.x && hb.y < sr.y + sr.h && hb.y + hb.h > sr.y) {
          s.friendly = true;
          s.reflected = true;
          s.vx = this.dir * 6;
          s.vy = -1.2;
          G.audio.play('clang');
          G.parts.sparks(s.x, s.y, 7, '#fff0b0');
          G.game.hitStop(G, 60);
          G.cam.addShake(1.5);
          G.game.addScore(G, 50, s.x, s.y - 8);
        }
      }
    }
  }

  tryLedgeGrab(G) {
    const fdir = this.dir;
    const frontX = fdir > 0 ? this.x + this.w : this.x;
    const tx = Math.floor((frontX + fdir * 2) / TILE);
    const tyFeet = Math.floor((this.feet - 2) / TILE);
    const solid = (x, y) => {
      const t = G.level.tiles[y * G.level.w + x];
      return t === 1 || t === 2;
    };
    if (!solid(tx, tyFeet)) return false;
    if (solid(tx, tyFeet - 1)) return false;         // not a ledge top
    const top = tyFeet * TILE;
    if (this.feet < top - 14) return false;          // ledge too far above
    // climb up & forward
    this.noClip = true;
    this.state = 'climb';
    this.t = 0;
    const targetX = fdir > 0 ? tx * TILE - this.w - 1 : (tx + 1) * TILE + 1;
    this.climbFrom = { x: this.x, y: this.y };
    this.climbTo = { x: targetX, y: top - this.h };
    this.vx = 0; this.vy = 0;
    G.audio.play('grab');
    return true;
  }

  draw(ctx, G) {
    const S = G.HERO;
    // blink while invulnerable
    if (this.invuln > 0 && (G.frame >> 2) % 2 === 0 && !this.dead) return;
    let img;
    const flip = this.dir < 0;
    const bob = (this.state === 'move' && Math.abs(this.vx) < 0.3 && this.onGround && (G.frame >> 5) % 2) ? 1 : 0;
    switch (this.state) {
      case 'dead': img = S.dead[0]; break;
      case 'hurt': img = S.hurt[0]; break;
      case 'climb': img = S.climb[(G.frame >> 3) % 2]; break;
      case 'slash': {
        const set = this.slashPhase === 1 ? S.slash1 : this.slashPhase === 2 ? S.slash2 : S.slash3;
        img = this.t < 6 ? set[0] : set[1];
        break;
      }
      case 'throw': img = this.t < 7 ? S.throw[0] : S.throw[1]; break;
      default:
        if (!this.onGround) img = this.vy < 0 ? S.jump[0] : S.fall[0];
        else if (this.crouch) img = S.crouch[0];
        else if (Math.abs(this.vx) > 0.3) img = S.run[Math.floor(this.runT / 5) % 6];
        else img = S.idle[0];
    }
    drawSprite(ctx, img, this.cx, this.feet + bob, flip, this.flash > 0 ? 1 : 0);
    // slash motion arc during active frames (drawn over the sprite)
    if (this.state === 'slash' && this.t >= 3 && this.t <= 11) {
      const sw = this.slashPhase === 3 ? G.sprites.SwipeUp : G.sprites.SwipeFwd;
      ctx.globalAlpha = Math.max(0.2, 1 - (this.t - 3) / 9);
      if (this.slashPhase === 3) {
        const dx = Math.round(this.cx + this.dir * 5 - sw.width / 2);
        const dy = Math.round(this.feet - sw.height);
        if (this.dir > 0) ctx.drawImage(sw, dx, dy);
        else {
          ctx.save();
          ctx.translate(dx + sw.width, dy);
          ctx.scale(-1, 1);
          ctx.drawImage(sw, 0, 0);
          ctx.restore();
        }
      } else if (this.dir > 0) {
        ctx.drawImage(sw, Math.round(this.cx - 3), Math.round(this.feet - sw.height - 3));
      } else {
        ctx.save();
        ctx.translate(Math.round(this.cx + 3 - sw.width), Math.round(this.feet - sw.height - 3));
        ctx.scale(-1, 1);
        ctx.drawImage(sw, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }
}
