
export const audio = {
  ctx: null as AudioContext | null,
  
  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  },

  async play(freq: number, type: OscillatorType, dur: number, vol: number, freqEnd?: number) {
    await this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd && freqEnd > 0) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
    }
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },

  tap() { this.play(800, 'sine', 0.1, 0.05); },
  pop() { this.play(400, 'sine', 0.15, 0.08); },
  swoosh() { this.play(800, 'sine', 0.25, 0.03, 100); },
  ding() { this.play(1200, 'triangle', 0.4, 0.03, 800); },
  thud() { this.play(150, 'sine', 0.2, 0.05, 40); },
  success() {
    this.ding();
    setTimeout(() => this.play(1500, 'triangle', 0.3, 0.02), 80);
  }
};
