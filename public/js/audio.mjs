/**
 * Background music that survives page navigation.
 *
 * The site is multi-page, so a fresh <audio> is created on every load. Playback
 * position and on/off are kept in sessionStorage and restored, which makes six
 * separate documents feel like one continuous track.
 *
 * Browsers block audio until the visitor interacts, so playback is armed on the
 * first pointer or key event rather than attempted on load. If the track file is
 * missing the control removes itself instead of showing a dead button.
 */

const TRACK = 'audio/ticking-away.mp3';
const KEY = 'ood.audio';
const VOLUME = 0.42;

const store = {
  read() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  },
  write(patch) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ ...store.read(), ...patch }));
    } catch {
      /* ignore */
    }
  },
};

export function initAudio() {
  const toggle = document.querySelector('[data-audio-toggle]');
  if (!toggle) return null;

  const saved = store.read();
  const el = new Audio(TRACK);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  el.currentTime = Number(saved.time) || 0;

  let muted = saved.on === false;
  let armed = false;

  // No track file dropped in yet: hide the control rather than offer a no-op.
  el.addEventListener('error', () => {
    toggle.hidden = true;
  });

  const paint = () => {
    const on = !muted && !el.paused;
    toggle.dataset.playing = String(on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.querySelector('[data-audio-label]').textContent = on ? 'Sound on' : 'Sound off';
  };

  // Fade rather than cut, so navigating between pages is not a series of clicks.
  const fadeTo = (target) => {
    const from = el.volume;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 420);
      el.volume = from + (target - from) * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const play = async () => {
    try {
      await el.play();
      fadeTo(VOLUME);
    } catch {
      // Autoplay refused; the next real interaction will try again.
    }
    paint();
  };

  const arm = () => {
    if (armed) return;
    armed = true;
    if (!muted) play();
  };

  ['pointerdown', 'keydown', 'touchstart'].forEach((evt) =>
    window.addEventListener(evt, arm, { once: true, passive: true }),
  );

  toggle.addEventListener('click', () => {
    muted = !muted;
    armed = true;
    store.write({ on: !muted });
    if (muted) {
      el.pause();
      paint();
    } else {
      play();
    }
  });

  const remember = () => store.write({ time: el.currentTime, on: !muted });
  setInterval(remember, 2000);
  window.addEventListener('pagehide', remember);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) remember();
  });

  paint();
  return el;
}
