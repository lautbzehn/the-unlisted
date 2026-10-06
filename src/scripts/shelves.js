// Knock List / Ledger / personal rating / share.
// Everything is stored in this browser only (localStorage). No accounts, no server.
const KEY = 'unlisted:v1';
const LABELS = ['Not rated', 'Meh', 'Fine', 'Good', 'Great', 'Legendary'];

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const save = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { toast('Could not save (private browsing?)'); }
};
let state = load(); // { [placeId]: { status: 'knock'|'ledger', strike: 0-5, note: '', date: 'YYYY-MM-DD' } }

const cards = [...document.querySelectorAll('.card')];
const tabs = [...document.querySelectorAll('.tab')];
const empty = document.getElementById('empty');
let filter = 'all';

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function render() {
  let counts = { all: cards.length, knock: 0, ledger: 0 };
  for (const card of cards) {
    const id = card.dataset.id;
    const s = state[id] || {};
    const status = s.status || 'none';
    card.dataset.status = status;
    if (status === 'knock') counts.knock++;
    if (status === 'ledger') counts.ledger++;

    card.querySelector('[data-action=knock]').setAttribute('aria-pressed', status === 'knock');
    card.querySelector('[data-action=ledger]').setAttribute('aria-pressed', status === 'ledger');

    const strike = s.strike || 0;
    card.querySelectorAll('.strike').forEach((b) => {
      const on = Number(b.dataset.strike) <= strike;
      b.dataset.on = on;
      b.setAttribute('aria-pressed', on);
    });
    card.querySelector('[data-strike-label]').textContent = LABELS[strike];
    const note = card.querySelector('[data-note]');
    if (document.activeElement !== note) note.value = s.note || '';

    card.hidden = !(filter === 'all' || status === filter);
  }
  tabs.forEach((t) => {
    t.setAttribute('aria-pressed', t.dataset.filter === filter);
    t.querySelector('.n').textContent = `(${counts[t.dataset.filter]})`;
  });
  const visible = cards.some((c) => !c.hidden);
  empty.classList.toggle('show', !visible);
  empty.textContent =
    filter === 'knock' ? 'Your Knock List is empty. Find a door worth knocking on.'
    : filter === 'ledger' ? 'Your Ledger is blank. Go somewhere, then write it down.' : '';
}

function update(id, patch) {
  state[id] = { ...(state[id] || {}), ...patch };
  const s = state[id];
  if (!s.status && !s.strike && !s.note) delete state[id];
  save(state);
  render();
}

async function share(card) {
  const id = card.dataset.id;
  const name = card.querySelector('h3').textContent;
  const url = `${location.origin}${location.pathname}#${id}`;
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
  const tab = e.target.closest('.tab');
  if (tab) { filter = tab.dataset.filter; render(); return; }

  const card = e.target.closest('.card');
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

// scroll reveal
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}, { threshold: 0.12 });
cards.forEach((c) => io.observe(c));

// jump to a shared card (#id)
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });

render();
