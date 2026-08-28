// Tiny WebAudio synth - no audio assets, everything generated.
// All calls are safe no-ops until the first user gesture creates the context.

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('typo-muted') === '1';
} catch { /* storage unavailable */ }

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
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
    osc.connect(g).connect(a.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

let lastKey = 0;

export const sfx = {
  /** soft mechanical click for a correct keystroke, throttled */
  key() {
    const now = performance.now();
    if (now - lastKey < 28) return;
    lastKey = now;
    play([{ freq: 2200 + Math.random() * 600, dur: 0.015, type: 'triangle', gain: 0.025 }]);
  },
  error() {
    play([{ freq: 160, dur: 0.12, type: 'sawtooth', gain: 0.07, slide: 90 }]);
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
