const MUTE_KEY = 'lemonroad_muted';

type SoundId =
  | 'scream'
  | 'slip'
  | 'lemon'
  | 'error'
  | 'kazoo'
  | 'knife'
  | 'bonk'
  | 'start'
  | 'squeeze';

/** Cartoon game BGM — bouncy major arpeggio + bass */
const BGM_MELODY = [523, 659, 784, 1047, 784, 659, 587, 659];
const BGM_BASS = [131, 165, 196, 262];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgTimer: ReturnType<typeof setInterval> | null = null;
  private bgStep = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === 'true';
    } catch {
      this.muted = false;
    }
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, String(this.muted));
    } catch {
      /* ignore */
    }
    if (this.muted) {
      this.stopBg();
    } else {
      this.startBg();
    }
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, String(m));
    } catch {
      /* ignore */
    }
    if (m) this.stopBg();
    else this.startBg();
  }

  resume(): void {
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  startBg(): void {
    if (this.muted) return;
    if (this.bgTimer) return;
    const ctx = this.ensureCtx();

    const tick = () => {
      if (this.muted || !this.ctx) return;
      const i = this.bgStep;
      const freq = BGM_MELODY[i % BGM_MELODY.length];
      const bass = BGM_BASS[Math.floor(i / 2) % BGM_BASS.length];
      this.playNote(ctx, freq, 0.11, 'square', 0.06);
      if (i % 2 === 0) {
        this.playNote(ctx, bass, 0.18, 'triangle', 0.05);
      }
      if (i % 4 === 0) {
        this.playNote(ctx, freq * 2, 0.06, 'sine', 0.025);
      }
      this.bgStep++;
    };

    tick();
    this.bgTimer = setInterval(tick, 260);
  }

  stopBg(): void {
    if (this.bgTimer) {
      clearInterval(this.bgTimer);
      this.bgTimer = null;
    }
  }

  private playNote(
    ctx: AudioContext,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(id: SoundId): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') void ctx.resume();

    switch (id) {
      case 'scream':
        this.tone(ctx, 880, 0.15, 'sawtooth', 0.35, 0.05);
        this.tone(ctx, 440, 0.25, 'square', 0.3, 0.12);
        this.noise(ctx, 0.2, 0.25);
        break;
      case 'slip':
        this.sweep(ctx, 600, 200, 0.2, 0.2);
        break;
      case 'lemon':
        this.tone(ctx, 523, 0.08, 'sine', 0.25, 0);
        this.tone(ctx, 659, 0.08, 'sine', 0.25, 0.08);
        this.tone(ctx, 784, 0.15, 'triangle', 0.3, 0.16);
        break;
      case 'error':
        this.tone(ctx, 200, 0.1, 'square', 0.2, 0);
        this.tone(ctx, 150, 0.15, 'square', 0.2, 0.1);
        break;
      case 'kazoo':
        for (let i = 0; i < 6; i++) {
          this.tone(ctx, 300 + i * 50, 0.12, 'sawtooth', 0.15, i * 0.14);
        }
        break;
      case 'knife':
        this.noise(ctx, 0.08, 0.35);
        this.sweep(ctx, 1200, 400, 0.1, 0.15);
        break;
      case 'bonk':
        this.tone(ctx, 180, 0.08, 'square', 0.35, 0);
        break;
      case 'squeeze':
        this.tone(ctx, 320, 0.06, 'square', 0.2, 0);
        this.tone(ctx, 180, 0.1, 'triangle', 0.25, 0.04);
        this.sweep(ctx, 400, 120, 0.12, 0.15);
        break;
      case 'start':
        this.tone(ctx, 392, 0.1, 'triangle', 0.2, 0);
        this.tone(ctx, 523, 0.15, 'triangle', 0.25, 0.1);
        this.tone(ctx, 659, 0.12, 'square', 0.15, 0.2);
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.05);
  }

  private sweep(
    ctx: AudioContext,
    from: number,
    to: number,
    dur: number,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  private noise(ctx: AudioContext, dur: number, vol: number): void {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * vol;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }
}

export function eventToSound(id: string): SoundId | null {
  const map: Record<string, SoundId> = {
    rug_pull: 'scream',
    irs: 'bonk',
    lemonade_spill: 'error',
    knife: 'scream',
    dancing: 'kazoo',
    market_crash: 'error',
    bull_run: 'lemon',
  };
  return map[id] ?? null;
}
