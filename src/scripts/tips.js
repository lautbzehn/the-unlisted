// Tooltips for anything with data-tip="...": shown on hover, keyboard focus, or a tap (phones).
// One floating bubble, positioned above the element (or below when there's no room).
const pop = document.createElement('div');
pop.className = 'tip-pop';
pop.setAttribute('role', 'tooltip');
pop.id = 'tip-pop';
pop.hidden = true;
document.body.append(pop);
let owner = null;

function show(el) {
  owner = el;
  pop.textContent = el.dataset.tip;
  pop.hidden = false;
  el.setAttribute('aria-describedby', 'tip-pop');
  const r = el.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const above = r.top - h - 10 > 0;
  pop.style.left = `${left + scrollX}px`;
  pop.style.top = `${(above ? r.top - h - 10 : r.bottom + 10) + scrollY}px`;
}
function hide() {
  if (owner) owner.removeAttribute('aria-describedby');
  owner = null;
  pop.hidden = true;
}

document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); if (el && el !== owner) show(el); });
document.addEventListener('mouseout', (e) => { if (owner && !owner.contains(e.relatedTarget)) hide(); });
document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) show(el); });
document.addEventListener('focusout', hide);
// Taps: the "?" buttons toggle their tip; tapping anywhere else closes it.
document.addEventListener('click', (e) => {
  const q = e.target.closest('.tip-q');
  if (q) { e.preventDefault(); owner === q ? hide() : show(q); return; }
  if (!e.target.closest('[data-tip]')) hide();
});
addEventListener('scroll', hide, { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
