import { getState, update, toast, onChange } from './passport.js';
import { initSurprise } from './surprise.js';
import { currentBucket } from './time.js';

// Old links (/?list=…, /?view=map, /?time=…) moved to the Explore page.
const params = new URLSearchParams(location.search);
if (['list', 'view', 'time'].some((k) => params.has(k))) location.replace(`/explore/${location.search}`);

// "Right now": show the row that fits this hour in the Bay Area.
const now = currentBucket();
const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(new Date());
for (const row of document.querySelectorAll('.browse[data-bucket]')) {
  if (row.dataset.bucket !== now) continue;
  row.hidden = false;
  row.querySelector('[data-kicker]').textContent = `Right now · ${clock} in the Bay`;
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

// Your passport at a glance, only once there's something in it.
const strip = document.getElementById('passport-strip');
function paintStrip(state) {
  const n = { knock: 0, ledger: 0 };
  for (const s of Object.values(state)) if (n[s.status] !== undefined) n[s.status]++;
  strip.hidden = !n.knock && !n.ledger;
  strip.querySelector('[data-n=knock]').textContent = n.knock;
  strip.querySelector('[data-n=ledger]').textContent = n.ledger;
}
onChange(paintStrip);
paintStrip(getState());

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

initSurprise({
  getState,
  getTime: () => ({ chosen: null, now }),
  update,
  toast,
  showOnMap: (id) => { location.href = `/explore/?view=map&focus=${encodeURIComponent(id)}`; },
});
// The header's "Surprise me" link (/#surprise) rolls the dice, even when you're already on this page.
const rollFromLink = () => {
  if (location.hash !== '#surprise') return;
  history.replaceState(null, '', location.pathname + location.search);
  document.getElementById('surprise-btn')?.click();
};
addEventListener('hashchange', rollFromLink);
rollFromLink();
