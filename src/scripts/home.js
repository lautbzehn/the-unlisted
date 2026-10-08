import { getState, update, toast } from './passport.js';
import { initSurprise } from './surprise.js';
import { currentBucket } from './time.js';

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

// Each row shows different places: skip anything a row above already shows, then keep 10.
const seen = new Set();
for (const row of document.querySelectorAll('.browse:not([hidden])')) {
  let kept = 0;
  for (const li of row.querySelectorAll('.strip > li')) {
    const id = li.firstElementChild.dataset.id;
    if (seen.has(id) || kept >= 10) { li.remove(); continue; }
    seen.add(id);
    kept++;
  }
}

// Arrow buttons on the sideways rows, for mouse users (touch and trackpads just swipe).
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const wrap of document.querySelectorAll('.strip-wrap')) {
    const strip = wrap.querySelector('.strip');
    const [prev, next] = wrap.querySelectorAll('.strip-nav');
    const sync = () => {
      prev.hidden = strip.scrollLeft < 8;
      next.hidden = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 8;
    };
    const go = (dir) => strip.scrollBy({ left: dir * strip.clientWidth * 0.85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    strip.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }
}

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

// Tickets tilt a little under a warm light that follows the pointer (after 21st.dev's Optimized Tilt Card, gentler)
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const t of document.querySelectorAll('.ticket')) {
    let raf = 0;
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        t.classList.add('tilt');
        t.style.setProperty('--ry', `${(px - 0.5) * 12}deg`); t.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
        t.style.setProperty('--px', `${px * 100}%`); t.style.setProperty('--py', `${py * 100}%`);
      });
    });
    t.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); t.classList.remove('tilt'); t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
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
