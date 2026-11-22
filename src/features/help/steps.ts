// The steps of "How it works", on the front page and, with more and a link
// to take each step, on its own page

export const STEPS = [
  {
    title: 'Search',
    text: 'Any package or npm user. Everything public works without an account.',
    more: 'A package shows its downloads, releases, health score, known vulnerabilities and who depends on it. A user shows every package they maintain.',
    action: { to: '/', label: 'Search packages' }
  },
  {
    title: 'Sign in with GitHub',
    text: 'Get a dashboard with the packages you track, and keep it between visits.',
    more: 'Signing in is optional. You need it for the dashboard and to add an npm token.',
    action: { to: '/dashboard', label: 'Go to your dashboard' }
  },
  {
    title: 'Add an npm token, if you like',
    text: "For complete data without rate limits. It's stored encrypted and only used by the server, never sent to your browser.",
    more: 'Without one, npm limits how much the site can fetch, so some numbers can be missing for a while.',
    action: { to: '/profile/secrets/new', label: 'Add a token' }
  }
];
