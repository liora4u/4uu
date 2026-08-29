/**
 * Interface sounds, synthesized with Web Audio.
 *
 * No audio files: these are shaped oscillators, so they add nothing to page
 * weight and cannot go missing. They follow the same on/off switch as the music.
 */

let ctx = null;

function audio() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

function enabled() {
  try {
    return JSON.parse(sessionStorage.getItem('ood.audio') || '{}').on !== false;
  } catch {
    return true;
  }
}

/** One shaped tone. Everything below is a combination of these. */
function tone({ freq, to = freq, type = 'sine', at = 0, dur = 0.12, gain = 0.05 }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at;

  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Filtered noise, for the mechanical part of the lock-in. */
function noise({ at = 0, dur = 0.14, gain = 0.035, freq = 1400 }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;

  const amp = c.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter).connect(amp).connect(c.destination);
  src.start(t0);
}

const guard = (fn) => (...args) => {
  if (!enabled()) return;
  const c = audio();
  if (c?.state === 'suspended') c.resume();
  fn(...args);
};

/** Hover / focus blip. */
export const tick = guard(() => tone({ freq: 1250, type: 'square', dur: 0.035, gain: 0.018 }));

/** The no button squirming away. */
export const dodge = guard(() => {
  tone({ freq: 460, to: 300, type: 'triangle', dur: 0.09, gain: 0.03 });
  noise({ dur: 0.06, gain: 0.014, freq: 2400 });
});

/** Agent-select lock-in: a mechanical clunk under a rising confirm. */
export const lock = guard(() => {
  noise({ dur: 0.2, gain: 0.05, freq: 900 });
  tone({ freq: 150, to: 70, type: 'sawtooth', dur: 0.28, gain: 0.06 });
  tone({ freq: 520, to: 780, type: 'sine', at: 0.06, dur: 0.3, gain: 0.045 });
  tone({ freq: 780, to: 1180, type: 'sine', at: 0.16, dur: 0.34, gain: 0.035 });
});

/** Queue confirmed: a three-note ascending chime. */
export const confirm = guard(() => {
  [523.25, 659.25, 987.77].forEach((freq, i) =>
    tone({ freq, type: 'sine', at: i * 0.1, dur: 0.42, gain: 0.04 }),
  );
});

/** Wire hover/focus ticks onto anything interactive. */
export function armTicks(root = document) {
  root.querySelectorAll('.btn, .steps a').forEach((el) => {
    el.addEventListener('pointerenter', tick);
    el.addEventListener('focus', tick);
  });
}
