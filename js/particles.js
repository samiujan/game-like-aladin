// Particles: dust, sparks, puffs, coin-flies, floating text.

export class Particles {
  constructor() { this.list = []; }

  clear() { this.list = []; }

  dust(x, y, n = 4, col = '#c9b8a0') {
    for (let i = 0; i < n; i++) {
      this.list.push({
        kind: 'dust', x: x + (Math.random() * 8 - 4), y: y + (Math.random() * 3 - 1),
        vx: Math.random() * 1.2 - 0.6, vy: -Math.random() * 0.7,
        life: 18 + Math.random() * 10, t: 0, r: 1 + Math.random() * 2, col,
      });
    }
  }

  sparks(x, y, n = 6, col = '#fff0b0') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 2.5;
      this.list.push({
        kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5,
        life: 10 + Math.random() * 8, t: 0, col,
      });
    }
  }

  puff(x, y, col = '#f0e8d8', big = 1) {
    this.list.push({ kind: 'puff', x, y, vx: 0, vy: -0.15, life: 22, t: 0, r: 3 * big, col });
    this.list.push({ kind: 'puff', x: x - 4, y: y + 2, vx: -0.3, vy: -0.3, life: 18, t: 0, r: 2.2 * big, col });
    this.list.push({ kind: 'puff', x: x + 4, y: y + 2, vx: 0.3, vy: -0.3, life: 18, t: 0, r: 2.2 * big, col });
  }

  coinFly(x, y) {
    this.list.push({
      kind: 'coin', x, y, vx: (Math.random() * 2 - 1) * 1.2, vy: -2.4 - Math.random(),
      life: 32, t: 0,
    });
  }

  text(x, y, str, col = '#f2ca58') {
    this.list.push({ kind: 'text', x, y, vx: 0, vy: -0.45, life: 45, t: 0, str, col });
  }

  update(G) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t++;
      p.x += p.vx; p.y += p.vy;
      if (p.kind === 'spark' || p.kind === 'coin') p.vy += 0.12;
      if (p.kind === 'dust') p.vx *= 0.94;
      if (p.kind === 'leaf') p.vx = Math.sin((p.t + p.ph) / 18) * 0.45;
      if (p.t >= p.life) this.list.splice(i, 1);
    }
  }

  draw(ctx, G) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      if (p.kind === 'dust') {
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x - p.r / 2), Math.round(p.y - p.r / 2), Math.ceil(p.r), Math.ceil(p.r));
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        ctx.fillRect(Math.round(p.x - p.vx), Math.round(p.y - p.vy), 1, 1);
      } else if (p.kind === 'puff') {
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = p.col;
        const r = p.r * (1 + p.t / p.life * 1.6);
        // chunky pixel circle
        for (let a = 0; a < 8; a++) {
          const ang = a / 8 * Math.PI * 2;
          ctx.fillRect(Math.round(p.x + Math.cos(ang) * r - 1), Math.round(p.y + Math.sin(ang) * r - 1), 2, 2);
        }
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
      } else if (p.kind === 'coin') {
        ctx.globalAlpha = Math.min(1, k * 2);
        const frames = G.sprites.CoinFly;
        const f = frames[(p.t >> 2) % frames.length];
        ctx.drawImage(f, Math.round(p.x - f.width / 2), Math.round(p.y - f.height / 2));
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, k * 3);
        G.drawText(ctx, p.str, Math.round(p.x), Math.round(p.y), p.col, 1);
      } else if (p.kind === 'leaf') {
        ctx.globalAlpha = Math.max(0, Math.min(1, (1 - p.t / p.life) * 4));
        ctx.fillStyle = '#e8944c';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        ctx.fillStyle = '#c96f2a';
        ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1);
      } else if (p.kind === 'fly') {
        const blink = (Math.sin((p.t + p.ph) / 8) + 1) / 2;
        ctx.globalAlpha = blink * 0.9;
        ctx.fillStyle = '#f2e08c';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}
