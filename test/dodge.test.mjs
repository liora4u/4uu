import test from 'node:test';
import assert from 'node:assert/strict';
import { intersects, nextDodgePosition, dodgeStep } from '../public/js/lib/dodge.mjs';

const VIEWPORT = { width: 1280, height: 800 };
const BUTTON = { width: 120, height: 48 };
const inside = (p, btn, vp, pad = 12) =>
  p.left >= pad && p.top >= pad && p.left + btn.width <= vp.width - pad && p.top + btn.height <= vp.height - pad;

test('intersects detects overlap and separation', () => {
  const a = { left: 0, top: 0, right: 100, bottom: 100 };
  assert.equal(intersects(a, { left: 50, top: 50, right: 150, bottom: 150 }), true);
  assert.equal(intersects(a, { left: 100, top: 0, right: 200, bottom: 100 }), false, 'touching edges do not overlap');
  assert.equal(intersects(a, { left: 300, top: 300, right: 400, bottom: 400 }), false);
});

test('always lands fully inside the viewport safe area', () => {
  for (let i = 0; i < 500; i += 1) {
    const p = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT });
    assert.ok(inside(p, BUTTON, VIEWPORT), 'escaped viewport: ' + JSON.stringify(p));
  }
});

test('never overlaps the rects it is told to avoid', () => {
  const avoid = [
    { left: 0, top: 0, right: 1280, bottom: 72 }, // HUD bar
    { left: 440, top: 300, right: 840, bottom: 460 }, // the YES button
  ];
  for (let i = 0; i < 500; i += 1) {
    const p = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT, avoid });
    const rect = { left: p.left, top: p.top, right: p.left + BUTTON.width, bottom: p.top + BUTTON.height };
    for (const a of avoid) assert.equal(intersects(rect, a), false, 'overlapped ' + JSON.stringify(a));
  }
});

test('stays in bounds on a phone-sized viewport', () => {
  const vp = { width: 390, height: 664 };
  const btn = { width: 90, height: 36 };
  const avoid = [{ left: 0, top: 0, right: 390, bottom: 64 }];
  for (let i = 0; i < 300; i += 1) {
    const p = nextDodgePosition({ button: btn, viewport: vp, avoid });
    assert.ok(inside(p, btn, vp), 'escaped: ' + JSON.stringify(p));
  }
});

test('clamps rather than going negative when the button barely fits', () => {
  const vp = { width: 130, height: 60 };
  const p = nextDodgePosition({ button: BUTTON, viewport: vp });
  assert.ok(p.left >= 0 && p.top >= 0, 'negative position: ' + JSON.stringify(p));
  assert.ok(p.left + BUTTON.width <= vp.width, 'overflowed width');
  assert.ok(p.top + BUTTON.height <= vp.height, 'overflowed height');
});

test('stays in bounds even when avoidance is impossible', () => {
  const avoid = [{ left: 0, top: 0, right: 1280, bottom: 800 }]; // covers everything
  const p = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT, avoid });
  assert.ok(inside(p, BUTTON, VIEWPORT), 'gave up on bounds when it could not avoid');
});

test('moves away from where the button already is', () => {
  const from = { left: 100, top: 100 };
  let moved = 0;
  for (let i = 0; i < 200; i += 1) {
    const p = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT, from });
    if (Math.hypot(p.left - from.left, p.top - from.top) > 150) moved += 1;
  }
  assert.ok(moved > 190, 'only ' + moved + '/200 dodges cleared the old spot');
});

test('is deterministic when randomness is injected', () => {
  const random = () => 0.5;
  const a = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT, random });
  const b = nextDodgePosition({ button: BUTTON, viewport: VIEWPORT, random });
  assert.deepEqual(a, b);
});

test('dodgeStep degrades the label and shrinks the button, then holds', () => {
  const first = dodgeStep(0);
  const later = dodgeStep(4);
  const past = dodgeStep(99);

  assert.equal(first.label, 'no');
  assert.ok(later.noScale < first.noScale, 'no button should shrink');
  assert.ok(later.noOpacity < first.noOpacity, 'no button should fade');
  assert.ok(later.yesScale > first.yesScale, 'yes button should grow');
  assert.deepEqual(past, dodgeStep(20), 'escalation must clamp, not run away');
  assert.ok(past.yesScale <= 1.25, 'yes grew unbounded: ' + past.yesScale);
  assert.ok(past.noOpacity > 0, 'no must stay non-zero so it is findable');
});
