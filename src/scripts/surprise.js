// "Surprise me": deals a small deck of places you haven't been to, weighted toward ones that fit this hour and are
// close by. Swipe a card right (or press ✓) to add it to your Bucket List, left to pass; ↺ takes the last one back.
// The deck is built after 21st.dev's Card Stack, rewritten in plain JavaScript.
// Your location is only requested when you press the button, and it never leaves your device.
import { KM_TO_MI, distanceKm, getPosition } from './geo.js';
import { TIME_LABEL } from './time.js';
import { stubCode } from '../lib/mrz.js';

const TOO_FAR_KM = 80; // beyond this we say so honestly instead of pretending it's "near you"
const HAND = 6; // cards in one deal
const VIS = 4; // cards drawn in the stack; the last one waits invisibly and fades in as it rises
const MOMENT = { morning: ['This morning', 'Not today'], midday: ['This afternoon', 'Not today'], evening: ['Tonight', 'Not tonight'], late: ['Late tonight', 'Not tonight'] };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const door = (score) => `<span class="gem-door sm" role="img" aria-label="Gem score ${score} out of 100"><svg viewBox="0 0 40 52" aria-hidden="true"><path class="frame" d="M5 50V20a15 15 0 0 1 30 0v30Z"/><path class="step" d="M1 50.5h38"/><text class="num" x="20" y="32">${score}</text><circle class="keyhole" cx="20" cy="39" r="2"/><path class="keyhole" d="M19 40.5h2l.8 4.2h-3.6Z"/></svg></span>`;

