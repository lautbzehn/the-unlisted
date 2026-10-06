// The Explore page: search, filters, sorting, "Show more", and the map beside (or instead of) the list.
// Filters live in the address bar, so a filtered view can be bookmarked or shared.
import { getState, onChange, toast } from './passport.js';
import { openSheet } from './mapsheet.js';
import { TIME_LABEL, currentBucket, resolveTime } from './time.js';
import { KM_TO_MI, distanceKm, getPosition } from './geo.js';

// Bucket List and Stamped moved to the My Passport page; old links still land there.
const old = new URLSearchParams(location.search).get('list');
if (['knock', 'ledger'].includes(old)) location.replace(old === 'ledger' ? '/passport/?tab=stamped' : '/passport/');

const PAGE = 20;
const main = document.querySelector('main.explore');
const list = document.getElementById('entries');
const cards = [...list.querySelectorAll('.card.entry')];
const byId = new Map(cards.map((c) => [c.dataset.id, c]));
const $ = (sel) => main.querySelector(sel);
const $$ = (sel) => [...main.querySelectorAll(sel)];
const selects = Object.fromEntries($$('select[data-f]').map((s) => [s.dataset.f, s]));
const search = document.getElementById('q');
const moreBtn = $('[data-more]');
const empty = document.getElementById('empty');
const wide = matchMedia('(min-width: 1100px)'); // list and map side by side
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Search looks at the name, neighborhood, kind, story and what to order, matching the start of words
// ("pho" finds "phở" but not "phone"). Accents and punctuation don't matter.
const fold = (s) => ` ${s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')}`;
const text = new Map(cards.map((c) => [c, fold([...c.querySelectorAll('.e-name, .e-meta, .facts, .story, .order')].map((e) => e.textContent).join(' '))]));

// ---- Filter state (from the address bar) ----
const params = new URLSearchParams(location.search);
const pick = (key, ok, fallback) => (ok(params.get(key)) ? params.get(key) : fallback);
const hasOption = (sel) => (v) => v !== null && [...sel.options].some((o) => o.value === v);
const f = {
  q: params.get('q') ?? '',
  time: pick('time', hasOption(selects.time), 'any'),
  type: pick('type', hasOption(selects.type), ''),
  where: pick('where', hasOption(selects.where), ''),
  fame: pick('fame', hasOption(selects.fame), ''),
  sort: pick('sort', (v) => v === 'name', 'score'), // "nearest" needs a fresh OK to use location, so it never comes from a link
};
let view = params.get('view') === 'map' && !wide.matches ? 'map' : 'cards';
let shown = PAGE;
let pos = null;
let hits = [];
let words = []; // the search box, split into words

const tests = {
  q: (c) => words.every((w) => text.get(c).includes(` ${w}`)),
  time: (c) => { const b = resolveTime(f.time); return !b || c.dataset.when.split(' ').includes(b); },
  type: (c) => !f.type || c.dataset.type === f.type,
  where: (c) => !f.where || c.dataset.where === f.where || c.dataset.where.startsWith(`${f.where}/`),
  fame: (c) => !f.fame || c.dataset.fame === f.fame,
};
const matches = (c) => Object.values(tests).every((t) => t(c));
const ANY = { time: 'any', type: '', where: '', fame: '' }; // each filter's "no filter" choice
const activeFilters = () => Object.keys(ANY).filter((k) => f[k] !== ANY[k]).length;
// How many places a choice would show, keeping every other filter as it is.
function countIf(key, value) {
  const keep = f[key];
  f[key] = value;
  let n = 0;
  for (const c of cards) if (matches(c)) n++;
  f[key] = keep;
  return n;
}

// ---- Sorting ----
const km = (c) => (pos ? distanceKm(pos, { lat: Number(c.dataset.lat), lng: Number(c.dataset.lng) }) : 0);
const SORTS = {
  score: (a, b) => b.dataset.score - a.dataset.score || a.dataset.name.localeCompare(b.dataset.name),
  name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  near: (a, b) => km(a) - km(b),
};
let order = cards;
function sortCards() {
  const next = [...cards].sort(SORTS[f.sort]);
  if (next.some((c, i) => c !== order[i])) list.append(...next);
  order = next;
  for (const c of cards) c.querySelector('[data-dist]').textContent = f.sort === 'near' && pos ? `${(km(c) * KM_TO_MI).toFixed(1)} mi` : '';
}

// ---- Drawing ----
function render({ refilter = true } = {}) {
  words = fold(f.q).split(' ').filter(Boolean);
  if (refilter) {
    hits = order.filter(matches);
    order.forEach((c) => { c.hidden = true; });
    hits.forEach((c, i) => { c.hidden = i >= shown; });
  }
  const visible = Math.min(shown, hits.length);
  const rest = hits.length - visible;
  moreBtn.hidden = rest <= 0;
  moreBtn.textContent = `Show ${Math.min(PAGE, rest)} more`;
  const paged = rest > 0 && !(view === 'map' && !wide.matches) ? `, showing ${visible}` : ''; // the map shows them all
  $('[data-result]').textContent = hits.length === cards.length
    ? `${cards.length} places${paged}`
    : `${hits.length} of ${cards.length} places${paged}`;
  const active = activeFilters();
  $('[data-clear]').hidden = !active && !f.q.trim();
  const fcount = $('[data-fcount]');
  fcount.hidden = !active;
  fcount.textContent = active;

  empty.classList.toggle('show', !hits.length);
  empty.textContent = hits.length ? '' : 'No doors match all of that. Try fewer filters.';

  // each choice in the dropdowns shows how many places it would leave
  for (const key of Object.keys(ANY)) {
    for (const o of selects[key].options) {
      if (o.value === ANY[key]) continue;
      const n = countIf(key, o.value);
      const label = o.value === 'now' ? `Right now (${TIME_LABEL[currentBucket()].toLowerCase()})` : o.dataset.label;
      o.textContent = `${label} (${n})`;
      o.disabled = !n && o.value !== f[key];
    }
    selects[key].value = f[key];
  }
  selects.sort.value = f.sort;
  if (search.value !== f.q) search.value = f.q;

  writeUrl();
  syncMap();
}

