import raw from '../data/places.json';
import TAGLINES from '../data/taglines.json'; // one line per place: why it's unique (written from each story)
import { gemScore, withRadar } from './scoring.js';

// While developing locally, unreviewed drafts from the research batches show up too (marked DRAFT, flags visible),
// so they can be reviewed in the real app. The public build only ever contains approved places.
const draftFiles = import.meta.env.DEV ? import.meta.glob('../../data/review/batch-*.json', { eager: true, import: 'default' }) : {};
const drafts = Object.values(draftFiles).flat().map((d) => ({ ...d, draft: true }));

export const FAME = { 'deep-cut': 'Deep cut', 'open-secret': 'Open secret', 'local-legend': 'Local legend' };
export const WHEN = { morning: 'Morning', midday: 'Midday', evening: 'Evening', late: 'Late' };
// ['morning', 'midday'] -> "Good for morning and midday"
export const whenText = (when = []) => {
  const w = when.map((k) => WHEN[k].toLowerCase());
  return w.length ? `Good for ${w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w.at(-1)}` : w[0]}` : '';
};

// Broad kinds of place, for browsing. Worked out from each place's free-text description ("Donut shop, since 1960"),
// checked in this order so a "donut shop turned diner" counts as a diner.
export const TYPES = {
  breakfast: 'Breakfast & diners',
  coffee: 'Coffee & sweets',
  counter: 'Counters & trucks',
  sitdown: 'Sit-down meals',
  bar: 'Bars',
};
const TYPE_RULES = [
  ['coffee', /\b(coffee|espresso|dessert) bar\b/],
  ['sitdown', /\b(sushi bar|seafood bar|hot pot|pho house)\b/],
  ['bar', /\b(bar|pub|saloon|drinking|dive|tavern|speakeasy|cantina)\b/],
  ['breakfast', /\b(diner|breakfast|brunch|waffle|silog)\b/],
  ['counter', /dim sum|b[aá]nh m[iì]|\btorta|sandwich/],
  ['coffee', /\b(coffee|coffeehouse|espresso|bakery|donut|pastry|panader[ií]a|pandesal|manju|cake|ice cream|crepe)\b/],
  ['counter', /\b(counter|window|truck|trailer|stand|takeout|deli|slice|taqueria|taco shop|cafeteria|shack|turo-turo|canteen|market)\b/],
  ['sitdown', /\b(noodle|pho|hong kong-style cafe|pork chop house)\b/],
  ['coffee', /\bcafe\b/],
];
export const typeOf = (kind = '') => TYPE_RULES.find(([, re]) => re.test(kind.toLowerCase()))?.[0] ?? 'sitdown';

export const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "Mission District (south)" and "Mission District" are the same neighborhood for browsing.
export const hoodOf = (area) => area.replace(/\s*\(.*\)\s*$/, '');

// The metro areas the guide covers, each with its own front page and Explore page. Places without a metro are
// Bay Area (the first city). `short` finishes phrases like "in the Bay"; `more` labels the small towns in Where.
export const METROS = {
  'bay-area': { id: 'bay-area', name: 'Bay Area', the: 'the Bay Area', short: 'the Bay', home: '/', explore: '/explore/', main: 'San Francisco', more: 'More of the Bay', center: [-122.35, 37.78], zoom: 9.5 },
  'san-diego': { id: 'san-diego', name: 'San Diego', the: 'San Diego', short: 'San Diego', home: '/san-diego/', explore: '/san-diego/explore/', main: 'San Diego', more: 'More of San Diego County', center: [-117.12, 32.75], zoom: 10.2 },
};
const LIVE_METROS = Object.keys(METROS);
// Which city a page belongs to, from its address
export const metroOf = (path = '/') => (path.startsWith('/san-diego') ? 'san-diego' : 'bay-area');

// Sources and review notes stay internal: they never ship to visitors.
export const places = [...raw.filter((p) => p.status === 'approved' || p.sample), ...drafts]
  .filter((p) => LIVE_METROS.includes(p.metro ?? 'bay-area'))
  .map(({ sources, flags, status, approved, seed, osm, ...pub }) => {
    const city = pub.city ?? 'San Francisco';
    const hood = hoodOf(pub.area);
    return {
      ...pub,
      metro: pub.metro ?? 'bay-area',
      city,
      tagline: pub.tagline ?? TAGLINES[pub.id] ?? '',
      type: typeOf(pub.kind),
      where: `${slug(city)}/${slug(hood)}`,
      breakdown: withRadar(pub.breakdown, pub.fame),
      score: gemScore(withRadar(pub.breakdown, pub.fame)),
      ...(pub.draft ? { reviewFlags: flags ?? [] } : {}),
    };
  })
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

// What the browser scripts need (Surprise me, the map), without the long fields.
export const slim = (list) => list.map(({ id, name, metro, area, city, kind, tagline, score, story, order, lat, lng, when, sample }) => (
  { id, name, metro, area, city, kind, tagline, score, story, order, lat, lng, when, sample }
));

// "Mission District" or "Fruitvale, Oakland": a city's own neighborhoods stand alone, and a name never repeats
export const whereText = (p) => (p.area === p.city || p.city === METROS[p.metro ?? 'bay-area']?.main ? p.area : `${p.area}, ${p.city}`);

// One city's places
export const placesIn = (metro) => places.filter((p) => p.metro === metro);

// The "Where" choices: big cities get their neighborhoods, small ones are grouped together.
export function whereGroups(list = places, more = METROS['bay-area'].more) {
  const byCity = new Map();
  for (const p of list) {
    const c = byCity.get(p.city) ?? { city: p.city, n: 0, hoods: new Map() };
    c.n++;
    const h = hoodOf(p.area);
    c.hoods.set(h, (c.hoods.get(h) ?? 0) + 1);
    byCity.set(p.city, c);
  }
  const cities = [...byCity.values()].sort((a, b) => b.n - a.n);
  const big = cities.filter((c) => c.n >= 4 && c.hoods.size > 1).map((c) => ({
    label: c.city,
    options: [
      { value: slug(c.city), label: `All of ${c.city}`, n: c.n },
      ...[...c.hoods].sort(([a], [b]) => a.localeCompare(b)).map(([h, n]) => ({ value: `${slug(c.city)}/${slug(h)}`, label: h, n })),
    ],
  }));
  const small = cities.filter((c) => !(c.n >= 4 && c.hoods.size > 1))
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((c) => ({ value: slug(c.city), label: c.city, n: c.n }));
  return small.length ? [...big, { label: more, options: small }] : big;
}

// The busiest neighborhoods, for the front page.
export function topHoods(list = places, max = 12) {
  const m = new Map();
  for (const p of list) {
    const key = p.where;
    const e = m.get(key) ?? { where: key, label: hoodOf(p.area), city: p.city, n: 0 };
    e.n++;
    m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).slice(0, max);
}
