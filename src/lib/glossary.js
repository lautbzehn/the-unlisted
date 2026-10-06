// What every label on the site means. The Help page and the hover/tap tooltips both read from here,
// so the explanation is written once and always matches.
export const LISTS = {
  bucket: { name: 'Bucket List', tip: 'Places you want to go. Tap “+ Bucket List” on any place to save it. Saved on this device only.' },
  stamped: { name: 'Stamped', tip: 'Places you’ve been. Tap “Stamp it” after a visit, then rate it and leave yourself a note.' },
  rating: { name: 'Your rating', tip: 'Your own 1 to 5 stamps for a place you’ve been. Private, saved on this device, never part of the Gem score.' },
};

export const FAME_TIPS = {
  'deep-cut': 'Deep cut: barely written about anywhere. You probably heard about it from someone, not a website.',
  'open-secret': 'Open secret: locals know it and a little press has covered it, but it’s still easy to walk past.',
  'local-legend': 'Local legend: decades in, on every “best of” list, probably a line. Still the real thing.',
};

export const WHEN_TIPS = {
  morning: 'Morning: usually open before 10 am.',
  midday: 'Midday: lunch hours, roughly 11 am to 3 pm.',
  evening: 'Evening: dinner hours, roughly 5 to 9 pm.',
  late: 'Late: usually open past 10 pm.',
};

export const SCORE_TIP = 'Gem score, 0 to 100: how much a place feels like a secret worth keeping. Five marks, weighted. See “How the score works” for the math.';

export const MARK_TIPS = {
  uniqueness: 'Could this exist anywhere else?',
  atmosphere: 'What does it feel like to be in the room?',
  story: 'Is there a real reason this place exists?',
  signature: 'Is there one thing you should order?',
  radar: 'How few people already know about it. Set by the deep cut / open secret / local legend label.',
};

export const PIN_TIPS = {
  none: 'Not on your lists yet',
  bucket: 'On your Bucket List',
  stamped: 'Stamped: you’ve been',
};
