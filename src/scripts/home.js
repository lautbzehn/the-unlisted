import { inView, scroll, stagger } from 'motion';
import { animate } from 'motion/mini'; // the small build: hardware-accelerated (WAAPI) animations only
import { EASE, initSpotlight, prepareScores } from './rails.js';
import { getState, update, toast } from './passport.js';
import { initSurprise } from './surprise.js';
import { currentBucket } from './time.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// This city's Explore page (Bay Area or San Diego)
const EXPLORE = document.getElementById('main').dataset.explore ?? '/explore/';

// Old links (/?list=…, /?view=map, /?time=…) moved to the Explore page.
const params = new URLSearchParams(location.search);
if (['list', 'view', 'time'].some((k) => params.has(k))) location.replace(`${EXPLORE}${location.search}`);

// "Right now": show the row that fits this hour where the places are (both cities are on Pacific time).
const now = currentBucket();
const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(new Date());
for (const row of document.querySelectorAll('.browse[data-bucket]')) {
  if (row.dataset.bucket !== now) continue;
  row.hidden = false;
  row.querySelector('[data-kicker]').textContent = `Right now · ${clock} in ${document.getElementById('main').dataset.short ?? 'the Bay'}`;
}

// Each row shows different places: skip anything a row above already shows. Rows keep a fixed number
// (data-keep; home.css hides the rest), so skipping one pulls up a spare and the row never changes height.
const seen = new Set();
for (const row of document.querySelectorAll('.browse:not([hidden]) [data-row]')) {
  const keep = Number(row.dataset.keep) || Infinity;
  let kept = 0;
  for (const li of [...row.children]) {
    const id = li.querySelector('[data-id]')?.dataset.id;
    if (seen.has(id)) { li.remove(); continue; }
    if (kept++ < keep) seen.add(id);
  }
}

// The hero's clock, next to where we are: the local time where the places are
const heroClock = document.querySelector('[data-hero-clock]');
if (heroClock) heroClock.textContent = `${clock} PT`;

// The grain starts once the page has settled, so it never competes with the first paint,
// and not while the welcome gate covers the hero (it waits for the gate to open)
const grainCanvas = document.querySelector('[data-grain]');
if (grainCanvas && !reduceMotion) {
  const go = () => import('./grain.js').then(({ startGrain }) => startGrain(grainCanvas));
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 600));
  const whenOpen = () => {
    const html = document.documentElement;
    if (!html.hasAttribute('data-gate')) return idle();
    const mo = new MutationObserver(() => { if (!html.hasAttribute('data-gate')) { mo.disconnect(); idle(); } });
    mo.observe(html, { attributes: true, attributeFilter: ['data-gate'] });
  };
  if (document.readyState === 'complete') whenOpen(); else addEventListener('load', whenOpen, { once: true });
}

// Grids on rails: a spotlight follows the pointer and lights the hairlines (components.css)
initSpotlight();

// Scroll-driven motion is set up after the first paint, reading the layout once before changing anything
const setUpMotion = () => {
  const startScores = prepareScores([...document.querySelectorAll('[data-row]')]);
  const heads = [...document.querySelectorAll('.home .row-head, .next-cities')].filter((h) => h.getBoundingClientRect().top >= innerHeight);
  const items = [...document.querySelectorAll('.stack > li')].filter((li) => li.offsetParent);

  // Scores fill in as they come into view, and the number counts up with the bar
  startScores();

  // Section heads rise in as they arrive (ones already on screen are left be)
  for (const head of heads) {
    const parts = [...head.children];
    parts.forEach((p) => { p.style.opacity = '0'; p.style.transform = 'translateY(28px)'; });
    inView(head, () => { animate(parts, { opacity: 1, transform: 'translateY(0px)' }, { duration: 0.9, delay: stagger(0.07), ease: EASE }); }, { amount: 0.4 });
  }

  // Deep cuts: as each card lands on the pile, the one beneath it sinks back and dims
  items.forEach((li, i) => {
    const next = items[i + 1];
    if (!next) return;
    scroll(animate(li.firstElementChild, { transform: ['scale(1)', 'scale(0.93)'], '--shade': [0, 0.55] }, { ease: 'linear', duration: 1 }), { target: next, offset: ['start end', 'start start'] });
  });
};
if (!reduceMotion) requestAnimationFrame(() => setTimeout(setUpMotion));

// Under the logo: "Tonight's doors:" and a word that flips through the kinds of places that fit this hour.
const FLIP_LABEL = { morning: 'This morning’s doors:', midday: 'Today’s lunch doors:', evening: 'Tonight’s doors:', late: 'Late-night doors:' };
const flipper = document.getElementById('flipper');
if (flipper) {
  const all = JSON.parse(document.getElementById('places-data').textContent);
  const kinds = [...new Set(all.filter((p) => p.when?.includes(now)).map((p) => p.kind.replace(/,?\s*since \d{4}.*$/i, '')))].sort(() => Math.random() - 0.5).slice(0, 8);
  const word = flipper.querySelector('.w');
  if (kinds.length) {
    flipper.querySelector('[data-flip-label]').textContent = FLIP_LABEL[now];
    word.firstElementChild.textContent = kinds[0];
    flipper.classList.add('on');
    if (kinds.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let k = 0;
      setInterval(() => {
        if (document.hidden) return;
        [...word.children].slice(0, -1).forEach((n) => n.remove());
        const old = word.firstElementChild, nu = document.createElement('span');
        k = (k + 1) % kinds.length;
        nu.textContent = kinds[k]; nu.className = 'in'; word.append(nu);
        void nu.offsetWidth; old.className = 'out'; nu.className = '';
        setTimeout(() => old.remove(), 600);
      }, 2400);
    }
  }
}

initSurprise({
  getState,
  getTime: () => ({ chosen: null, now }),
  update,
  toast,
  showOnMap: (id) => { location.href = `${EXPLORE}?view=map&focus=${encodeURIComponent(id)}`; },
});
// The header's "Surprise me" link (/#surprise) rolls the dice, even when you're already on this page.
const rollFromLink = () => {
  if (location.hash !== '#surprise') return;
  history.replaceState(null, '', location.pathname + location.search);
  document.getElementById('surprise-btn')?.click();
};
addEventListener('hashchange', rollFromLink);
rollFromLink();
