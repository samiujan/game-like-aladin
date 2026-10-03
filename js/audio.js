// Audio: WebAudio-synthesized SFX + tiny pattern music sequencer.
// No audio files; everything is oscillators and filtered noise.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;   // music starts off; M toggles it (SFX always on)
    this.track = null;      // current track name
    this.step = 0;
    this.nextTime = 0;
    this.noiseBuf = null;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    this.musGain = this.ctx.createGain();
    this.musGain.gain.value = 0.42;
    this.musGain.connect(this.master);
    // noise buffer
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
  }

  // music-only toggle; returns the new state
  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn && this.ctx) {
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
    }
    return this.musicOn;
  }

  // -------- SFX --------
  env(gainNode, t, a, peak, dec) {
    const g = gainNode.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.001, t + a + dec);
  }

  osc(type, f0, f1, t, dur, peak = 0.3, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    this.env(g, t, 0.004, peak, dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(t, dur, peak = 0.3, filter = 'highpass', freq = 1000, sweepTo) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, peak, dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'jump': this.osc('square', 260, 520, t, 0.12, 0.16); break;
      case 'slash1': this.noise(t, 0.09, 0.22, 'bandpass', 2400, 700); break;
      case 'slash2': this.noise(t, 0.09, 0.24, 'bandpass', 2800, 800); break;
      case 'slash3': this.noise(t, 0.14, 0.26, 'bandpass', 1600, 400); this.osc('square', 700, 1100, t, 0.1, 0.08); break;
      case 'throw': this.noise(t, 0.07, 0.14, 'highpass', 3000, 6000); break;
      case 'clang':
        this.osc('square', 1240, 900, t, 0.1, 0.14);
        this.osc('square', 1860, 1400, t, 0.14, 0.1);
        this.noise(t, 0.05, 0.18, 'highpass', 4000);
        break;
      case 'hit':
        this.osc('square', 220, 90, t, 0.1, 0.22);
        this.noise(t, 0.06, 0.14, 'lowpass', 900);
        break;
      case 'bosshit':
        this.osc('square', 160, 70, t, 0.14, 0.26);
        this.noise(t, 0.08, 0.16, 'lowpass', 700);
        break;
      case 'hurt': this.osc('sawtooth', 420, 130, t, 0.22, 0.2); break;
      case 'die':
        this.osc('square', 520, 380, t, 0.12, 0.18);
        this.osc('square', 380, 260, t + 0.12, 0.12, 0.18);
        this.osc('square', 260, 90, t + 0.24, 0.3, 0.18);
        break;
      case 'coin': this.osc('square', 990, 990, t, 0.05, 0.12); this.osc('square', 1480, 1480, t + 0.05, 0.12, 0.12); break;
      case 'heal': this.osc('triangle', 660, 660, t, 0.07, 0.16); this.osc('triangle', 880, 880, t + 0.07, 0.07, 0.16); this.osc('triangle', 1320, 1320, t + 0.14, 0.14, 0.16); break;
      case 'pickup': this.osc('square', 700, 1000, t, 0.08, 0.12); break;
      case 'chest':
        for (let i = 0; i < 4; i++) this.osc('square', 660 * Math.pow(1.26, i), 660 * Math.pow(1.26, i), t + i * 0.06, 0.1, 0.1);
        break;
      case 'check':
        this.osc('triangle', 587, 587, t, 0.09, 0.15);
        this.osc('triangle', 784, 784, t + 0.1, 0.09, 0.15);
        this.osc('triangle', 1046, 1046, t + 0.2, 0.2, 0.15);
        break;
      case 'smash': this.noise(t, 0.16, 0.3, 'lowpass', 1400, 300); break;
      case 'boing': this.osc('sine', 200, 640, t, 0.16, 0.2); this.osc('sine', 640, 480, t + 0.14, 0.1, 0.12); break;
      case 'thud': this.osc('sine', 130, 45, t, 0.12, 0.3); this.noise(t, 0.07, 0.12, 'lowpass', 500); break;
      case 'slam': this.osc('sine', 110, 35, t, 0.22, 0.4); this.noise(t, 0.16, 0.25, 'lowpass', 700, 150); break;
      case 'alert': this.osc('square', 880, 880, t, 0.06, 0.1); this.osc('square', 880, 880, t + 0.09, 0.06, 0.1); break;
      case 'eslash': this.noise(t, 0.08, 0.12, 'bandpass', 1800, 600); break;
      case 'ethrow': this.noise(t, 0.06, 0.1, 'highpass', 2600, 5000); break;
      case 'ewind': this.osc('sawtooth', 160, 240, t, 0.2, 0.08); break;
      case 'kill':
        this.noise(t, 0.12, 0.2, 'bandpass', 900, 300);
        this.osc('square', 990, 1320, t + 0.05, 0.09, 0.09);
        break;
      case 'grab': this.osc('square', 500, 700, t, 0.05, 0.1); break;
      case 'tick': this.noise(t, 0.03, 0.1, 'highpass', 3000); break;
      case 'bossroar':
        this.osc('sawtooth', 90, 42, t, 0.8, 0.34);
        this.osc('sawtooth', 95, 45, t, 0.8, 0.2);
        this.noise(t, 0.6, 0.12, 'lowpass', 400, 120);
        break;
      case 'bossdie':
        this.osc('sawtooth', 300, 40, t, 1.0, 0.3);
        this.noise(t + 0.4, 0.9, 0.3, 'lowpass', 900, 100);
        break;
      case 'jingle':
        [523, 659, 784, 1046].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.11, 0.16, 0.16));
        break;
    }
  }

  // -------- music --------
  music(name) {
    this.track = name;
    if (this.ctx) { this.step = 0; this.nextTime = this.ctx.currentTime + 0.05; }
  }

  // A minor pentatonic patterns. -1 = rest
  static TRACKS = {
    title:  { bpm: 84, bass: 45, scale: [45, 48, 50, 52, 55, 57, 60],
      mel:  [0,-1, 2,-1, 3,-1, 2,-1, 1,-1,-1,-1, 0,-1,-1,-1, 4,-1, 3,-1, 2,-1, 1,-1, 0,-1,-1,-1,-1,-1,-1,-1],
      harm: [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1, 2,-1, 3,-1, 4,-1,-1,-1],
      kick: [0,8,16,24], tick: [4,12,20,28], drone: true },
    level1: { bpm: 108, bass: 45, scale: [45, 48, 50, 52, 55, 57, 60, 62],
      mel:  [0,-1, 0, 2, 3,-1, 2,-1, 0,-1,-1, 4, 3,-1, 2,-1, 1,-1, 1, 3, 4,-1, 3,-1, 2,-1, 0,-1, 2,-1,-1,-1],
      harm: [-1,-1,-1,-1,-1,-1,-1,-1, 4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1, 5,-1,-1,-1,-1,-1,-1,-1],
      kick: [0,6,8,16,22,24], tick: [4,12,14,20,28,30], drone: true },
    level2: { bpm: 126, bass: 50, scale: [50, 53, 55, 57, 60, 62, 65, 67],
      mel:  [4,-1, 3, 4, 2,-1, 1,-1, 0,-1, 1, 2, 3,-1,-1,-1, 5,-1, 4,-1, 3,-1, 2,-1, 3, 4, 2,-1, 0,-1,-1,-1],
      harm: [-1,-1, 0,-1,-1,-1, 2,-1,-1,-1, 3,-1,-1,-1,-1,-1,-1,-1, 1,-1,-1,-1, 4,-1,-1,-1, 2,-1,-1,-1,-1,-1],
      kick: [0,4,8,12,16,20,24,28], tick: [2,6,10,14,18,22,26,30], drone: false },
    level3: { bpm: 92, bass: 40, scale: [40, 43, 45, 47, 50, 52, 55],
      mel:  [0,-1,-1,-1, 2,-1,-1,-1, 3,-1, 2,-1,-1,-1,-1,-1, 4,-1,-1,-1, 3,-1, 2,-1, 1,-1,-1,-1,-1,-1,-1,-1],
      harm: [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1, 0,-1,-1,-1,-1,-1],
      kick: [0,10,16,26], tick: [8,24], drone: true },
    boss:   { bpm: 148, bass: 38, scale: [38, 41, 44, 45, 48, 50],
      mel:  [0, 0,-1, 0, 3,-1, 2,-1, 0, 0,-1, 1, 2,-1, 1,-1, 0, 0,-1, 0, 4,-1, 3,-1, 2, 2,-1, 3, 4,-1, 5,-1],
      harm: [-1,-1, 4,-1,-1,-1,-1,-1,-1,-1, 3,-1,-1,-1,-1,-1,-1,-1, 5,-1,-1,-1,-1,-1,-1,-1, 2,-1,-1,-1,-1,-1],
      kick: [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30], tick: [4,12,20,28], drone: false },
  };

  update() {
    if (!this.ctx || !this.track || this.muted || !this.musicOn) return;
    const tr = AudioSys.TRACKS[this.track];
    if (!tr) return;
    const stepDur = 60 / tr.bpm / 4;
    // guard against scheduling a burst of catch-up notes after context creation
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      const s = this.step % 32;
      const t = this.nextTime;
      const mi = tr.mel[s];
      if (mi >= 0) this.pluck(NOTE(tr.scale[mi] + 12), t, stepDur * 2.4, 0.16);
      const hi = tr.harm[s];
      if (hi >= 0) this.pluck(NOTE(tr.scale[hi] + 24), t, stepDur * 2, 0.09);
      if (s % 8 === 0) this.bassNote(NOTE(tr.bass), t, stepDur * 7.5);
      if (tr.kick.includes(s)) this.kick(t);
      if (tr.tick.includes(s)) this.tickHat(t);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  pluck(freq, t, dur, peak) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musGain);
    o.start(t); o.stop(t + dur + 0.05);
    // sub layer
    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.type = 'square';
    o2.frequency.value = freq / 2;
    g2.gain.setValueAtTime(peak * 0.35, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);
    o2.connect(g2); g2.connect(this.musGain);
    o2.start(t); o2.stop(t + dur);
  }

  bassNote(freq, t, dur) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.setValueAtTime(0.12, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.musGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.09);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(this.musGain);
    o.start(t); o.stop(t + 0.12);
  }

  tickHat(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    src.connect(f); f.connect(g); g.connect(this.musGain);
    src.start(t); src.stop(t + 0.05);
  }
}