export function initSurprise({ getState, getTime, update, showOnMap, toast }) {
  const dataEl = document.getElementById('places-data');
  const btn = document.getElementById('surprise-btn');
  const dlg = document.getElementById('surprise');
  if (!dataEl || !btn || !dlg) return; // only on the front pages

  const places = JSON.parse(dataEl.textContent);
  const $ = (sel) => dlg.querySelector(sel);
  const stack = $('[data-sp=deck]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const across = document.getElementById('main')?.dataset.short ?? 'the Bay';
  let pos; // undefined = not asked yet, null = declined/unavailable
  let deck = null; // { cards: [{ p, km }], at: index of the top card, hist: [{ id, keep, before, exit }] }

  // A weighted draw without repeats: never somewhere you've stamped, new places before ones already on your list,
  // a pull toward this hour and toward places close to you.
  function deal() {
    const state = getState();
    const { chosen, now } = getTime();
    let pool = places.filter((p) => state[p.id]?.status !== 'ledger');
    if (chosen) pool = pool.filter((p) => (p.when ?? []).includes(chosen));
    if (!pool.length) return { empty: chosen };
    const fresh = pool.filter((p) => !state[p.id]?.status);
    if (fresh.length) pool = fresh;
    const scored = pool.map((p) => {
      const km = pos ? distanceKm(pos, p) : null;
      const nearness = km === null ? 1 : 1 / (1 + (km / 8) ** 2);
      const rightNow = !chosen && (p.when ?? []).includes(now) ? 2.5 : 1;
      return { p, km, w: nearness * rightNow * (0.5 + p.score / 100) };
    });
    const hand = [];
    while (hand.length < HAND && scored.length) {
      let r = Math.random() * scored.reduce((s, x) => s + x.w, 0);
      let i = scored.findIndex((x) => (r -= x.w) <= 0);
      if (i < 0) i = scored.length - 1;
      hand.push(scored.splice(i, 1)[0]);
    }
    return hand;
  }

  function nearLine(km) {
    if (km === null) return pos === null ? `Location is off, so these are from across ${across}.` : '';
    if (km > TOO_FAR_KM) return `About ${Math.round(km * KM_TO_MI)} mi away. Call it a daydream.`;
    return `About ${(km * KM_TO_MI).toFixed(1)} mi from you.`;
  }

  function cardHTML({ p, km }) {
    const near = nearLine(km);
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    return `<div class="dcard">
      <div class="top"><div><div class="m">${esc(p.area)} · ${esc(p.kind)}</div><h3>${esc(p.name)}</h3></div>${door(p.score)}</div>
      ${p.sample ? '<span class="sample-flag">Sample, not a real place</span>' : ''}
      <div class="tl">${esc(p.tagline)}</div>
      <div class="or"><b>Order:</b> ${esc(p.order)}</div>
      ${near ? `<div class="near">${esc(near)}</div>` : ''}
      <div class="go"><a href="/place/${p.id}/">Open</a><a href="${directions}" target="_blank" rel="noopener">Directions ↗</a><button type="button" data-sp="map" data-id="${p.id}">Map</button></div>
      <div class="stub" aria-hidden="true">${esc(stubCode(p))}</div>
      <span class="lbl keep" aria-hidden="true">Bucket List</span><span class="lbl pass" aria-hidden="true">${esc($('[data-sp=pass-label]').textContent)}</span>
    </div>`;
  }

  // Lay out the top few cards. Cards already on the table move to their new place (so the stack rises smoothly);
  // a card coming back from undo flies home from where it left.
  function lay(returning) {
    const { cards, at } = deck;
    const win = cards.slice(at, at + VIS), ids = new Set(win.map((c) => c.p.id));
    stack.querySelectorAll('.dc:not(.gone)').forEach((n) => { if (!ids.has(n.dataset.id)) n.remove(); });
    stack.querySelector('.deck-end')?.remove();
    win.forEach((c, depth) => {
      const place = `translateY(${depth * 12}px) scale(${1 - depth * 0.05})`;
      let el = stack.querySelector(`.dc:not(.gone)[data-id="${c.p.id}"]`);
      const fresh = !el;
      if (fresh) {
        el = document.createElement('div');
        el.className = 'dc'; el.dataset.id = c.p.id; el.innerHTML = cardHTML(c);
        el.style.transform = place; el.style.opacity = 0;
        stack.append(el); void el.offsetWidth;
      }
      el.style.zIndex = VIS - depth; el.style.transform = place;
      el.style.opacity = depth >= VIS - 1 ? 0 : 1;
      el.inert = depth > 0;
      if (depth === 0) {
        const card = el.querySelector('.dcard');
        if (returning && fresh && !reduceMotion) { card.style.transform = returning; void card.offsetWidth; card.classList.add('home'); card.style.transform = ''; }
        if (!card.dataset.drag) { card.dataset.drag = '1'; draggable(card); }
      }
    });
    if (!win.length) {
      const kept = deck.hist.filter((h) => h.keep).length;
      stack.insertAdjacentHTML('beforeend', `<div class="deck-end"><b>${kept ? `${kept} on your Bucket List` : 'Nothing caught your eye'}</b>
        <span>${kept ? 'They’re waiting in My Passport.' : 'Deal another hand?'}</span>
        <button class="btn" type="button" data-sp="again">Deal again</button>${kept ? '<a class="more-link" href="/passport/">Open My Passport →</a>' : ''}</div>`);
    }
    $('[data-sp=undo]').disabled = !deck.hist.length;
    $('[data-sp=keep]').disabled = $('[data-sp=pass]').disabled = !win.length;
  }

  // While a card is dragged, the cards behind it start to rise
  function lift(amount) {
    stack.querySelectorAll('.dc:not(.gone)').forEach((el) => {
      const depth = deck.cards.findIndex((c) => c.p.id === el.dataset.id) - deck.at;
      if (depth <= 0) return;
      const d = depth - amount * 0.4;
      el.style.transform = `translateY(${d * 12}px) scale(${1 - d * 0.05})`;
      if (depth === VIS - 1) el.style.opacity = Math.min(1, amount);
    });
  }

  function draggable(card) {
    let grab = null, x = 0, y = 0, samples = [];
    const keep = card.querySelector('.lbl.keep'), pass = card.querySelector('.lbl.pass');
    const show = () => {
      card.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.065}deg)`;
      keep.style.opacity = Math.min(1, Math.max(0, (x - 16) / 80));
      pass.style.opacity = Math.min(1, Math.max(0, (-x - 16) / 80));
      lift(Math.min(1, Math.hypot(x, y * 0.5) / 160));
    };
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      grab = { ox: e.clientX - x, oy: e.clientY - y };
      samples = [{ t: e.timeStamp, x: e.clientX }];
      card.setPointerCapture(e.pointerId);
      card.classList.add('drag'); card.classList.remove('home');
    });
    card.addEventListener('pointermove', (e) => {
      if (!grab) return;
      x = e.clientX - grab.ox;
      const ry = e.clientY - grab.oy; // up and down isn't a decision, so it gets stiff past a little play
      y = Math.sign(ry) * Math.min(Math.abs(ry), 48 + Math.max(0, Math.abs(ry) - 48) * 0.3);
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 10) samples.shift();
      show();
    });
    const release = (e) => {
      if (!grab) return;
      grab = null; card.classList.remove('drag');
      const recent = samples.filter((s) => e.timeStamp - s.t < 90);
      const speed = recent.length > 1 ? (recent.at(-1).x - recent[0].x) / ((recent.at(-1).t - recent[0].t) / 1000 || 1) : 0;
      const dir = Math.sign(x);
      const flick = Math.abs(speed) > 500 && Math.sign(speed) === dir && Math.abs(x) > 12;
      const far = Math.abs(x) > Math.min(card.offsetWidth * 0.35, 140);
      if (dir && (flick || far) && e.type !== 'pointercancel') return decide(dir > 0, { x, y });
      card.classList.add('home'); x = 0; y = 0; show(); lift(0); // not far enough: spring back
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  }

  function decide(keep, from = { x: 0, y: 0 }) {
    if (!deck || deck.at >= deck.cards.length) return;
    const { p } = deck.cards[deck.at];
    const el = stack.querySelector(`.dc:not(.gone)[data-id="${p.id}"]`), card = el?.querySelector('.dcard');
    const dir = keep ? 1 : -1;
    const exit = `translate(${from.x + dir * 480}px, ${from.y - 70}px) rotate(${dir * 22}deg)`;
    if (card) {
      el.classList.add('gone'); el.inert = true; card.classList.remove('drag', 'home');
      card.querySelector(keep ? '.lbl.keep' : '.lbl.pass').style.opacity = 1;
      void card.offsetWidth; card.classList.add('fly'); card.style.transform = exit;
      setTimeout(() => el.remove(), 600);
    }
    const before = getState()[p.id]?.status;
    deck.hist.push({ id: p.id, keep, before, exit });
    if (keep && before !== 'knock') update(p.id, { status: 'knock' });
    deck.at++;
    $('[data-sp=msg]').textContent = `${p.name}: ${keep ? 'on your Bucket List' : 'passed'}.`;
    lay();
  }

  function undo() {
    const h = deck?.hist.pop();
    if (!h) return;
    deck.at--;
    if (h.keep && h.before !== 'knock') update(h.id, { status: h.before });
    stack.querySelector(`.dc.gone[data-id="${h.id}"]`)?.remove();
    $('[data-sp=msg]').textContent = 'Taken back.';
    lay(h.exit);
  }

  function open() {
    const hand = deal();
    if (!Array.isArray(hand)) {
      toast(hand.empty
        ? `No new doors for ${TIME_LABEL[hand.empty].toLowerCase()} yet. Try "Any time".`
        : "You've been through every door. Time to open a new city.");
      return;
    }
    const [when, no] = MOMENT[getTime().now] ?? MOMENT.evening;
    $('[data-sp=kicker]').textContent = `${when} in ${across}`;
    $('[data-sp=pass-label]').textContent = no;
    stack.replaceChildren();
    deck = { cards: hand, at: 0, hist: [] };
    if (!dlg.open) dlg.showModal();
    lay();
    stack.focus({ preventScroll: true });
  }

  btn.addEventListener('click', async () => {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent;
    btn.textContent = 'Looking around…';
    if (pos === undefined) pos = await getPosition(); // asks permission only the first time
    btn.textContent = label;
    btn.removeAttribute('aria-busy');
    open();
  });

  stack.addEventListener('keydown', (e) => {
    if (e.target !== stack) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); decide(true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false); }
    if (e.key === 'Backspace') { e.preventDefault(); undo(); }
  });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) return dlg.close(); // a click on the backdrop
    const b = e.target.closest('[data-sp]');
    const act = b?.dataset.sp;
    if (act === 'close') dlg.close();
    if (act === 'keep') decide(true);
    if (act === 'pass') decide(false);
    if (act === 'undo') undo();
    if (act === 'again') { open(); }
    if (act === 'map') { dlg.close(); showOnMap(b.dataset.id); }
  });
  dlg.addEventListener('close', () => { deck = null; });
}
