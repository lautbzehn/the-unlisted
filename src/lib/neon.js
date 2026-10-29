// How a place's name is hung as a neon sign, generated from its id so it's the same everywhere it appears
// (the place page, the front page's deep cuts, the share image): the tube color (stamp red or cold light),
// the lettering (script or block), a slight hand-hung tilt, and which letter flickers.
export function neonFor(id, name) {
  let h = 2166136261; // FNV-1a
  for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const letters = [...name].map((ch, i) => ({ ch, i })).filter(({ ch }) => /\p{L}/u.test(ch));
  return {
    tone: h & 1 ? 'red' : 'cold',
    face: (h >>> 1) & 1 ? 'script' : 'block',
    tilt: (((h >>> 2) % 5) - 2) * 0.6, // -1.2deg to 1.2deg
    flicker: letters.length ? letters[(h >>> 5) % letters.length].i : -1,
  };
}
