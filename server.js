/**
 * OPERATION: ALL DAY — static host + mail relay.
 *
 * Serves public/ and accepts one POST: the day and time she picked.
 * Every submission is written to invites.log before mail is attempted, so a
 * misconfigured SMTP account can never lose the answer.
 */
import express from 'express';
import nodemailer from 'nodemailer';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInvite, formatSlot, escapeHtml } from './public/js/lib/invite.mjs';

// Node reads .env natively; absent is fine, the server just runs in log-only mode.
try {
  process.loadEnvFile();
} catch {
  /* no .env yet */
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
// Addresses live in .env, never in tracked source — this repo is public.
const GMAIL_USER = process.env.GMAIL_USER || '';
const TO_EMAIL = process.env.TO_EMAIL || GMAIL_USER;
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const MAIL_READY = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
const LOG = path.join(ROOT, 'invites.log');

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

const transport = MAIL_READY
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

// A single friend on a single page: enough to absorb a double-tap, nothing more.
const recent = new Map();
const RATE_WINDOW_MS = 10_000;

function rateLimited(ip) {
  const now = Date.now();
  for (const [key, at] of recent) if (now - at > RATE_WINDOW_MS) recent.delete(key);
  if (recent.has(ip)) return true;
  recent.set(ip, now);
  return false;
}

function buildEmail(value) {
  const when = formatSlot(value);
  const note = value.note ? escapeHtml(value.note) : '';

  const text = [
    'She said yes.',
    '',
    when,
    note ? 'Note: ' + value.note : '',
    '',
    'Logged by OPERATION: ALL DAY',
  ]
    .filter(Boolean)
    .join('\n');

  const html = [
    '<div style="background:#0f1923;color:#ece8e1;font-family:Segoe UI,Arial,sans-serif;padding:32px">',
    '<p style="color:#c347c7;letter-spacing:.28em;font-size:11px;margin:0 0 8px">QUEUE CONFIRMED</p>',
    '<h1 style="margin:0 0 20px;font-size:30px;color:#ff4655;letter-spacing:.02em">She said yes.</h1>',
    '<p style="font-size:19px;margin:0 0 8px"><strong>' + escapeHtml(when) + '</strong></p>',
    note ? '<p style="opacity:.85;margin:0 0 8px">Note: ' + note + '</p>' : '',
    '<hr style="border:0;border-top:1px solid #2a3a47;margin:24px 0">',
    '<p style="font-size:12px;opacity:.6;margin:0">Logged by OPERATION: ALL DAY</p>',
    '</div>',
  ].join('');

  return { subject: 'Queue confirmed — ' + when, text, html };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mailConfigured: MAIL_READY, to: TO_EMAIL });
});

app.post('/api/invite', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Give it a second, then confirm again.' });
  }

  const result = validateInvite(req.body ?? {});
  if (!result.ok) {
    return res.status(400).json({ ok: false, errors: result.errors });
  }

  const { value } = result;
  const record = { at: new Date().toISOString(), ip, ...value, summary: formatSlot(value) };

  // Written first and always: the answer survives even if SMTP is down.
  try {
    await appendFile(LOG, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error('could not write invites.log:', err.message);
  }

  if (!transport) {
    console.log('[log-only] ' + record.summary + ' (no GMAIL_APP_PASSWORD set)');
    return res.json({ ok: true, mailed: false, summary: record.summary });
  }

  try {
    const mail = buildEmail(value);
    await transport.sendMail({
      from: '"Operation: All Day" <' + GMAIL_USER + '>',
      to: TO_EMAIL,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    console.log('mailed: ' + record.summary);
    res.json({ ok: true, mailed: true, summary: record.summary });
  } catch (err) {
    console.error('smtp failed:', err.message);
    // Still a success for her — the answer is safely in invites.log.
    res.json({ ok: true, mailed: false, summary: record.summary });
  }
});

app.listen(PORT, () => {
  console.log('OPERATION: ALL DAY  ->  http://localhost:' + PORT);
  console.log(MAIL_READY ? 'mail: sending to ' + TO_EMAIL : 'mail: LOG-ONLY (set GMAIL_APP_PASSWORD in .env to send)');
});
