// Builds a 1200x630 share-preview image per place at build time (no per-visitor cost).
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { places } from '../../lib/places.js';

const font = (pkg: string, file: string) =>
  readFileSync(new URL(`../../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const playfair = font('playfair-display', 'playfair-display-latin-800-normal.woff');
const elite = font('special-elite', 'special-elite-latin-400-normal.woff');

export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

export const GET: APIRoute = async ({ props }) => {
  const p = props.place as (typeof places)[number];
  const nameSize = p.name.length > 22 ? 64 : 80;

  const tree = el('div', { width: '100%', height: '100%', background: '#17120f', padding: 36, fontFamily: 'Elite' },
    el('div', { flex: 1, border: '4px solid #b8893a', padding: 28, background: '#120e0b' },
      el('div', { flex: 1, background: '#d9c9a7', color: '#241b14', padding: '40px 48px', flexDirection: 'column', justifyContent: 'space-between' }, [
        el('div', { justifyContent: 'space-between', alignItems: 'flex-start' }, [
          el('div', { flexDirection: 'column', flex: 1, paddingRight: 24 }, [
            el('div', { fontSize: 26, letterSpacing: 4, color: '#5f4f3b', textTransform: 'uppercase' }, `${p.area} · ${p.kind}`),
            el('div', { fontFamily: 'Playfair', fontSize: nameSize, lineHeight: 1.05, marginTop: 14 }, p.name),
          ]),
          el('div', {
            width: 168, height: 168, border: '6px solid #7a1f2b', borderRadius: 999, color: '#7a1f2b',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)',
          }, [
            el('div', { fontSize: 22, letterSpacing: 4 }, 'GEM'),
            el('div', { fontFamily: 'Playfair', fontSize: 72, lineHeight: 1 }, String(p.score)),
          ]),
        ]),
        el('div', { flexDirection: 'column' }, [
          el('div', { fontSize: 22, letterSpacing: 5, color: '#7a1f2b' }, 'ORDER THIS'),
          el('div', { fontSize: 34, marginTop: 6, lineHeight: 1.25 }, p.order),
        ]),
        el('div', { justifyContent: 'space-between', alignItems: 'center', borderTop: '3px dashed #7a1f2b88', paddingTop: 18 }, [
          el('div', { fontFamily: 'Playfair', fontSize: 40, color: '#8a6420' }, 'The Unlisted'),
          el('div', { fontSize: 20, letterSpacing: 3, color: '#5f4f3b' }, p.sample ? 'SAMPLE · NOT A REAL PLACE' : 'BAY AREA HOLE-IN-THE-WALL GUIDE'),
        ]),
      ]),
    ),
  );

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Playfair', data: playfair, weight: 800, style: 'normal' },
      { name: 'Elite', data: elite, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
