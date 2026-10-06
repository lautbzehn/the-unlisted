// The site map: one definition drives the header menus, the phone menu and the footer.
export const NAV = [
  { id: 'explore', label: 'Explore', items: [
    { href: '/#places', label: 'All places', hint: 'Every door, with filters' },
    { href: '/?view=map#places', label: 'Map', hint: 'See them on a map' },
    { href: '/#surprise', label: 'Surprise me', hint: 'One place, picked for you' },
    { href: '/?time=now#places', label: 'Right now', hint: 'Good for this hour' },
  ] },
  { id: 'cities', label: 'Cities', items: [
    { href: '/', label: 'Bay Area', hint: 'Open now' },
    { href: '/cities/', label: 'San Diego', hint: 'Opening soon' },
    { href: '/cities/', label: 'Next cities', hint: 'Vote on what opens next' },
    { href: '/cities/#add', label: 'Request a city', hint: 'Pick from the list' },
  ] },
  { id: 'passport', label: 'My Passport', items: [
    { href: '/?list=knock#places', label: 'Bucket List', hint: 'Places you want to go' },
    { href: '/?list=ledger#places', label: 'Stamped', hint: 'Places you’ve been' },
  ] },
  { id: 'suggest', label: 'Suggest', items: [
    { href: '/suggest/', label: 'Suggest a place', hint: 'Know a door we should knock on?' },
    { href: '/cities/#add', label: 'Request a city', hint: 'Pick from the list' },
  ] },
  { id: 'about', label: 'About', items: [
    { href: '/story/', label: 'Our story', hint: 'Why this exists' },
    { href: '/how-the-score-works/', label: 'How the score works', hint: 'The math, and its limits' },
    { href: '/help/', label: 'Help & labels', hint: 'What everything means' },
    { href: '/contact/', label: 'Contact', hint: 'Say hello' },
  ] },
];

// Which menu a page belongs to, for the header's "you are here" underline.
export const sectionFor = (path) =>
  path.startsWith('/cities') ? 'cities'
  : path.startsWith('/suggest') ? 'suggest'
  : /^\/(story|help|contact|how-the-score-works)/.test(path) ? 'about'
  : 'explore';
