// Your passport: Bucket List, Stamped, your rating and private notes, plus Share.
// Everything is stored in this browser only (localStorage). No accounts, no server.
// Any page that shows places loads this; it keeps every card and ticket on the page in sync.
const KEY = 'unlisted:v1';
const LABELS = ['Not rated', 'Meh', 'Fine', 'Good', 'Great', 'Legendary'];
const STATUS_TAG = { knock: 'On your list', ledger: 'Stamped ✓' };

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const save = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { toast('Could not save (private browsing?)'); }
};
let state = load(); // { [placeId]: { status: 'knock'|'ledger', strike: 0-5, note: '', date: 'YYYY-MM-DD' } }
const listeners = new Set();

export const getState = () => state;
export const onChange = (fn) => listeners.add(fn);

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function paintCard(card) {
  const s = state[card.dataset.id] || {};
  const status = s.status || 'none';
  card.dataset.status = status;
  const knock = card.querySelector('[data-action=knock]');
  const ledger = card.querySelector('[data-action=ledger]');
  knock.setAttribute('aria-pressed', status === 'knock');
  knock.textContent = status === 'knock' ? '✓ On your Bucket List' : '+ Bucket List';
  ledger.setAttribute('aria-pressed', status === 'ledger');
  ledger.textContent = status === 'ledger' ? '✓ Stamped' : 'Stamp it';
  const tag = card.querySelector('[data-status-tag]');
  if (tag) tag.textContent = STATUS_TAG[status] ?? '';
  const strike = s.strike || 0;
  card.querySelectorAll('.strike').forEach((b) => {
    const on = Number(b.dataset.strike) <= strike;
    b.dataset.on = on;
    b.setAttribute('aria-pressed', on);
  });
  card.querySelector('[data-strike-label]').textContent = LABELS[strike];
  const note = card.querySelector('[data-note]');
  if (document.activeElement !== note) note.value = s.note || '';
}

function paint() {
  document.querySelectorAll('.card[data-id]').forEach(paintCard);
  document.querySelectorAll('.ticket[data-id]').forEach((t) => { t.dataset.status = state[t.dataset.id]?.status || 'none'; });
  listeners.forEach((fn) => fn(state));
  dispatchEvent(new Event('passport:change')); // the header's My Passport count
}

export function update(id, patch) {
  state[id] = { ...(state[id] || {}), ...patch };
  const s = state[id];
  if (!s.status && !s.strike && !s.note) delete state[id];
  save(state);
  paint();
}

async function share(card) {
  const name = card.dataset.name;
  const url = new URL(card.dataset.url, location.origin).href; // the place's own page, so the link shows a preview card
  const data = { title: `${name} — The Unlisted`, text: `You have to check out ${name}. Found it on The Unlisted.`, url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(url);
    toast('Link copied. Pass it on.');
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not share. Copy the address bar instead.');
  }
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('.card[data-id]');
  if (!card) return;
  const id = card.dataset.id;
  const s = state[id] || {};
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'knock') update(id, { status: s.status === 'knock' ? undefined : 'knock' });
  if (action === 'ledger') {
    update(id, s.status === 'ledger'
      ? { status: undefined }
      : { status: 'ledger', date: new Date().toISOString().slice(0, 10) });
  }
  if (action === 'share') share(card);
  const strike = e.target.closest('.strike');
  if (strike) {
    const n = Number(strike.dataset.strike);
    update(id, { strike: s.strike === n ? 0 : n });
  }
});

document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-note]')) return;
  const id = e.target.closest('.card').dataset.id;
  state[id] = { ...(state[id] || {}), note: e.target.value };
  save(state);
});

// Another tab changed your lists: catch up.
addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); paint(); } });

// Cards fade in as they scroll into view (skipped when reduced motion is on, via CSS).
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

paint();
