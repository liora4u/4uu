/**
 * The fixed HUD frame, injected rather than copy-pasted into six documents.
 *
 * Step markers only link backwards. She cannot jump ahead to the scheduler
 * without going through the ask, which is the whole point of the flow.
 */

import { initAudio } from './audio.mjs';
import { armTicks } from './sfx.mjs';

export const FLOW = [
  { file: 'index.html', name: 'Contact' },
  { file: 'briefing.html', name: 'Briefing' },
  { file: 'ask.html', name: 'The ask' },
  { file: 'yes.html', name: 'Locked in' },
  { file: 'schedule.html', name: 'Queue time' },
  { file: 'confirmed.html', name: 'Confirmed' },
];

function stepsMarkup(current) {
  return FLOW.map((s, i) => {
    const n = String(i + 1).padStart(2, '0');
    const label = n + ' ' + s.name;
    if (i < current) return '<a href="' + s.file + '" data-done title="' + label + '"><span>' + label + '</span></a>';
    if (i === current) return '<a href="' + s.file + '" aria-current="step" title="' + label + '"><span>' + label + '</span></a>';
    return '<span title="Not yet"></span>';
  }).join('');
}

function clock(el) {
  const paint = () => {
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  paint();
  setInterval(paint, 1000);
}

/** @param {number} step zero-based index into FLOW */
export function mountHud(step) {
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = [
    '<div class="hud__bar">',
    '<span class="hud__mark"><b>OP:</b> <span class="hud__mark-full">ALL DAY</span></span>',
    '<nav class="steps" aria-label="Progress">' + stepsMarkup(step) + '</nav>',
    '<span class="hud__clock" data-clock></span>',
    '</div>',
    '<span class="hud__corner hud__corner--tl"></span>',
    '<span class="hud__corner hud__corner--br"></span>',
    '<button class="hud__audio" type="button" data-audio-toggle aria-pressed="false">',
    '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>',
    '<span data-audio-label>Sound off</span>',
    '</button>',
  ].join('');

  document.body.append(hud);
  clock(hud.querySelector('[data-clock]'));
  initAudio();
  armTicks(hud);
  return hud;
}
