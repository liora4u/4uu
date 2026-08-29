/**
 * The button that will not be pressed.
 *
 * It evades on pointerdown rather than on hover. Hover does not exist on a
 * tablet or a phone, so a hover-driven dodge would leave the button perfectly
 * tappable on exactly the devices she is most likely to open this on. Capturing
 * pointerdown and preventing the default also stops the click ever being
 * dispatched, so there is no race between dodging and activating.
 *
 * After enough attempts it gives up and admits defeat, which is the only way
 * out of the page other than the intended one.
 */

import { nextDodgePosition, dodgeStep } from './lib/dodge.mjs';
import { dodge as dodgeSound } from './sfx.mjs';

// Index 0 shows before she has tried anything. The rest land one per dodge, so
// they get progressively less composed and more openly hopeful.
const TAUNTS = [
  'two buttons. one of them is correct.',
  'wait — you’re not gonna play with me?',
  'that button doesn’t want to be pressed either',
  'come on. one day. just the one.',
  'I already told the queue you were coming',
  'the red one is right there, and it’s so friendly',
  'okay okay, last try — please?',
  'it gave up. it says yes too now.',
];

const SURRENDER = TAUNTS.length - 1;

export function initDodgeButton({ no, yes, taunt, onSurrender }) {
  let count = 0;
  let floating = false;

  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  };

  const avoidRects = () => {
    const rects = [rectOf(yes)];
    const bar = document.querySelector('.hud__bar');
    const audio = document.querySelector('.hud__audio');
    if (bar) rects.push(rectOf(bar));
    if (audio) rects.push(rectOf(audio));
    return rects.map((r) => ({
      left: r.left - 16,
      top: r.top - 16,
      right: r.right + 16,
      bottom: r.bottom + 16,
    }));
  };

  function relocate() {
    const rect = no.getBoundingClientRect();

    // Freeze the current on-screen position before switching to fixed, so the
    // first jump starts from where she can actually see the button.
    if (!floating) {
      no.style.position = 'fixed';
      no.style.margin = '0';
      no.style.left = rect.left + 'px';
      no.style.top = rect.top + 'px';
      floating = true;
      // Flush that starting position to the style system before the new one is
      // set below. Without this the element goes from static to its destination
      // inside a single frame, there is no value to animate from, and the first
      // dodge teleports — which looks like the button disappearing.
      void no.offsetWidth;
    }

    const next = nextDodgePosition({
      button: { width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      avoid: avoidRects(),
      from: { left: rect.left, top: rect.top },
    });

    no.style.left = next.left + 'px';
    no.style.top = next.top + 'px';
  }

  function escalate() {
    const step = dodgeStep(count);
    no.textContent = step.label;
    no.style.setProperty('--no-scale', step.noScale);
    no.style.setProperty('--no-opacity', step.noOpacity);
    yes.style.setProperty('--yes-scale', step.yesScale);

    if (taunt) {
      taunt.textContent = TAUNTS[Math.min(count, SURRENDER)];
      // Restart the entrance animation so each new line actually announces itself.
      taunt.classList.remove('is-new');
      void taunt.offsetWidth;
      taunt.classList.add('is-new');
    }
  }

  function attempt(event) {
    if (count >= SURRENDER) return; // it has conceded; let the click through

    event.preventDefault();
    event.stopPropagation();

    count += 1;
    relocate();
    escalate();
    dodgeSound();

    if (count >= SURRENDER) {
      no.classList.add('is-surrendered');
      no.style.removeProperty('--no-opacity');
      onSurrender?.();
    }
  }

  // Capture phase so nothing downstream sees the interaction first.
  no.addEventListener('pointerdown', attempt, { capture: true });
  no.addEventListener('touchstart', attempt, { capture: true, passive: false });

  // Deliberately no hover handler: it moves only when she actually presses it.
  // Dodging on hover makes it impossible to even aim at, which is a different
  // and much more annoying joke than the one being told here.

  // A resize must never strand it off-screen.
  window.addEventListener('resize', () => {
    if (floating && count < SURRENDER) relocate();
  });

  escalate();
}
