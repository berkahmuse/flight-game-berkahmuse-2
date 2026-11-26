// Canyon Courier — tiny synthesized sound: engine hum, ring chime,
// landing fanfare and crash thud. All WebAudio, no audio files, and it
// only starts after the first user gesture, so it never blocks loading.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.enabled = true;
  }

  unlock() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Engine: two detuned sawtooths through a low-pass filter.
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.value = 52;
      osc2.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0;
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start();
      osc2.start();
      this.engine = { osc1, osc2, gain, filter };
    } catch {
      this.ctx = null;
    }
  }

  setEngine(speedNorm, flying) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = flying && this.enabled ? 0.05 + speedNorm * 0.05 : 0;
    this.engine.gain.gain.setTargetAtTime(target, t, 0.1);
    this.engine.osc1.frequency.setTargetAtTime(46 + speedNorm * 70, t, 0.1);
    this.engine.osc2.frequency.setTargetAtTime(49 + speedNorm * 74, t, 0.1);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || !this.enabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch { /* sound is decoration; never break the game */ }
  }

  ring(perfect) {
    this.blip(880, 0.18, 'sine', 0.14);
    setTimeout(() => this.blip(perfect ? 1760 : 1320, 0.22, 'sine', 0.12), 70);
  }

  thud() {
    this.blip(70, 0.5, 'triangle', 0.3);
    setTimeout(() => this.blip(45, 0.6, 'sine', 0.25), 60);
  }

  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.14), i * 110));
  }
}
