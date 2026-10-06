// Welcome gate: "Stamp me in" stamps your passport, fades the gate, then offers the optional email sign-up.
import { openSignup } from './signup.js';

const html = document.documentElement;
const gate = document.getElementById('gate');

if (gate && html.hasAttribute('data-gate')) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  const behind = [...document.body.children].filter((el) => el !== gate);
  behind.forEach((el) => { el.inert = true; }); // the page behind can't be reached until you're in

  const video = gate.querySelector('video');
  if (video && !reduceMotion) video.play().catch(() => {});

  const btn = document.getElementById('gate-enter');
  btn.focus();
  let entering = false;
  async function enter() {
    if (entering) return;
    entering = true;
    try { localStorage.setItem('unlisted:entered', new Date().toISOString().slice(0, 10)); } catch {}
    gate.classList.add('stamped');
    await wait(750);
    gate.classList.add('leaving');
    await wait(450);
    html.removeAttribute('data-gate');
    video?.pause();
    behind.forEach((el) => { el.inert = false; });
    gate.remove();
    const h1 = document.querySelector('main h1');
    h1?.setAttribute('tabindex', '-1');
    h1?.focus({ preventScroll: true });
    await wait(500);
    openSignup('gate', { auto: true });
  }
  btn.addEventListener('click', enter);
  gate.addEventListener('keydown', (e) => { if (e.key === 'Escape') enter(); });
} else {
  gate?.remove();
}
