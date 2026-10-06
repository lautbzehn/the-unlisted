// The Hidden Gem Score: a weighted average of five marks, each 0-100.
// This one file is the single source of truth. The cards, the share images, the review sheets and the
// "How the score works" calculator all use it, so what we publish is what we compute.
//
// Four marks come from research. The fifth, "Under the radar", is set by how well-known a place is, so the
// least hidden places can't win just by being the best documented.
export const RADAR = { 'deep-cut': 90, 'open-secret': 60, 'local-legend': 25 };

export const MARKS = [
  { key: 'uniqueness', label: 'Uniqueness', short: 'Uniqueness', weight: 0.25 },
  { key: 'atmosphere', label: 'Atmosphere', short: 'Atmosphere', weight: 0.2 },
  { key: 'story', label: 'Story', short: 'Story', weight: 0.2 },
  { key: 'signature', label: 'Signature item', short: 'Signature', weight: 0.15 },
  { key: 'radar', label: 'Under the radar', short: 'Under radar', weight: 0.2 },
];

// Fill in the fifth mark from the place's fame label.
export const withRadar = (breakdown, fame) => ({ ...breakdown, radar: breakdown.radar ?? RADAR[fame] ?? RADAR['open-secret'] });

export const gemScore = (marks) => Math.round(MARKS.reduce((sum, m) => sum + marks[m.key] * m.weight, 0));
