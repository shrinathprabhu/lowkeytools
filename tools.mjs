// The homepage, structured data, sitemap and llms.txt all use this inventory.
// Positions are local to each section; edit order to move a card.
export const site = {
  url: 'https://lowkey.tools/',
  title: 'lowkey.tools | Tiny, free tools for your browser',
  description: 'Tiny, free, offline-first tools and instant games. No signup, no tracking, nothing to install. Useful things that run in your browser.',
  followUrl: 'https://x.com/intent/follow?screen_name=shrinath_prabhu',
};

export const tools = [
  { id: 'fusellm', name: 'FuseLLM', tagline: 'Your models. Better together.', url: 'https://fusellm.lowkey.tools/', icon: '/icons/fusellm.svg', badges: ['Live', 'Advanced · BYOK'], pwa: false, section: 'featured', order: 1,
    title: 'Chain your own AI models together',
    subtitle: 'Bring your own API key. Run your AI workflows right in your browser.',
    clarification: 'Your workspace stays local. Prompts go directly to your chosen AI providers; their usage fees may apply.',
    cta: 'Try FuseLLM',
  },
  { id: 'superbrain', name: 'SuperBrain', tagline: 'Local-first notes, zero setup', url: 'https://superbrain.lowkey.tools/', icon: '/superbrain-icon.svg', badges: ['Live', 'Installable · works offline'], pwa: true, section: 'apps', order: 1 },
  { id: 'supersplit', name: 'SuperSplit', tagline: 'Split bills. Keep the peace.', url: 'https://supersplit.lowkey.tools/', icon: '/supersplit-icon.png', badges: ['Live', 'Installable · works offline'], pwa: true, section: 'apps', order: 2 },
  { id: 'superfocus', name: 'SuperFocus', tagline: 'A little focus goes far', url: 'https://superfocus.lowkey.tools/', icon: '/icons/superfocus.svg', badges: ['Live', 'Installable · works offline'], pwa: true, section: 'apps', order: 3 },
  { id: 'streakfreak', name: 'StreakFreak', tagline: 'Small habits. Longer streaks.', url: 'https://streakfreak.lowkey.tools/', icon: '/icons/streakfreak.svg', badges: ['Live', 'Installable · works offline'], pwa: true, section: 'apps', order: 4 },
  { id: 'credo', name: 'Credo', tagline: 'Share secrets, keep them secret', url: 'https://credo.lowkey.tools', icon: '/credo-icon.svg', badges: ['Live'], pwa: false, section: 'apps', order: 5 },
  { id: 'converteasy', name: 'Converteasy', tagline: 'Everyday conversions, without the fuss', url: 'https://converteasy.lowkey.tools/', icon: '/icons/converteasy.svg', badges: ['Live'], pwa: false, section: 'apps', order: 6 },
  { id: 'favigen', name: 'Favigen', tagline: 'One image. Every favicon.', url: 'https://favigen.lowkey.tools/', icon: '/favigen-icon.svg', badges: ['Live'], pwa: false, section: 'apps', order: 7 },
  // Billgen is the requested hub label. Billbook is its existing production domain.
  { id: 'billgen', name: 'Billgen', tagline: 'Invoices made easy, kept local', url: 'https://billbook.lowkey.tools/', icon: '/billbook-icon.svg', badges: ['Live', 'Installable · works offline'], pwa: true, section: 'apps', order: 8 },
  { id: 'follow', name: "Something’s lowkey brewing 👀", tagline: 'New tools ship here first. Follow for the drop.', url: '/follow', icon: '?', badges: [], pwa: false, section: 'apps', order: 9, kind: 'teaser', cta: 'Follow for updates', ctaIcon: 'x' },
  { id: 'mathmagician', name: 'MathMagician', tagline: 'Make mental maths your magic', url: 'https://mathmagician.lowkey.tools/', icon: '/icons/mathmagician.svg', badges: ['Live'], pwa: false, section: 'games', order: 1 },
  { id: 'chesscape', name: 'Chesscape', tagline: 'One move. Your daily escape.', url: 'https://chesscape.lowkey.tools/', icon: '/icons/chesscape.svg', badges: ['Live'], pwa: false, section: 'games', order: 2 },
  { id: 'spotfast', name: 'SpotFast', tagline: 'Look sharp. Remember fast.', url: 'https://spotfast.lowkey.tools/', icon: '/spotfast-icon.svg', badges: ['Live'], pwa: false, section: 'games', order: 3 },
];

export const inSection = (section) => tools.filter(tool => tool.section === section).sort((a, b) => a.order - b.order);
export const liveTools = () => ['featured', 'apps', 'games'].flatMap(inSection).filter(tool => tool.kind !== 'teaser' && tool.badges.includes('Live'));
