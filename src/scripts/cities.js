// City board: list, vote, suggest. Talks to the small API in worker/index.js.
const board = document.getElementById('board');
const status = document.getElementById('status');
const form = document.getElementById('suggest');
const box = document.getElementById('bot-check');
const VOTED_KEY = 'unlisted:city-votes';

let token = null;
let widget = null;

const voted = () => { try { return new Set(JSON.parse(localStorage.getItem(VOTED_KEY)) ?? []); } catch { return new Set(); } };
const remember = (slug) => { try { const v = voted(); v.add(slug); localStorage.setItem(VOTED_KEY, JSON.stringify([...v])); } catch {} };
const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };

// Turnstile: one fresh token per action, then reset for the next one.
function startTurnstile() {
  if (typeof window.turnstile?.render !== 'function') return setTimeout(startTurnstile, 200);
  widget = window.turnstile.render(box, {
    // The real widget only works on the live address; on this computer use Cloudflare's always-pass test key.
    sitekey: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '1x00000000000000000000AA' : box.dataset.sitekey,
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    callback: (t) => { token = t; },
    'expired-callback': () => { token = null; },
    'error-callback': () => { token = null; say('The bot check didn’t load. Refresh the page to try again.', true); },
  });
}
function useToken() {
  const t = token;
  token = null;
  if (widget !== null) window.turnstile.reset(widget);
  return t;
}

async function post(path, data) {
  const t = useToken();
  if (!t) { say('One second: finish the “not a bot” check above, then try again.', true); return null; }
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, token: t }) });
  const out = await res.json().catch(() => ({ error: 'Something went wrong.' }));
  if (!res.ok) { say(out.error ?? 'Something went wrong.', true); return null; }
  return out;
}

function render({ board: cities }) {
  const mine = voted();
  board.replaceChildren(...cities.map((c, i) => {
    const li = document.createElement('li');
    li.className = 'board-row';
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(i + 1).padStart(2, '0');
    const name = document.createElement('span'); name.className = 'board-name'; name.textContent = c.name;
    const region = document.createElement('span'); region.className = 'board-region'; region.textContent = c.region ?? '';
    const votes = document.createElement('span'); votes.className = 'board-votes'; votes.textContent = `${c.votes} ${c.votes === 1 ? 'vote' : 'votes'}`;
    const btn = document.createElement('button');
    btn.className = 'btn-ghost'; btn.type = 'button'; btn.dataset.slug = c.slug;
    const done = mine.has(c.slug);
    btn.textContent = done ? 'Voted ✓' : 'Vote';
    btn.setAttribute('aria-pressed', done);
    btn.setAttribute('aria-label', done ? `You voted for ${c.name}` : `Vote for ${c.name}`);
    btn.disabled = done;
    li.append(rank, name, region, votes, btn);
    return li;
  }));
  if (!cities.length) board.innerHTML = '<li class="board-loading">No cities yet. Suggest one below.</li>';
}

async function load() {
  try {
    const res = await fetch('/api/cities');
    render(await res.json());
  } catch {
    board.innerHTML = '<li class="board-loading">The board couldn’t load. Refresh to try again.</li>';
  }
}

board.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-slug]');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const out = await post('/api/cities/vote', { slug: btn.dataset.slug });
  if (!out) { btn.disabled = false; return; }
  remember(btn.dataset.slug);
  say(out.message);
  load();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!String(data.name).trim()) { say('Type a city name first.', true); form.elements.name.focus(); return; }
  const btn = form.querySelector('button');
  btn.disabled = true;
  const out = await post('/api/cities/suggest', data);
  btn.disabled = false;
  if (!out) return;
  say(out.message);
  form.reset();
  load();
});

load(); // the board shouldn't depend on the bot check loading
startTurnstile();
