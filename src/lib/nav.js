// The site map. NAV is the header: five places to go. ABOUT is the small tab bar shared by the About pages,
// and also fills out the phone menu and the footer.
export const NAV = [
  { id: 'explore', href: '/explore/', label: 'Explore' },
  { id: 'passport', href: '/passport/', label: 'My Passport' },
  { id: 'cities', href: '/cities/', label: 'Cities' },
  { id: 'story', href: '/story/', label: 'Our story' },
  { id: 'about', href: '/how-the-score-works/', label: 'About' },
];

export const ABOUT = [
  { href: '/how-the-score-works/', label: 'How the score works' },
  { href: '/help/', label: 'Help' },
  { href: '/suggest/', label: 'Suggest a place' },
  { href: '/contact/', label: 'Contact & feedback' },
  { href: '/privacy/', label: 'Privacy' },
];

// Which header item a page belongs to, for the "you are here" underline.
export const sectionFor = (path) =>
  path === '/' || path === '/san-diego/' || path === '/portland/' ? null
  : /^\/((san-diego|portland)\/)?(explore|place)\b/.test(path) ? 'explore'
  : path.startsWith('/passport') ? 'passport'
  : path.startsWith('/cities') ? 'cities'
  : path.startsWith('/story') ? 'story'
  : ABOUT.some((a) => path.startsWith(a.href)) ? 'about'
  : null;
