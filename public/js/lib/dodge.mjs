/**
 * Geometry for the button that refuses to be clicked.
 *
 * Kept pure and DOM-free so it can be unit tested: the whole point of this
 * button is that it must never end up off-screen or underneath something else,
 * and that is exactly the kind of bug you only find on a 768px iPad at 11pm.
 */

const PADDING = 12;
const TRIES = 60;
const MIN_TRAVEL = 160; // px the button should clear so the pointer is left behind

export function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/**
 * Pick the button's next resting place.
 *
 * Guarantees, in priority order:
 *   1. the result is always inside the viewport (clamped, never negative);
 *   2. it avoids every rect in `avoid` when that is geometrically possible;
 *   3. it lands far from `from`, so the pointer is not still hovering it.
 */
export function nextDodgePosition({
  button,
  viewport,
  avoid = [],
  from = null,
  padding = PADDING,
  random = Math.random,
}) {
  // On a viewport barely larger than the button there is no room to pad.
  const maxLeft = viewport.width - button.width;
  const maxTop = viewport.height - button.height;
  const pad = Math.min(padding, Math.max(0, maxLeft / 2), Math.max(0, maxTop / 2));

  const lo = { left: pad, top: pad };
  const hi = { left: Math.max(pad, maxLeft - pad), top: Math.max(pad, maxTop - pad) };

  let fallback = null;
  let fallbackScore = -Infinity;

  for (let i = 0; i < TRIES; i += 1) {
    const left = Math.round(lo.left + random() * (hi.left - lo.left));
    const top = Math.round(lo.top + random() * (hi.top - lo.top));
    const rect = { left, top, right: left + button.width, bottom: top + button.height };

    const blocked = avoid.some((r) => intersects(rect, r));
    const travel = from ? Math.hypot(left - from.left, top - from.top) : Infinity;

    if (!blocked && travel >= MIN_TRAVEL) return { left, top };

    // Remember the least-bad candidate in case nothing clean exists.
    const score = (blocked ? -1e6 : 0) + travel;
    if (score > fallbackScore) {
      fallbackScore = score;
      fallback = { left, top };
    }
  }

  const chosen = fallback ?? { left: lo.left, top: lo.top };
  return {
    left: clamp(chosen.left, 0, Math.max(0, maxLeft)),
    top: clamp(chosen.top, 0, Math.max(0, maxTop)),
  };
}

// Each failed attempt makes YES a little louder and NO a little more hopeless.
const LABELS = ['no', 'no?', 'n o', 'nope', 'n0', 'no..', 'ok fine yes'];

export function dodgeStep(count) {
  const n = Math.min(count, LABELS.length - 1);
  const t = n / (LABELS.length - 1);
  return {
    label: LABELS[n],
    // Faint enough to lose next to Yes, but still findable — if she cannot see
    // where it went, the dodge reads as the button vanishing rather than fleeing.
    noScale: Number((1 - 0.35 * t).toFixed(3)),
    noOpacity: Number((0.44 - 0.16 * t).toFixed(3)),
    yesScale: Number((1 + 0.25 * t).toFixed(3)),
    taunt: n,
  };
}
