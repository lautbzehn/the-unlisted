// The lantern: the warm pool of light in the background follows the pointer (the drawing is in global.css, body::after).
// Phones have no pointer to follow, so there the light drifts by itself (CSS only). Off when reduced motion is on.
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let raf = 0, x = 0, y = 0;
  const move = () => { raf = 0; document.body.style.setProperty('--lp', `${x - 320}px ${y - 320}px`); };
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(move); }, { passive: true });
}
