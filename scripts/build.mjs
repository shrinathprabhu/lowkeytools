import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { site, tools, inSection, liveTools } from '../tools.mjs';
import { statusPages, renderStatus } from '../lib/status-pages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const xIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.5L1.8 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/></svg>';

export function validateInventory() {
  const ids = new Set();
  for (const tool of tools) {
    if (ids.has(tool.id) || !/^[a-z0-9-]+$/.test(tool.id)) throw new Error(`Invalid or duplicate tool id: ${tool.id}`);
    ids.add(tool.id);
    if (!['apps', 'games', 'featured'].includes(tool.section) || !Number.isFinite(tool.order)) throw new Error(`Invalid section/order: ${tool.id}`);
    if (tool.kind !== 'teaser' && tool.tagline.trim().split(/\s+/).length > 6) throw new Error(`Tagline exceeds six words: ${tool.id}`);
    if (tool.pwa !== tool.badges.includes('Installable · works offline')) throw new Error(`PWA badge mismatch: ${tool.id}`);
    if (tool.badges.includes('Advanced · BYOK') && tool.id !== 'fusellm') throw new Error('BYOK badge is FuseLLM only');
    if (new URL(tool.url, site.url).protocol !== 'https:') throw new Error(`Invalid URL: ${tool.id}`);
  }
}

function card(tool, index) {
  const featured = tool.section === 'featured';
  const teaser = tool.kind === 'teaser';
  const attributes = `data-tool-id="${escape(tool.id)}" data-position="${index + 1}" data-section="${tool.section}" data-search="${escape([tool.name, tool.tagline, ...tool.badges].join(' '))}"`;
  const badges = tool.badges.map(badge => `<span class="badge ${badge === 'Live' ? 'badge-live' : badge.includes('BYOK') ? 'badge-byok' : 'badge-capability'}">${escape(badge)}</span>`).join('');
  const statusBadges = tool.badges.filter(badge => badge === 'Live' || badge.startsWith('Coming')).map(badge => `<span class="badge${badge === 'Live' ? ' badge-live' : ''}">${escape(badge)}</span>`).join('');
  const capabilities = tool.badges.filter(badge => badge !== 'Live' && !badge.startsWith('Coming')).map(badge => `<span class="badge badge-capability">${escape(badge)}</span>`).join('');
  const icon = teaser ? `<span class="teaser-icon" aria-hidden="true">${escape(tool.icon)}</span>` : `<span class="tool-icon"><img src="${escape(tool.icon)}" width="36" height="36" alt=""></span>`;
  if (featured) return `<a class="tool featured" href="${escape(tool.url)}" ${attributes}>
    <div class="featured-copy"><div class="featured-label">${icon}<span>${escape(tool.name)}</span><span class="badges">${badges}</span></div>
    <h2>${escape(tool.title)}</h2><p class="featured-subtitle">${escape(tool.subtitle)}</p><p class="featured-note">${escape(tool.clarification)}</p>
    <span class="cta">${escape(tool.cta)} <span aria-hidden="true">↗</span></span></div>
    <div class="circuit" aria-hidden="true"><span class="circuit-caption">A LITTLE TEAMWORK</span><div class="circuit-nodes"><span>✳</span><i></i><span>✦</span><i></i><span>↗</span></div><span class="circuit-caption">A LOT OF POSSIBILITY</span></div>
  </a>`;
  return `<li${teaser ? ' class="teaser-cell"' : ''}><a class="tool${teaser ? ' tool-teaser' : ''}" href="${escape(tool.url)}" ${attributes}>
    <div class="card-top">${icon}${teaser ? '<span class="tool-go" aria-hidden="true">ON THE HORIZON</span>' : tool.section === 'games' ? '<span class="tool-go" aria-hidden="true">↗</span>' : statusBadges}</div>
    <h3 class="tool-name">${escape(tool.name)}</h3><p class="tool-desc">${escape(tool.tagline)}</p>
${teaser ? `    <span class="follow-cta">${tool.ctaIcon === 'x' ? xIcon : ''}${escape(tool.cta)}</span>` : tool.section === 'games' ? `    <span class="badges">${badges}</span>` : capabilities ? `    <span class="badges">${capabilities}</span>` : ''}
  </a></li>`;
}

