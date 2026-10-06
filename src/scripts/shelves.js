import { initSurprise } from './surprise.js';
import { TIME_LABEL, currentBucket, resolveTime } from './time.js';

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
const tabs = [...document.querySelectorAll('.tab[data-filter]')];
const empty = document.getElementById('empty');
let filter = 'all';
let time = 'any'; // 'any' | 'now' | 'morning' | 'midday' | 'evening' | 'late'
const timeBtns = [...document.querySelectorAll('[data-time]')];
let view = 'cards';
const grid = document.querySelector('.grid');
const mapWrap = document.getElementById('map-wrap');
const viewBtns = [...document.querySelectorAll('[data-view]')];
let mapMod = null;

async function setView(v) {
  view = v;
  viewBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === v));
  grid.hidden = v === 'map';
  mapWrap.hidden = v !== 'map';
  if (v === 'map') {
    try {
      mapMod ??= await import('./map.js');
      mapMod.showMap({ state, filter, time: resolveTime(time) });
    } catch (e) {
      toast('The map could not load. Check your connection.');
      setView('cards');
    }
  }
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

const fitsTime = (card, bucket) => !bucket || (card.dataset.when || '').split(' ').includes(bucket);

function render() {
  const bucket = resolveTime(time);
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

    card.hidden = !((filter === 'all' || status === filter) && fitsTime(card, bucket));
  }
  tabs.forEach((t) => {
    t.setAttribute('aria-pressed', t.dataset.filter === filter);
    t.querySelector('.n').textContent = `(${counts[t.dataset.filter]})`;
  });
  // time buttons: how many places each would show, given the current list filter
  const inList = cards.filter((c) => filter === 'all' || c.dataset.status === filter);
  const now = currentBucket();
  timeBtns.forEach((b) => {
    const t = b.dataset.time;
    b.setAttribute('aria-pressed', t === time);
    const n = inList.filter((c) => fitsTime(c, resolveTime(t))).length;
    b.querySelector('.n').textContent = `(${n})`;
    if (t === 'now') b.querySelector('.now-label').textContent = TIME_LABEL[now].toLowerCase();
  });
  mapMod?.updateMap({ state, filter, time: bucket });
  if (!empty) return; // place pages have no tabs
  const visible = cards.some((c) => !c.hidden);
  empty.classList.toggle('show', !visible);
  const listEmpty = filter !== 'all' && inList.length === 0;
  empty.textContent = visible ? ''
    : listEmpty && filter === 'knock' ? 'Your Knock List is empty. Find a door worth knocking on.'
    : listEmpty && filter === 'ledger' ? 'Your Ledger is blank. Go somewhere, then write it down.'
    : bucket ? `Nothing here for ${TIME_LABEL[bucket].toLowerCase()} yet. Try "Any time".` : '';
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
  const vb = e.target.closest('[data-view]');
  if (vb) { setView(vb.dataset.view); return; }
  const tb = e.target.closest('[data-time]');
  if (tb) { time = tb.dataset.time; render(); return; }
  const tab = e.target.closest('.tab[data-filter]');
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

render();

initSurprise({
  getState: () => state,
  getTime: () => ({ chosen: resolveTime(time), now: currentBucket() }),
  update,
  toast,
  showOnMap: async (id) => {
    filter = 'all'; // the pick might be hidden by a filter
    time = 'any';
    render();
    await setView('map');
    mapMod?.focusPlace(id);
  },
});
