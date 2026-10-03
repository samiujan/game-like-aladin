// Camera: lookahead follow with clamping to level bounds + shake.

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.shake = 0;          // decaying magnitude in px
    this.lockedTo = null;    // {x0, x1} pixel range when boss locks the arena
  }

  follow(target, G, instant = false) {
    const viewW = 320, viewH = 180;
    const look = target.dir * 28;
    let tx = target.x + target.w / 2 - viewW / 2 + look;
    let ty = target.y + target.h / 2 - viewH * 0.58;
    const maxX = G.level.px - viewW;
    if (this.lockedTo) {
      tx = Math.max(this.lockedTo.x0, Math.min(this.lockedTo.x1 - viewW, tx));
    } else {
      tx = Math.max(0, Math.min(maxX, tx));
    }
    ty = Math.max(0, Math.min(Math.max(0, G.level.py - viewH), ty));
    if (instant) { this.x = tx; this.y = ty; return; }
    this.x += (tx - this.x) * 0.12;
    this.y += (ty - this.y) * 0.10;
  }

  addShake(n) { this.shake = Math.min(8, this.shake + n); }

  update() {
    this.shake *= 0.86;
    if (this.shake < 0.3) this.shake = 0;
  }

  // Apply translate for world drawing; returns the jitter offsets.
  apply(ctx) {
    const sx = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    const sy = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    const ox = Math.round(this.x + sx);
    const oy = Math.round(this.y + sy);
    ctx.translate(-ox, -oy);
    return [ox, oy];
  }
}
