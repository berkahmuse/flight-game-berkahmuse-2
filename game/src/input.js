// Canyon Courier — keyboard and mouse input, one small state object.
// Keyboard flies the plane; the mouse clicks the menu buttons.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this.pressed = new Set(); // edge-triggered keys, consumed by the game
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.clicked = true;
    });
  }

  // Continuous flight controls, read every frame.
  flight() {
    const k = this.keys;
    const steer = (k.has('KeyA') || k.has('ArrowLeft') ? -1 : 0) + (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    const pitch = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) + (k.has('KeyS') || k.has('ArrowDown') ? -1 : 0);
    return {
      steer,
      pitch,
      throttleUp: k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyE'),
      throttleDown: k.has('ControlLeft') || k.has('ControlRight') || k.has('KeyQ'),
      boost: k.has('Space'),
    };
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumeClick() {
    if (!this.mouse.clicked) return null;
    this.mouse.clicked = false;
    return { x: this.mouse.clickX, y: this.mouse.clickY };
  }

  endFrame() {
    this.pressed.clear();
  }
}
