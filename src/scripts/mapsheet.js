// Opens the slide-up map for one place (phones, and the place's own page).
// The map code only downloads the first time someone opens it.
const dlg = document.getElementById('map-sheet');
const $ = (sel) => dlg.querySelector(sel);

export async function openSheet(card) {
  const p = {
    id: card.dataset.id, name: card.dataset.name, area: card.dataset.area,
    lat: Number(card.dataset.lat), lng: Number(card.dataset.lng),
  };
  $('#ms-title').textContent = p.name;
  $('[data-ms=meta]').textContent = p.area;
  $('[data-ms=directions]').href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  dlg.showModal();
  try {
    const { showOne } = await import('./map.js');
    showOne(document.getElementById('sheet-map'), p);
  } catch {
    $('#sheet-map').textContent = 'The map could not load. Check your connection, or use Directions.';
  }
}

dlg?.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('[data-ms=close]')) dlg.close(); // backdrop or a close button
});
