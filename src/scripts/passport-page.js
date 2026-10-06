// My Passport: your Bucket List and the places you've stamped. Everything here lives on this device.
import { getState, onChange } from './passport.js';
import { openSheet } from './mapsheet.js';

const cards = [...document.querySelectorAll('.card.entry')];
const tabs = [...document.querySelectorAll('[data-tab]')];
const empty = document.getElementById('empty');
const EMPTY = {
  knock: 'Nothing on your Bucket List yet. Open any place on <a href="/explore/">Explore</a> and tap “+ Bucket List”.',
  ledger: 'No stamps yet. After a visit, open the place and tap “Stamp it”, then rate it and leave yourself a note.',
};
let tab = new URLSearchParams(location.search).get('tab') === 'stamped' ? 'ledger' : 'knock';

function counts() {
  const n = { knock: 0, ledger: 0 };
  for (const s of Object.values(getState())) if (s.status in n) n[s.status]++;
  tabs.forEach((t) => {
    t.setAttribute('aria-pressed', t.dataset.tab === tab);
    t.querySelector('.n').textContent = n[t.dataset.tab];
  });
}

function show() {
  let n = 0;
  for (const c of cards) {
    c.hidden = c.dataset.status !== tab;
    if (!c.hidden) n++;
  }
  empty.innerHTML = n ? '' : EMPTY[tab];
  empty.classList.toggle('show', !n);
  history.replaceState(null, '', tab === 'ledger' ? '?tab=stamped' : location.pathname);
  counts();
}

tabs.forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; show(); }));
// Changing a place updates the counts; it moves to its new tab the next time you switch, not under your finger.
onChange(counts);
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action=map]');
  if (btn) openSheet(btn.closest('.card'));
});
show();
