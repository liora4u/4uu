/**
 * Parallax and scroll reveals.
 *
 * One rAF loop for the whole page. Layers declare their own depth with
 * data-depth, and the loop only writes transforms when something actually
 * changed, so idle pages cost nothing.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

export function initParallax() {
  if (reduced.matches) return;

  const layers = [...document.querySelectorAll('[data-depth]')];
  if (layers.length === 0) return;

  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let scrollY = window.scrollY;
  let queued = false;

  const measure = () => {
    scrollY = window.scrollY;
    request();
  };

  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  }

  function frame() {
    queued = false;

    // Pointer drift trails the cursor, which reads as depth rather than tracking.
    eased.x += (pointer.x - eased.x) * 0.06;
    eased.y += (pointer.y - eased.y) * 0.06;

    for (const layer of layers) {
      const depth = Number(layer.dataset.depth) || 0;
      const host = layer.closest('.stage') || layer.parentElement;
      const top = host.offsetTop;
      const shift = (scrollY - top) * depth;
      const driftX = eased.x * depth * 26;
      const driftY = eased.y * depth * 18;
      layer.style.transform = 'translate3d(' + driftX.toFixed(2) + 'px,' + (shift + driftY).toFixed(2) + 'px,0)';
    }

    if (Math.abs(pointer.x - eased.x) > 0.001 || Math.abs(pointer.y - eased.y) > 0.001) request();
  }

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);

  if (fine.matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        request();
      },
      { passive: true },
    );
  }

  measure();
}

export function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (items.length === 0) return;

  if (reduced.matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const show = (el) => {
    el.classList.add('is-in');
    io.unobserve(el);
  };

  // threshold 0 with only a small bottom margin. A larger margin combined with a
  // percentage threshold can leave an element that is genuinely on screen just
  // short of qualifying, and on a short viewport with little room to scroll it
  // would then never reveal at all.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) show(entry.target);
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0 },
  );

  items.forEach((el) => io.observe(el));

  // Safety net: nothing already within the viewport should depend on a scroll
  // that the page may not even be long enough to allow.
  requestAnimationFrame(() => {
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) show(el);
    }
  });
}
