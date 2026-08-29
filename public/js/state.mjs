/** Flow state carried between pages. sessionStorage can throw, so every access is guarded. */

const KEY = 'ood.v1';

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export const state = {
  get(prop, fallback = null) {
    const value = read()[prop];
    return value === undefined ? fallback : value;
  },

  set(patch) {
    const next = { ...read(), ...patch };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — the flow still works, it just forgets on reload */
    }
    return next;
  },

  all: read,
};
