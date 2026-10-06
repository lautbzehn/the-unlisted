// The Hidden Gem Score: a weighted average of four marks, each 0-100.
// This one file is the single source of truth. The cards, the share images and the
// "How the score works" page calculator all use it, so what we publish is what we compute.
export const MARKS = [
  { key: 'uniqueness', label: 'Uniqueness', weight: 0.3 },
  { key: 'atmosphere', label: 'Atmosphere', weight: 0.25 },
  { key: 'story', label: 'Story', weight: 0.25 },
  { key: 'signature', label: 'Signature item', weight: 0.2 },
];

export const gemScore = (marks) => Math.round(MARKS.reduce((sum, m) => sum + marks[m.key] * m.weight, 0));
