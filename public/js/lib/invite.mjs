/**
 * Shared invite rules. Imported by both the browser and server.js so the two
 * can never disagree about what a valid submission looks like.
 */

export const DURATIONS = [
  { id: 'all-day', label: 'The whole day', blurb: 'Sunrise to "one more game"' },
  { id: 'evening', label: 'Evening onwards', blurb: 'Until the servers beg' },
  { id: 'few-hours', label: 'A few hours', blurb: 'Three, realistically five' },
];

const NOTE_MAX = 280;
const NAME_MAX = 40;
const MAX_DAYS_AHEAD = 60;

/** Strip anything that could break out of a mail header or an HTML body. */
export function sanitizeText(input, max = NOTE_MAX) {
  if (typeof input !== 'string') return '';
  return input
    // Control characters, including the CR/LF that enable header injection.
    .replace(/[\x00-\x1F\x7F]+/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Escape for safe interpolation into the HTML email body. */
export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse YYYY-MM-DD as a local calendar date, rejecting impossible days. */
function parseDate(value) {
  const m = DATE_RE.exec(value ?? '');
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(y, mo - 1, d);
  const roundTrips = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
  return roundTrips ? date : null;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function validateInvite(payload = {}, { now = new Date() } = {}) {
  const errors = {};

  const date = parseDate(payload.date);
  if (!date) {
    errors.date = 'Pick a day.';
  } else {
    const today = startOfDay(now);
    const days = Math.round((date - today) / 86400000);
    if (days < 0) errors.date = 'That day has already been played.';
    else if (days > MAX_DAYS_AHEAD) errors.date = 'Pick something within the next two months.';
  }

  const time = TIME_RE.test(payload.time ?? '') ? payload.time : null;
  if (!time) errors.time = 'Pick a start time.';

  const duration = DURATIONS.find((d) => d.id === payload.duration);
  if (!duration) errors.duration = 'Pick how long you are in for.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: sanitizeText(payload.name, NAME_MAX),
      date: payload.date,
      time,
      duration: duration.id,
      durationLabel: duration.label,
      note: sanitizeText(payload.note, NOTE_MAX),
    },
  };
}

/** "Sunday, 30 August 2026 at 2:30 PM — The whole day" */
export function formatSlot(value) {
  const [y, mo, d] = value.date.split('-').map(Number);
  const [hh, mm] = value.time.split(':').map(Number);
  const when = new Date(y, mo - 1, d, hh, mm);

  const day = when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const clock = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return day + ' at ' + clock + ' — ' + value.durationLabel;
}

/** Fallback used when the mail relay cannot be reached, so the flow never dead-ends. */
export function buildMailto(value, to) {
  const subject = 'Queue confirmed: ' + value.date + ' at ' + value.time;
  const body = [
    'I said yes.',
    '',
    formatSlot(value),
    value.note ? '' : null,
    value.note ? 'Note: ' + value.note : null,
    '',
    '— sent from OPERATION: ALL DAY',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
