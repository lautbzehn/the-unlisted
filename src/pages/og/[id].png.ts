// Builds a 1200x630 share-preview image per place at build time (no per-visitor cost),
// drawn as an old passport page to match the site: sepia, letterpress title, the Gem door.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { places, FAME, whenText, METROS, whereText } from '../../lib/places.js';

const font = (pkg: string, file: string) =>
  readFileSync(new URL(`../../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const sans = font('archivo', 'archivo-latin-400-normal.woff');
const sansBold = font('archivo', 'archivo-latin-800-normal.woff');
const serif = font('source-serif-4', 'source-serif-4-latin-400-normal.woff');
const title = font('im-fell-english-sc', 'im-fell-english-sc-latin-400-normal.woff');

// The site's colors (src/styles/global.css).
const C = { bg: '#15110c', ink: '#eee2c8', mute: '#b5a68a', accent: '#d9784f', brass: '#a08a62' };

export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const GET: APIRoute = async ({ props }) => {
  const p = props.place as (typeof places)[number];
  const nameSize = p.name.length > 26 ? 80 : p.name.length > 16 ? 96 : 116;
  const where = whereText(p);
  const labels = [FAME[p.fame], whenText(p.when)].filter(Boolean).join(' · ');

  const tree = el('div', { width: '100%', height: '100%', background: C.bg, padding: 28 }, [
    // an engraved double rule (the image tool can't draw `double` borders, so it's two nested lines)
    el('div', { flex: 1, border: `2px solid ${C.brass}`, padding: 6 }, [
    el('div', { flex: 1, flexDirection: 'column', border: '1px solid rgba(160,138,98,0.6)', padding: '28px 44px', color: C.ink, fontFamily: 'Sans' }, [
      el('div', { justifyContent: 'space-between', alignItems: 'center' }, [
        el('div', { fontFamily: 'Title', fontSize: 40 }, 'The Unlisted'),
        el('div', { fontSize: 24, color: C.mute }, p.sample ? 'Sample, not a real place' : `${METROS[p.metro]?.name ?? 'Bay Area'} · All hours`),
      ]),
      el('div', { flex: 1, alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { flexDirection: 'column', flex: 1, paddingRight: 48 }, [
          el('div', { fontSize: 28, color: C.mute }, clip(`${where} · ${p.kind}`, 52)),
          el('div', { fontFamily: 'Title', fontSize: nameSize, lineHeight: 1, marginTop: 8 }, p.name),
          p.tagline ? el('div', { fontFamily: 'Serif', fontSize: 30, color: C.ink, marginTop: 10, opacity: 0.9 }, p.tagline) : null,
          el('div', { flexDirection: 'column', marginTop: 22, padding: '12px 20px', borderLeft: `5px solid ${C.accent}`, background: 'rgba(217,120,79,0.1)', borderRadius: '0 10px 10px 0' }, [
            el('div', { fontFamily: 'SansBold', fontSize: 22, color: C.accent }, 'Order'),
            el('div', { fontFamily: 'Serif', fontSize: 28, lineHeight: 1.3, marginTop: 2 }, clip(p.order, 70)),
          ]),
        ]),
        // the Gem door: the score on a little arched door with a keyhole
        el('div', { position: 'relative', width: 200, height: 260, flexShrink: 0 }, [
          { type: 'svg', props: { width: 200, height: 260, viewBox: '0 0 40 52', style: { position: 'absolute', left: 0, top: 0 }, children: [
            { type: 'path', props: { d: 'M5 50V20a15 15 0 0 1 30 0v30Z', fill: 'rgba(217,120,79,0.1)', stroke: C.accent, strokeWidth: 1.6, strokeLinejoin: 'round' } },
            { type: 'path', props: { d: 'M1 50.5h38', stroke: C.accent, strokeWidth: 1.6, strokeLinecap: 'round' } },
            { type: 'circle', props: { cx: 20, cy: 39, r: 2, fill: C.accent } },
            { type: 'path', props: { d: 'M19 40.5h2l.8 4.2h-3.6Z', fill: C.accent } },
          ] } },
          el('div', { position: 'absolute', left: 0, right: 0, top: 58, justifyContent: 'center', fontFamily: 'SansBold', fontSize: 20, letterSpacing: 6, color: C.accent }, 'GEM'),
          el('div', { position: 'absolute', left: 0, right: 0, top: 86, justifyContent: 'center', fontFamily: 'SansBold', fontSize: 78, lineHeight: 1, color: C.ink }, String(p.score)),
        ]),
      ]),
      el('div', { justifyContent: 'space-between', fontSize: 24, color: C.mute }, [
        el('div', {}, labels),
        el('div', {}, 'unlisted.icarianforge.com'),
      ]),
    ]),
    ]),
  ]);

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Sans', data: sans, weight: 400, style: 'normal' },
      { name: 'SansBold', data: sansBold, weight: 800, style: 'normal' },
      { name: 'Serif', data: serif, weight: 400, style: 'normal' },
      { name: 'Title', data: title, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
