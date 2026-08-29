# Operation: All Day

A six-page invitation asking Cherry to play Valorant for one entire day. She walks
the flow, presses the only button that works, picks a time, and that time is
emailed to you.

```
index      →  briefing   →  ask       →  yes        →  schedule   →  confirmed
the hook      the pitch     yes / no     the message    day + time    the answer
```

## Run it

```bash
npm install
npm run assets     # downloads the Valorant art + webfonts (~1.9 MB)
npm start          # http://localhost:3000
```

It runs immediately in **log-only mode** — the whole site works and every answer is
appended to `invites.log`, but no mail is sent until you do the next step.

## Make the email actually send

1. Turn on 2-Step Verification for the Gmail account you want to send from.
2. Generate an App Password at <https://myaccount.google.com/apppasswords> (16 characters).
3. `cp .env.example .env` and paste it in:

```ini
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your16charapppassword
TO_EMAIL=you@gmail.com
```

4. Restart. The console prints `mail: sending to …` instead of `LOG-ONLY`.

`GMAIL_USER` sends and `TO_EMAIL` receives; they are separate keys so you can split
them later. `.env` is gitignored and no credential ever reaches the browser.

**The answer cannot be lost.** Every submission is written to `invites.log` before
mail is attempted, and if the server is unreachable the page falls back to opening
her mail app with the time pre-filled.

## Add the music

Drop the track in as `public/audio/ticking-away.mp3`. That exact filename is what
the player looks for. Until then the sound control simply hides itself — nothing
else changes. The track resumes at the right position as she moves between pages,
and starts on her first interaction because browsers block autoplay.

The interface sounds (hover, dodge, lock-in, confirm) are synthesized with Web
Audio, so those need no files and always work.

## Changing things

| What | Where |
|---|---|
| Her name, all copy | the six `.html` files in `public/` |
| The pleading lines when she dodges | `TAUNTS` in `public/js/dodge-button.mjs` |
| Duration options | `DURATIONS` in `public/js/lib/invite.mjs` |
| Colours, type, spacing | the token block at the top of `public/css/base.css` |
| Which agents appear | `ROSTER` / `HEROES` in `scripts/fetch-assets.mjs`, then `npm run assets` |

## Art

Agent portraits, ability icons and map splashes come from
[valorant-api.com](https://valorant-api.com) (Riot's public asset CDN, no key).
`npm run assets` downloads and re-encodes them to webp — 28 MB of source art
becomes 1.9 MB. They are stored locally, so the site never depends on a third
party at view time.

## Tests

```bash
npm test           # 19 tests, no dependencies beyond node:test
```

Covers the two places bugs actually hide: the dodge geometry (the button must
never land off-screen or under the Yes button, on any viewport) and the invite
validation, including stripping CR/LF and HTML from her note before it reaches
the mail headers.

Verified in a real browser at 390×844, 768×1024, 1024×768 and 1440×900 — including
that the No button dodges on `touchstart` and never registers a click on a tablet.
