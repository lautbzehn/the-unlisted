// Builds a 1200x630 share-preview image per place at build time (no per-visitor cost),
// drawn as a paper fight bill to match the site.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { places, FAME } from '../../lib/places.js';

const font = (pkg: string, file: string) =>
  readFileSync(new URL(`../../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const display = font('big-shoulders-display', 'big-shoulders-display-latin-900-normal.woff');
const displayBold = font('big-shoulders-display', 'big-shoulders-display-latin-800-normal.woff');
const serif = font('source-serif-4', 'source-serif-4-latin-400-normal.woff');
const flourish = font('playfair-display', 'playfair-display-latin-600-italic.woff');

const C = { paper: '#ece3d0', bone: '#f5eedf', ink: '#1b1712', mute: '#5e5446', red: '#a8321f' };

export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});
const doubleRule = () => el('div', { flexDirection: 'column', width: '100%' }, [
  el('div', { height: 1, background: C.ink }), el('div', { height: 3 }), el('div', { height: 1, background: C.ink }),
]);

export const GET: APIRoute = async ({ props }) => {
  const p = props.place as (typeof places)[number];
  const nameSize = p.name.length > 24 ? 84 : p.name.length > 16 ? 104 : 128;

  const tree = el('div', { width: '100%', height: '100%', background: C.paper, padding: '34px 56px', flexDirection: 'column', color: C.ink }, [
    doubleRule(),
    el('div', { justifyContent: 'center', alignItems: 'center', marginTop: 14 }, [
      el('div', { width: 90, height: 2, background: C.red }),
      el('div', { fontFamily: 'Display', fontSize: 24, letterSpacing: 10, color: C.red, margin: '0 22px' }, 'THE UNLISTED'),
      el('div', { width: 90, height: 2, background: C.red }),
    ]),
    el('div', { flex: 1, justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }, [
      el('div', { flexDirection: 'column', flex: 1, paddingRight: 40 }, [
        el('div', { fontFamily: 'DisplayBold', fontSize: 26, letterSpacing: 5, color: C.mute, textTransform: 'uppercase' }, `${p.area} · ${p.kind}`),
        el('div', { fontFamily: 'Display', fontSize: nameSize, lineHeight: 0.9, textTransform: 'uppercase', marginTop: 10 }, p.name),
        el('div', { flexDirection: 'column', marginTop: 20, fontSize: 32, fontFamily: 'Serif', lineHeight: 1.3 }, [
          el('span', { fontFamily: 'Flourish', color: C.red, fontSize: 32, marginBottom: 2 }, 'Order this'),
          el('span', {}, p.order.length > 70 ? p.order.slice(0, 68) + '…' : p.order),
        ]),
      ]),
      // ticket stub
      el('div', { flexDirection: 'column', alignItems: 'center', width: 190, border: `2px solid ${C.red}`, color: C.red, background: C.bone, padding: '14px 8px', transform: 'rotate(3deg)' }, [
        el('div', { fontFamily: 'DisplayBold', fontSize: 24, letterSpacing: 8 }, 'GEM'),
        el('div', { fontFamily: 'Display', fontSize: 120, lineHeight: 1 }, String(p.score)),
        el('div', { fontFamily: 'DisplayBold', fontSize: 18, letterSpacing: 5, borderTop: `2px dashed ${C.red}`, paddingTop: 8, marginTop: 6 }, 'ADMIT ONE'),
      ]),
    ]),
    el('div', { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontFamily: 'DisplayBold', fontSize: 22, letterSpacing: 5, color: C.mute }, [
      el('div', {}, (FAME[p.fame] ?? '').toUpperCase()),
      el('div', { flexShrink: 0 }, p.sample ? 'SAMPLE · NOT A REAL PLACE' : 'BAY AREA · ALL HOURS'),
    ]),
    doubleRule(),
  ]);

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Display', data: display, weight: 900, style: 'normal' },
      { name: 'DisplayBold', data: displayBold, weight: 800, style: 'normal' },
      { name: 'Serif', data: serif, weight: 400, style: 'normal' },
      { name: 'Flourish', data: flourish, weight: 600, style: 'italic' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
