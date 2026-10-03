// Keyboard input with per-frame edge detection and jump buffering helpers.

const MAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'jump', z: 'jump', Z: 'jump',
  x: 'sword', X: 'sword', j: 'sword', J: 'sword',
  c: 'knife', C: 'knife', k: 'knife', K: 'knife',
  Enter: 'start',
  m: 'mute', M: 'mute',
  p: 'pause', P: 'pause',
};

export class Input {
  constructor() {
    this.down = {};      // action -> bool
    this.pressed = {};   // action -> true only on the frame the key went down
    window.addEventListener('keydown', (e) => {
      const a = MAP[e.key];
      if (!a) return;
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
      if (!this.down[a]) this.pressed[a] = true;
      this.down[a] = true;
    });
    window.addEventListener('keyup', (e) => {
      const a = MAP[e.key];
      if (!a) return;
      this.down[a] = false;
    });
    window.addEventListener('blur', () => { this.down = {}; });
  }
  isDown(a) { return !!this.down[a]; }
  hit(a) { return !!this.pressed[a]; }
  endFrame() { this.pressed = {}; }
}