export async function build() {
  validateInventory();
  const live = liveTools();
  const graph = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': `${site.url}#website`, url: site.url, name: 'lowkey.tools', description: site.description, creator: { '@id': 'https://shrinath.me/#person' }, publisher: { '@id': 'https://owleye.dev/#organization' } },
      { '@type': 'Organization', '@id': 'https://owleye.dev/#organization', name: 'OwlEye Analytics', url: 'https://owleye.dev', founder: { '@id': 'https://shrinath.me/#person' } },
      { '@type': 'Person', '@id': 'https://shrinath.me/#person', name: 'Shrinath Prabhu', url: 'https://shrinath.me' },
      { '@type': 'CollectionPage', '@id': `${site.url}#webpage`, url: site.url, name: site.title, creator: { '@id': 'https://shrinath.me/#person' }, isPartOf: { '@id': `${site.url}#website` }, mainEntity: { '@id': `${site.url}#toollist` } },
      { '@type': 'ItemList', '@id': `${site.url}#toollist`, numberOfItems: live.length, itemListElement: live.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'WebApplication', name: tool.name, creator: { '@id': 'https://shrinath.me/#person' }, url: new URL(tool.url, site.url).href, description: tool.tagline, applicationCategory: tool.section === 'games' ? 'GameApplication' : 'UtilitiesApplication', operatingSystem: 'Any web browser', isAccessibleForFree: true } })) },
    ],
  };
  const values = { TITLE: escape(site.title), DESCRIPTION: escape(site.description), URL: escape(site.url), JSONLD: JSON.stringify(graph).replace(/</g, '\\u003c'), FEATURED: inSection('featured').map(card).join('\n'), APPS: inSection('apps').map(card).join('\n'), GAMES: inSection('games').map(card).join('\n'), APP_COUNT: inSection('apps').filter(t => t.kind !== 'teaser').length, GAME_COUNT: inSection('games').length };
  const template = await readFile(`${root}index.template.html`, 'utf8');
  const html = '<!-- Generated by scripts/build.mjs from tools.mjs and index.template.html. -->\n' + template.replace(/\{\{(\w+)\}\}/g, (_, key) => { if (!(key in values)) throw new Error(`Unknown template token: ${key}`); return values[key]; });
  const sitemapUrls = [...new Set([site.url, ...live.map(tool => new URL(tool.url, site.url)).filter(url => url.origin === new URL(site.url).origin).map(url => url.href)])];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated from tools.mjs. Only canonical URLs on the hub origin belong here. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  const llms = `# lowkey.tools\n\n> ${site.description}\n\nCanonical hub: ${site.url}\n\nNo accounts or mandatory installation. Offline capability is marked per tool. FuseLLM sends prompts directly to user-selected AI providers; provider usage may cost money. The hub counts anonymous card impressions and clicks without cookies, visitor IDs, search terms or tool content.\n\n${['featured', 'apps', 'games'].map(section => `## ${section === 'featured' ? 'Featured' : section === 'apps' ? 'Apps' : 'Games'}\n\n${inSection(section).filter(t => live.includes(t)).map(t => `- [${t.name}](${t.url}): ${t.tagline}. ${t.badges.join('; ')}.${t.id === 'billgen' ? ' Published as Billbook.' : ''}`).join('\n')}`).join('\n\n')}\n\n## Creator\n\nBuilt by Shrinath Prabhu, creator of OwlEye Analytics.\n\n- [OwlEye Analytics](https://owleye.dev)\n- [Shrinath Prabhu](https://shrinath.me)\n- [Follow new releases](${site.url}follow)\n`;
  await mkdir(`${root}dist`, { recursive: true });
  for (const [name, content] of [['index.html', html], ['sitemap.xml', sitemap], ['llms.txt', llms]]) {
    await writeFile(`${root}${name}`, content);
    await writeFile(`${root}dist/${name}`, content);
  }
  const assets = (await readdir(root)).filter(name => /\.(svg|png|ico)$/.test(name));
  for (const name of [...assets, 'styles.css', 'main.js', 'theme.js', 'robots.txt', 'site.webmanifest', 'icons', 'fonts']) await cp(`${root}${name}`, `${root}dist/${name}`, { recursive: true });
  const css = await readFile(`${root}styles.css`, 'utf8');
  for (const code of Object.keys(statusPages)) {
    const page = renderStatus(code, css);
    await writeFile(`${root}dist/${code}.html`, page);
    if (code === '404') await writeFile(`${root}404.html`, page);
  }
  console.log(`Built ${live.length} live tools and ${tools.length - live.length} teaser into dist/.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
