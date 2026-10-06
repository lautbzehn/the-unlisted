// City board: list, vote, add from a fixed list. Talks to the small API in worker/index.js.
const board = document.getElementById('board');
const status = document.getElementById('status');
const form = document.getElementById('suggest');
const pick = document.getElementById('city-pick');
const box = document.getElementById('bot-check');
const VOTED_KEY = 'unlisted:city-votes';

const voted = () => { try { return new Set(JSON.parse(localStorage.getItem(VOTED_KEY)) ?? []); } catch { return new Set(); } };
const remember = (slug) => { try { const v = voted(); v.add(slug); localStorage.setItem(VOTED_KEY, JSON.stringify([...v])); } catch {} };
const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };

// ---- Cloudflare Turnstile, run on demand ----
// The widget stays invisible ("interaction-only") and only runs when someone votes or adds a city.
// It shows itself only if Cloudflare needs a tap to tell a person from a bot.
let widget = null;
let waiting = null; // resolver for the token we're waiting on

function startTurnstile() {
  if (typeof window.turnstile?.render !== 'function') return setTimeout(startTurnstile, 200);
  widget = window.turnstile.render(box, {
    // The real widget only works on the live address; on this computer use Cloudflare's always-pass test key.
    sitekey: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '1x00000000000000000000AA' : box.dataset.sitekey,
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    appearance: 'interaction-only',
    execution: 'execute',
    callback: (t) => { waiting?.(t); waiting = null; },
    'error-callback': () => { waiting?.(null); waiting = null; },
  });
}

function getToken() {
  if (widget === null) return Promise.resolve(null);
  return new Promise((resolve) => {
    waiting = resolve;
    window.turnstile.reset(widget);
    window.turnstile.execute(widget);
    setTimeout(() => { if (waiting === resolve) { waiting = null; resolve(null); } }, 30000);
  });
}

async function post(path, data) {
  say('One moment…');
  const token = await getToken();
  if (!token) { say('The quick bot check didn’t finish. Please try again.', true); return null; }
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, token }) });
  const out = await res.json().catch(() => ({ error: 'Something went wrong.' }));
  if (!res.ok) { say(out.error ?? 'Something went wrong.', true); return null; }
  return out;
}

// ---- Board ----
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
    btn.setAttribute('aria-label', done ? `You voted for ${c.name}` : `Vote for ${c.name}, ${c.region}`);
    btn.disabled = done;
    li.append(rank, name, region, votes, btn);
    return li;
  }));
  if (!cities.length) board.innerHTML = '<li class="board-loading">No cities yet. Add one below.</li>';
  // Cities already on the board are voted on there, so hide them from the "add" list.
  const onBoard = new Set(cities.map((c) => c.slug));
  for (const opt of pick.querySelectorAll('option[value]:not([value=""])')) opt.hidden = opt.disabled = onBoard.has(opt.value);
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
  if (!pick.value) { say('Pick a city from the list first.', true); pick.focus(); return; }
  const btn = form.querySelector('button');
  btn.disabled = true;
  const slug = pick.value;
  const out = await post('/api/cities/suggest', { slug });
  btn.disabled = false;
  if (!out) return;
  remember(slug);
  say(out.message);
  form.reset();
  load();
});

load(); // the board shouldn't depend on the bot check loading
startTurnstile();
