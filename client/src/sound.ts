// Tiny WebAudio synth - no audio assets, everything generated.
// All calls are safe no-ops until the first user gesture creates the context.
//
// Sound packs change how key() and error() sound; every other cue is shared.
//   setSoundPack('mech' | 'typewriter' | 'bubble' | 'laser' | 'synth')
//   setVolume(0..1)   isMuted() / toggleMute()

export type SoundPack = 'synth' | 'mech' | 'typewriter' | 'bubble' | 'laser';
export const SOUND_PACK_KEYS: SoundPack[] = ['synth', 'mech', 'typewriter', 'bubble', 'laser'];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let volume = 1;
let pack: SoundPack = 'synth';
try {
  muted = localStorage.getItem('typo-muted') === '1';
  const v = parseFloat(localStorage.getItem('typo-volume') || '');
  if (Number.isFinite(v)) volume = Math.min(1, Math.max(0, v));
  const p = localStorage.getItem('typo-sound-pack') as SoundPack | null;
  if (p && SOUND_PACK_KEYS.includes(p)) pack = p;
} catch { /* storage unavailable */ }

function ac(): AudioContext | null {
  if (muted || volume <= 0) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function out(): AudioNode {
  return master ?? ctx!.destination;
}

function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const len = Math.floor(a.sampleRate * 0.12);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

interface Tone {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slide?: number; // target frequency to glide to
}

function play(tones: Tone[]) {
  const a = ac();
  if (!a) return;
  const now = a.currentTime;
  for (const t of tones) {
    const osc = a.createOscillator();
    const g = a.createGain();
    const start = now + (t.at ?? 0);
    const dur = t.dur ?? 0.08;
    osc.type = t.type ?? 'square';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.slide) osc.frequency.exponentialRampToValueAtTime(t.slide, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(t.gain ?? 0.06, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(out());
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

interface Burst {
  dur?: number;
  gain?: number;
  at?: number;
  filter?: BiquadFilterType;
  freq?: number; // filter frequency
  q?: number;
}

/** filtered white-noise burst - clicks, thocks, clacks */
function burst(b: Burst) {
  const a = ac();
  if (!a) return;
  const start = a.currentTime + (b.at ?? 0);
  const dur = b.dur ?? 0.03;
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = b.filter ?? 'lowpass';
  f.frequency.value = b.freq ?? 1200;
  f.Q.value = b.q ?? 0.8;
  const g = a.createGain();
  g.gain.setValueAtTime(b.gain ?? 0.08, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(out());
  src.start(start);
  src.stop(start + dur + 0.01);
}

let lastKey = 0;
let keyCount = 0;

const KEY: Record<SoundPack, () => void> = {
  synth() {
    play([{ freq: 2200 + Math.random() * 600, dur: 0.015, type: 'triangle', gain: 0.025 }]);
  },
  mech() {
    burst({ dur: 0.028, gain: 0.09, filter: 'bandpass', freq: 2600 + Math.random() * 800, q: 0.7 });
    play([{ freq: 180 + Math.random() * 20, dur: 0.045, type: 'sine', gain: 0.07, slide: 120 }]);
  },
  typewriter() {
    burst({ dur: 0.014, gain: 0.1, filter: 'highpass', freq: 3200, q: 0.5 });
    play([{ freq: 1900 + Math.random() * 300, dur: 0.012, type: 'square', gain: 0.02 }]);
    keyCount += 1;
    if (keyCount % 40 === 0) {
      play([{ freq: 2637, dur: 0.4, type: 'triangle', gain: 0.05, at: 0.03 }]);
    }
  },
  bubble() {
    play([{ freq: 900, dur: 0.06, type: 'sine', gain: 0.06, slide: 400 }]);
  },
  laser() {
    play([{ freq: 1200, dur: 0.06, type: 'square', gain: 0.03, slide: 300 }]);
  },
};

const ERROR: Record<SoundPack, () => void> = {
  synth() {
    play([{ freq: 160, dur: 0.12, type: 'sawtooth', gain: 0.07, slide: 90 }]);
  },
  mech() {
    burst({ dur: 0.08, gain: 0.12, filter: 'lowpass', freq: 240, q: 1 });
    play([{ freq: 95, dur: 0.1, type: 'sine', gain: 0.08, slide: 60 }]);
  },
  typewriter() {
    burst({ dur: 0.02, gain: 0.12, filter: 'highpass', freq: 2000 });
    burst({ dur: 0.02, gain: 0.12, filter: 'highpass', freq: 2000, at: 0.07 });
    play([{ freq: 140, dur: 0.1, type: 'sawtooth', gain: 0.04, at: 0.07, slide: 90 }]);
  },
  bubble() {
    play([{ freq: 300, dur: 0.14, type: 'sine', gain: 0.07, slide: 140 }]);
  },
  laser() {
    play([{ freq: 220, dur: 0.12, type: 'square', gain: 0.04, slide: 70 }]);
  },
};

export const sfx = {
  /** keystroke hit, throttled; the sound depends on the equipped pack */
  key() {
    const now = performance.now();
    if (now - lastKey < 28) return;
    lastKey = now;
    KEY[pack]();
  },
  error() {
    ERROR[pack]();
  },
  /** finished a word/zombie/sentence */
  pop() {
    play([{ freq: 700, dur: 0.05, type: 'triangle', gain: 0.05, slide: 1100 }]);
  },
  /** finished a passage / won a leg */
  success() {
    play([
      { freq: 523, dur: 0.09, type: 'square', gain: 0.05 },
      { freq: 659, dur: 0.09, at: 0.09, type: 'square', gain: 0.05 },
      { freq: 784, dur: 0.16, at: 0.18, type: 'square', gain: 0.05 },
    ]);
  },
  combo(n: number) {
    play([{ freq: 500 + Math.min(n, 8) * 90, dur: 0.06, type: 'triangle', gain: 0.05 }]);
  },
  countdown() {
    play([{ freq: 880, dur: 0.08, type: 'sine', gain: 0.06 }]);
  },
  go() {
    play([{ freq: 660, dur: 0.2, type: 'sine', gain: 0.07, slide: 1320 }]);
  },
  /** something bad landed - breach, attack, elimination */
  alarm() {
    play([
      { freq: 300, dur: 0.1, type: 'sawtooth', gain: 0.07 },
      { freq: 240, dur: 0.14, at: 0.1, type: 'sawtooth', gain: 0.07 },
    ]);
  },
  win() {
    play([
      { freq: 523, dur: 0.12, type: 'square', gain: 0.06 },
      { freq: 659, dur: 0.12, at: 0.12, type: 'square', gain: 0.06 },
      { freq: 784, dur: 0.12, at: 0.24, type: 'square', gain: 0.06 },
      { freq: 1047, dur: 0.3, at: 0.36, type: 'square', gain: 0.07 },
    ]);
  },
  lose() {
    play([
      { freq: 392, dur: 0.16, type: 'sawtooth', gain: 0.06 },
      { freq: 330, dur: 0.16, at: 0.16, type: 'sawtooth', gain: 0.06 },
      { freq: 262, dur: 0.34, at: 0.32, type: 'sawtooth', gain: 0.07, slide: 180 },
    ]);
  },
};

/** Play a short demo of a pack (used by the settings "test" buttons). */
export function previewPack(key: SoundPack) {
  const prev = pack;
  pack = key;
  lastKey = 0;
  const a = ac();
  if (!a) { pack = prev; return; }
  let i = 0;
  const step = () => {
    if (i < 5) { lastKey = 0; KEY[key](); i += 1; setTimeout(step, 90); }
    else { ERROR[key](); pack = prev; }
  };
  step();
}

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem('typo-muted', muted ? '1' : '0');
  } catch { /* storage unavailable */ }
  return muted;
}

export function setMuted(m: boolean) {
  if (m !== muted) toggleMute();
}

export function getSoundPack(): SoundPack {
  return pack;
}

export function setSoundPack(key: string) {
  if (!SOUND_PACK_KEYS.includes(key as SoundPack)) return;
  pack = key as SoundPack;
  try { localStorage.setItem('typo-sound-pack', pack); } catch { /* storage unavailable */ }
}

export function getVolume(): number {
  return volume;
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 1));
  if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
  try { localStorage.setItem('typo-volume', String(volume)); } catch { /* storage unavailable */ }
}
