// Shared motion for the v2.0 design system (styles in components.css): the pointer spotlight on grids drawn on
// hairline rails, and score bars that fill in, number counting up, as they come into view.
// Both stay still under reduced motion; the spotlight only runs with a mouse or trackpad.
import { inView } from 'motion';
import { animate } from 'motion/mini'; // the small build: hardware-accelerated (WAAPI) animations only

export const EASE = [0.22, 1, 0.36, 1]; // --ease in tokens.css
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// A spotlight follows the pointer and lights the rails of every [data-spotlight] inside root
export function initSpotlight(root = document) {
  if (!finePointer || reduceMotion) return;
  for (const rails of root.querySelectorAll('[data-spotlight]')) {
    let raf = 0, x = 0, y = 0;
    const paint = () => { raf = 0; rails.style.setProperty('--mx', `${x}px`); rails.style.setProperty('--my', `${y}px`); };
    rails.addEventListener('pointermove', (e) => {
      const r = rails.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top;
      rails.classList.add('lit');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    rails.addEventListener('pointerleave', () => rails.classList.remove('lit'));
  }
}

// A score's number counts up alongside its bar, on the same curve (cubic-bezier .22,1,.36,1 is close to out-quint)
const countUp = (num, { duration, delay }) => {
  const to = Number(num.dataset.score), t0 = performance.now() + delay * 1000;
  num.textContent = '0';
  const tick = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / (duration * 1000)));
    num.textContent = Math.round(to * (1 - (1 - k) ** 5));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// Each group's visible score bars (a bar is `.score-bar i` with --v in its style, 0 to 1, and an optional
// [data-score] number beside it) wait at zero and fill in together when the group scrolls into view.
// Pass groups found before changing anything, so the page lays out only once.
export function prepareScores(groups) {
  if (reduceMotion) return () => {};
  const sets = groups.map((group) => ({ group, bars: [...group.querySelectorAll('.score-bar i')].filter((b) => b.offsetParent) }));
  return () => {
    for (const { group, bars } of sets) {
      bars.forEach((b) => { b.style.transform = 'scaleX(0)'; });
      inView(group, () => {
        bars.forEach((b, i) => {
          const opts = { duration: 1.2, delay: 0.1 + i * 0.06, ease: EASE };
          animate(b, { transform: ['scaleX(0)', `scaleX(${b.style.getPropertyValue('--v')})`] }, opts);
          const num = b.closest('.score, .mark-row')?.querySelector('[data-score]');
          if (num) countUp(num, opts);
        });
      }, { amount: 0.25 });
    }
  };
}
