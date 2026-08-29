import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText, escapeHtml, validateInvite, formatSlot, buildMailto, DURATIONS } from '../public/js/lib/invite.mjs';

const NOW = new Date('2026-08-29T12:00:00Z');
const valid = { date: '2026-08-30', time: '14:30', duration: 'all-day', note: 'bring the spike' };

test('sanitizeText strips newlines, angle brackets and control characters', () => {
  assert.equal(sanitizeText('a\r\nb'), 'a b');
  // Angle brackets survive storage so "<3" stays "<3"; escaping happens at render.
  assert.equal(sanitizeText('<3 gg'), '<3 gg');
  // Control characters collapse to a space rather than vanishing, so a CRLF stays two words.
  assert.equal(sanitizeText('x' + String.fromCharCode(0, 7) + 'y'), 'x y');
  assert.equal(sanitizeText('  lots   of   space  '), 'lots of space');
  assert.equal(sanitizeText(undefined), '');
  assert.equal(sanitizeText('abcdef', 3), 'abc');
});

test('sanitizeText blocks SMTP header injection through the note', () => {
  const dirty = 'hi\nBcc: attacker@evil.test\nSubject: hijacked';
  const clean = sanitizeText(dirty);
  assert.ok(!clean.includes('\n') && !clean.includes('\r'), 'newlines survived into a header-bound value');
});

test('accepts a well formed invite and returns normalized values', () => {
  const res = validateInvite(valid, { now: NOW });
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  assert.equal(res.value.date, '2026-08-30');
  assert.equal(res.value.time, '14:30');
  assert.equal(res.value.note, 'bring the spike');
});

test('rejects a missing or malformed date', () => {
  for (const date of [undefined, '', 'tomorrow', '2026-13-01', '2026-02-30', '30-08-2026']) {
    assert.equal(validateInvite({ ...valid, date }, { now: NOW }).ok, false, 'accepted date ' + date);
  }
});

test('rejects a malformed time', () => {
  for (const time of [undefined, '25:00', '12:60', '9am', '1:5']) {
    assert.equal(validateInvite({ ...valid, time }, { now: NOW }).ok, false, 'accepted time ' + time);
  }
});

test('rejects dates in the past and far in the future', () => {
  assert.equal(validateInvite({ ...valid, date: '2026-08-28' }, { now: NOW }).ok, false, 'accepted the past');
  assert.equal(validateInvite({ ...valid, date: '2026-08-29' }, { now: NOW }).ok, true, 'today must be allowed');
  assert.equal(validateInvite({ ...valid, date: '2027-08-29' }, { now: NOW }).ok, false, 'accepted a year out');
});

test('rejects an unknown duration', () => {
  assert.equal(validateInvite({ ...valid, duration: 'forever' }, { now: NOW }).ok, false);
  for (const d of DURATIONS) {
    assert.equal(validateInvite({ ...valid, duration: d.id }, { now: NOW }).ok, true, 'rejected ' + d.id);
  }
});

test('caps and cleans the note instead of failing on it', () => {
  const res = validateInvite({ ...valid, note: '<b>' + 'x'.repeat(600) }, { now: NOW });
  assert.equal(res.ok, true);
  assert.ok(res.value.note.length <= 280, 'note not capped: ' + res.value.note.length);
});

test('formatSlot renders a human readable summary', () => {
  const out = formatSlot(validateInvite(valid, { now: NOW }).value);
  assert.match(out, /Sunday/);
  assert.match(out, /30 August 2026/);
  assert.match(out, /2:30/);
});

test('buildMailto produces an encoded mailto with the time in it', () => {
  const link = buildMailto(validateInvite(valid, { now: NOW }).value, 'you@example.com');
  assert.ok(link.startsWith('mailto:you@example.com?'), link.slice(0, 60));
  assert.ok(link.includes('subject='));
  assert.ok(decodeURIComponent(link).includes('14:30'));
});

test('escapeHtml neutralises markup at the point it enters the email body', () => {
  const note = sanitizeText('<script>alert(1)</script> <3');
  assert.ok(note.includes('<script>'), 'storage should keep what she typed');
  const rendered = escapeHtml(note);
  assert.ok(!rendered.includes('<script>'), 'raw tag reached the HTML body');
  assert.ok(rendered.includes('&lt;script&gt;'), 'tag was not escaped');
  assert.ok(rendered.includes('&lt;3'), 'her heart should survive, escaped');
});
