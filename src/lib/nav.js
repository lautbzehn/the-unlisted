// The site map. NAV is the header: four places to go. ABOUT is the small tab bar shared by the About pages,
// and also fills out the phone menu and the footer.
export const NAV = [
  { id: 'explore', href: '/explore/', label: 'Explore' },
  { id: 'passport', href: '/passport/', label: 'My Passport' },
  { id: 'cities', href: '/cities/', label: 'Cities' },
  { id: 'about', href: '/story/', label: 'About' },
];

export const ABOUT = [
  { href: '/story/', label: 'Our story' },
  { href: '/how-the-score-works/', label: 'How the score works' },
  { href: '/help/', label: 'Help' },
  { href: '/suggest/', label: 'Suggest a place' },
  { href: '/contact/', label: 'Contact' },
  { href: '/privacy/', label: 'Privacy' },
];

// Which header item a page belongs to, for the "you are here" underline.
export const sectionFor = (path) =>
  path === '/' ? null
  : /^\/(explore|place)\b/.test(path) ? 'explore'
  : path.startsWith('/passport') ? 'passport'
  : path.startsWith('/cities') ? 'cities'
  : ABOUT.some((a) => path.startsWith(a.href)) ? 'about'
  : null;
