// "Surprise me": deals a small deck of places you haven't been to, weighted toward ones that fit this hour and are
// close by. Swipe a card right (or press ✓) to add it to your Bucket List, left to pass; ↺ takes the last one back.
// The deck is built after 21st.dev's Card Stack, rewritten in plain JavaScript. Since v2.0 cards move with
// throw physics: a card keeps the speed and direction you threw it with, and one let go short springs home.
// Your location is only requested when you press the button, and it never leaves your device.
import { KM_TO_MI, distanceKm, getPosition } from './geo.js';
import { TIME_LABEL } from './time.js';
import { stubCode } from '../lib/mrz.js';
import { neonFor } from '../lib/neon.js';

const TOO_FAR_KM = 80; // beyond this we say so honestly instead of pretending it's "near you"
const HAND = 6; // cards in one deal
const VIS = 4; // cards drawn in the stack; the last one waits invisibly and fades in as it rises
const MOMENT = { morning: ['This morning', 'Not today'], midday: ['This afternoon', 'Not today'], evening: ['Tonight', 'Not tonight'], late: ['Late tonight', 'Not tonight'] };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const score = (n) => `<span class="score" role="img" aria-label="Gem score ${n} out of 100"><span class="score-cap mono" aria-hidden="true">Gem</span><span class="score-bar" aria-hidden="true"><i style="--v:${n / 100}"></i></span><b class="mono" aria-hidden="true">${n}</b></span>`;
// The place's name as its neon sign (lib/neon.js), the same one as on its page
const sign = (p) => { const n = neonFor(p.id, p.name); return `<h3 class="neon" data-tone="${n.tone}" data-face="${n.face}" style="--tilt:${n.tilt}deg;--len:${[...p.name].length}">${esc(p.name)}</h3>`; };

