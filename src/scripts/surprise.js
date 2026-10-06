// "Surprise Me": a weighted dice roll over places you haven't been to, nudged toward nearby ones.
// Your location is only requested when you press the button, and it never leaves your device.
const KM_TO_MI = 0.621371;
const TOO_FAR_KM = 80; // beyond this we say so honestly instead of pretending it's "near you"

const toRad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 },
    );
  });
}

import { TIME_LABEL } from './time.js';

export function initSurprise({ getState, getTime, update, showOnMap, toast }) {
  const dataEl = document.getElementById('places-data');
  const btn = document.getElementById('surprise-btn');
  const dlg = document.getElementById('surprise');
  if (!dataEl || !btn || !dlg) return; // only on the home page

  const places = JSON.parse(dataEl.textContent);
  const $ = (sel) => dlg.querySelector(sel);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pos; // undefined = not asked yet, null = declined/unavailable
  let current = null;
  let lastId = null;

  function pick() {
    const state = getState();
    const { chosen, now } = getTime();
    let pool = places.filter((p) => state[p.id]?.status !== 'ledger'); // never somewhere you've been
    if (chosen) pool = pool.filter((p) => (p.when ?? []).includes(chosen)); // respect the time filter
    if (!pool.length) return { empty: chosen };
    const undiscovered = pool.filter((p) => !state[p.id]?.status);
    if (undiscovered.length) pool = undiscovered;
    if (pool.length > 1) pool = pool.filter((p) => p.id !== lastId); // never the same twice in a row
    if (!pool.length) return null;

    const scored = pool.map((p) => {
      const km = pos ? distanceKm(pos, p) : null;
      const nearness = km === null ? 1 : 1 / (1 + (km / 8) ** 2); // gentle pull toward close places
      const rightNow = !chosen && (p.when ?? []).includes(now) ? 2.5 : 1; // on "Any time", lean toward places that fit this hour
      return { p, km, w: nearness * rightNow * (0.5 + p.score / 100) };
    });
    let r = Math.random() * scored.reduce((s, x) => s + x.w, 0);
    for (const x of scored) if ((r -= x.w) <= 0) return x;
    return scored[scored.length - 1];
  }

  function fill({ p, km }) {
    current = p;
    $('#sp-title').textContent = p.name;
    $('[data-sp=meta]').textContent = `${p.area} · ${p.kind}`;
    $('[data-sp=score]').textContent = p.score;
    $('[data-sp=story]').textContent = p.story;
    $('[data-sp=order]').textContent = p.order;
    let where;
    if (km === null) where = pos === null ? 'Location is off, so this one is picked from across the Bay.' : '';
    else if (km > TOO_FAR_KM) where = `You're about ${Math.round(km * KM_TO_MI)} mi away. We're Bay Area only for now, so call this one a daydream.`;
    else where = `About ${(km * KM_TO_MI).toFixed(1)} mi from you.`;
    $('[data-sp=where]').textContent = where;
    $('[data-sp=sample]').hidden = !p.sample;
    $('[data-sp=open]').href = `/place/${p.id}/`;
    $('[data-sp=directions]').href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    syncKnock();
  }

  function syncKnock() {
    const on = getState()[current.id]?.status === 'knock';
    const b = $('[data-sp=knock]');
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? 'On your Knock List ✓' : 'Knock Later';
  }

  async function shuffleThenReveal(choice) {
    const card = $('.sp-card');
    fill(choice);
    card.classList.remove('revealed');
    if (reduceMotion) { card.classList.add('revealed'); return; }
    const slot = $('[data-sp=slot]');
    card.classList.add('shuffling');
    const started = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        if (performance.now() - started > 1000) return resolve();
        slot.textContent = places[Math.floor(Math.random() * places.length)].name;
        setTimeout(tick, 70);
      };
      tick();
    });
    card.classList.remove('shuffling');
    card.classList.add('revealed');
  }

  async function roll(fromButton) {
    const choice = pick();
    if (!choice || choice.empty !== undefined) {
      toast(choice?.empty
        ? `No new doors for ${TIME_LABEL[choice.empty].toLowerCase()} yet. Try "Any time".`
        : "You've been through every door. Time to open a new city.");
      return false;
    }
    lastId = choice.p.id;
    if (!dlg.open) dlg.showModal();
    await shuffleThenReveal(choice);
    if (fromButton) $('[data-sp=again]').focus({ preventScroll: true });
    return true;
  }

  btn.addEventListener('click', async () => {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent;
    btn.textContent = 'Looking around…';
    if (pos === undefined) pos = await getPosition(); // asks permission only the first time
    btn.textContent = label;
    btn.removeAttribute('aria-busy');
    roll(false);
  });

  dlg.addEventListener('click', async (e) => {
    if (e.target === dlg) return dlg.close(); // click on the backdrop
    const act = e.target.closest('[data-sp]')?.dataset.sp;
    if (act === 'close') dlg.close();
    if (act === 'again') roll(true);
    if (act === 'knock') {
      const s = getState()[current.id] || {};
      update(current.id, { status: s.status === 'knock' ? undefined : 'knock' });
      syncKnock();
    }
    if (act === 'map') { dlg.close(); showOnMap(current.id); }
  });
}
