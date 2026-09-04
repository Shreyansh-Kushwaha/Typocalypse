import { isMuted } from '../sound';

// A burst of band-passed white noise - the "radio static" before a transmission.
// Kept separate from sound.ts so the shared sfx module stays untouched.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Resolves when the burst has finished (or after the same delay when audio is unavailable). */
export function playStatic(seconds = 0.4, volume = 0.12): Promise<void> {
  return new Promise(resolve => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    const c = getCtx();
    if (!c || isMuted()) {
      setTimeout(done, seconds * 1000);
      return;
    }
    try {
      const frames = Math.max(1, Math.floor(c.sampleRate * seconds));
      const buffer = c.createBuffer(1, frames, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.5;
      const gain = c.createGain();
      const t = c.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
      gain.gain.setValueAtTime(volume, t + Math.max(0.05, seconds - 0.08));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      src.connect(filter).connect(gain).connect(c.destination);
      src.onended = done;
      src.start(t);
      src.stop(t + seconds);
    } catch {
      /* fall through to the timer */
    }
    setTimeout(done, seconds * 1000 + 120);
  });
}