// ---- Throw physics: a damped spring to bring a card home, and a free flight to throw it away ----
// Positions in px, velocities in px/s. A card leans with its sideways offset, like a held playing card.
const lean = (x) => x * 0.065;
const put = (card, { x, y, r = lean(x) }) => { card.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`; };
const stopMotion = (card) => { cancelAnimationFrame(card._raf); card._raf = 0; };
function springHome(card, from, vel = { vx: 0, vy: 0 }, onMove) {
  stopMotion(card);
  let { x, y } = from, vx = vel.vx, vy = vel.vy, last = performance.now();
  const K = 420, C = 26; // stiffness and damping: a little overshoot, settles in about half a second
  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000); last = now;
    vx += (-K * x - C * vx) * dt; vy += (-K * y - C * vy) * dt;
    x += vx * dt; y += vy * dt;
    const done = Math.abs(x) < 0.4 && Math.abs(y) < 0.4 && Math.hypot(vx, vy) < 8;
    if (done) { x = 0; y = 0; }
    card._pos = { x, y }; put(card, card._pos); onMove?.(card._pos);
    card._raf = done ? 0 : requestAnimationFrame(step);
  };
  card._raf = requestAnimationFrame(step);
}
function throwAway(card, from, vel, onGone) {
  stopMotion(card);
  let { x, y } = from, { vx, vy } = vel, r = lean(x), last = performance.now(), t = 0;
  const spin = vx * 0.045; // degrees per second, from how hard it was thrown
  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000); last = now; t += dt;
    vy += 900 * dt; // it falls a little as it goes
    x += vx * dt; y += vy * dt; r += spin * dt;
    put(card, { x, y, r }); card.style.opacity = String(Math.max(0, 1 - Math.max(0, t - 0.18) * 3));
    if (t < 0.55) card._raf = requestAnimationFrame(step); else { card._raf = 0; onGone(); }
  };
  card._raf = requestAnimationFrame(step);
}

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
      <div class="m mono">${esc(p.area)} · ${esc(p.kind)}</div>
      <div class="sign">${sign(p)}</div>
      ${score(p.score)}
      ${p.sample ? '<span class="sample-flag">Sample, not a real place</span>' : ''}
      <div class="tl">${esc(p.tagline)}</div>
      <div class="or"><b>Order:</b> ${esc(p.order)}</div>
      ${near ? `<div class="near">${esc(near)}</div>` : ''}
      <div class="go"><a href="/place/${esc(p.id)}/">Open</a><a href="${directions}" target="_blank" rel="noopener">Directions ↗</a><button type="button" data-sp="map" data-id="${esc(p.id)}">Map</button></div>
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
        if (returning && fresh && !reduceMotion) { put(card, returning); springHome(card, returning, { vx: -returning.x * 2, vy: -returning.y * 2 }); }
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
    let grab = null, samples = [];
    const keep = card.querySelector('.lbl.keep'), pass = card.querySelector('.lbl.pass');
    card._pos = { x: 0, y: 0 };
    const show = ({ x, y }) => {
      keep.style.opacity = Math.min(1, Math.max(0, (x - 16) / 80));
      pass.style.opacity = Math.min(1, Math.max(0, (-x - 16) / 80));
      lift(Math.min(1, Math.hypot(x, y * 0.5) / 160));
    };
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      stopMotion(card); // catch it mid-spring, from wherever it is
      grab = { ox: e.clientX - card._pos.x, oy: e.clientY - card._pos.y };
      samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
      card.setPointerCapture(e.pointerId);
      card.classList.add('drag');
    });
    card.addEventListener('pointermove', (e) => {
      if (!grab) return;
      const x = e.clientX - grab.ox, ry = e.clientY - grab.oy;
      const y = Math.sign(ry) * Math.min(Math.abs(ry), 48 + Math.max(0, Math.abs(ry) - 48) * 0.3); // up and down isn't a decision, so it gets stiff past a little play
      card._pos = { x, y }; put(card, card._pos); show(card._pos);
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (samples.length > 10) samples.shift();
    });
    const release = (e) => {
      if (!grab) return;
      grab = null; card.classList.remove('drag');
      // How fast it was moving when you let go, from the last tenth of a second
      const recent = samples.filter((s) => e.timeStamp - s.t < 100);
      const span = recent.length > 1 ? (recent.at(-1).t - recent[0].t) / 1000 || 1 : 1;
      const vel = recent.length > 1 ? { vx: (recent.at(-1).x - recent[0].x) / span, vy: (recent.at(-1).y - recent[0].y) / span } : { vx: 0, vy: 0 };
      const { x, y } = card._pos, dir = Math.sign(x);
      const flick = Math.abs(vel.vx) > 500 && Math.sign(vel.vx) === dir && Math.abs(x) > 12;
      const far = Math.abs(x) > Math.min(card.offsetWidth * 0.35, 140);
      if (dir && (flick || far) && e.type !== 'pointercancel') return decide(dir > 0, { x, y, ...vel });
      if (reduceMotion) { card._pos = { x: 0, y: 0 }; put(card, card._pos); show(card._pos); lift(0); return; }
      springHome(card, { x, y }, vel, show); // not far enough: it springs home, keeping your momentum
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  }

  // keep: right (Bucket List) or left (pass). from: where the card was let go and how fast it was moving;
  // the buttons and arrow keys throw it with a firm toss of their own.
  function decide(keep, from = {}) {
    if (!deck || deck.at >= deck.cards.length) return;
    const { p } = deck.cards[deck.at];
    const el = stack.querySelector(`.dc:not(.gone)[data-id="${p.id}"]`), card = el?.querySelector('.dcard');
    const dir = keep ? 1 : -1;
    const x = from.x ?? 0, y = from.y ?? 0;
    // At least a firm toss outward, and never back toward the middle
    const vx = dir * Math.max(1300, Math.abs(from.vx ?? 0)), vy = Math.max(-900, Math.min(600, from.vy ?? -260));
    const exit = { x: x + vx * 0.3, y: y + vy * 0.3 };
    if (card) {
      el.classList.add('gone'); el.inert = true; card.classList.remove('drag');
      card.querySelector(keep ? '.lbl.keep' : '.lbl.pass').style.opacity = 1;
      if (reduceMotion) el.remove(); else throwAway(card, { x, y }, { vx, vy }, () => el.remove());
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