function writeUrl() {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.time !== 'any') p.set('time', f.time);
  for (const k of ['type', 'where', 'fame']) if (f[k]) p.set(k, f[k]);
  if (f.sort === 'name') p.set('sort', 'name');
  if (view === 'map') p.set('view', 'map');
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function refresh() { shown = PAGE; render(); }

// ---- Map ----
let ctrl = null;
let loading = null;
function ensureMap() {
  loading ??= import('./map.js')
    .then(({ createMap }) => {
      const data = JSON.parse(document.getElementById('places-data').textContent);
      ctrl = createMap(document.getElementById('map'), data, { onShowInList: showInList });
      syncMap();
      return ctrl;
    })
    .catch(() => {
      loading = null;
      toast('The map could not load. Check your connection.');
      if (view === 'map') setView('cards');
      return null;
    });
  return loading;
}
const syncMap = () => ctrl?.sync({ state: getState(), ids: new Set(hits.map((c) => c.dataset.id)) });
const mapVisible = () => wide.matches || view === 'map';

function setView(v) {
  view = v;
  main.dataset.view = v;
  $$('button[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === v));
  render({ refilter: false });
  if (mapVisible()) ensureMap().then((c) => c?.resize());
}

// Open a place in the list: page forward if needed, open it, scroll to it.
function showInList(id) {
  const c = byId.get(id);
  if (!c) return;
  const i = hits.indexOf(c);
  if (i === -1) return;
  if (i >= shown) { shown = Math.ceil((i + 1) / PAGE) * PAGE; render(); }
  if (view === 'map') setView('cards');
  c.querySelector('details').open = true;
  c.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  c.classList.remove('flash');
  void c.offsetWidth; // restart the highlight animation
  c.classList.add('flash');
  c.querySelector('summary').focus({ preventScroll: true });
}

// ---- Events ----
let typing;
search.addEventListener('input', () => {
  clearTimeout(typing);
  typing = setTimeout(() => { f.q = search.value; refresh(); }, 140);
});

for (const [key, sel] of Object.entries(selects)) {
  sel.addEventListener('change', async () => {
    if (key !== 'sort') { f[key] = sel.value; refresh(); return; }
    if (sel.value === 'near' && !pos) {
      sel.disabled = true;
      pos = await getPosition();
      sel.disabled = false;
      if (!pos) { toast('Location is off, so sorted by Gem score.'); sel.value = 'score'; }
    }
    f.sort = sel.value;
    sortCards();
    refresh();
  });
}

main.addEventListener('click', (e) => {
  const vb = e.target.closest('button[data-view]');
  if (vb) { setView(vb.dataset.view); return; }
  if (e.target.closest('[data-clear]')) {
    Object.assign(f, { q: '' }, ANY);
    refresh();
    return;
  }
  if (e.target.closest('[data-more]')) {
    const first = hits[shown];
    shown += PAGE;
    render();
    first?.querySelector('summary').focus(); // keyboard users land on the first new place
    return;
  }
  if (e.target.closest('.filters-toggle')) {
    const btn = e.target.closest('.filters-toggle');
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open);
    $('.filters').toggleAttribute('data-open', open);
    return;
  }
  const mapBtn = e.target.closest('[data-action=map]');
  if (mapBtn) {
    const card = mapBtn.closest('.card');
    if (wide.matches) ensureMap().then((c) => c?.focus(card.dataset.id));
    else openSheet(card);
  }
});

// Side-by-side map: opening a place, or pointing at it, finds it on the map.
list.addEventListener('toggle', (e) => {
  if (!e.target.open || !wide.matches || !ctrl) return;
  const id = e.target.closest('.card').dataset.id;
  ctrl.focus(id, { popup: false });
  ctrl.highlight(id);
}, true);
list.addEventListener('pointerover', (e) => {
  if (!ctrl || !wide.matches || e.pointerType !== 'mouse') return;
  ctrl.highlight(e.target.closest('.card')?.dataset.id ?? null);
});
list.addEventListener('pointerleave', () => ctrl?.highlight(null));

wide.addEventListener('change', () => {
  if (wide.matches && view === 'map') setView('cards');
  if (mapVisible()) ensureMap().then((c) => c?.resize());
});

// Marking a place updates the counts and pins, but doesn't yank it out of the list you're looking at.
onChange(() => render({ refilter: false }));

// ---- Start ----
sortCards();
render();
main.dataset.view = view;
$$('button[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === view));
if (mapVisible()) {
  const start = () => ensureMap();
  if (view === 'map') start(); else (window.requestIdleCallback ?? setTimeout)(start);
}
// Arriving from Surprise me or a link: ?focus=<id> opens that place.
const focusId = params.get('focus');
if (focusId && byId.has(focusId)) {
  if (view === 'map') ensureMap().then((c) => c?.focus(focusId));
  else {
    showInList(focusId);
    if (wide.matches) ensureMap().then((c) => c?.focus(focusId));
  }
}
