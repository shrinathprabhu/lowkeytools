# lowkey.tools

The hub for tiny, free browser tools. Plain HTML, CSS and JavaScript, hosted on Cloudflare Workers,
with no framework, third-party scripts or package dependencies. A small Node
script generates static HTML and discovery files from one tool inventory.
The only runtime function handles `/follow` redirects and anonymous usage counts.

## Develop and verify

Requires Node 22 or newer. No install step is needed.

```sh
npm run dev    # generates dist/, then previews http://localhost:4321
npm test       # inventory/discovery and redirect/event boundary checks
npm run build # regenerate checked-in output and dist/ for deployment
```

Restart the preview after editing source files. This preview serves the real
follow handler but does not emulate the Worker's legacy tool proxy rules
(use `npm run preview:cloudflare` for those). A simple
static file server also works for browsing, but cannot handle `/follow`.

Optional browser checks use an existing Playwright installation and Chrome:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser.mjs
```

They exercise desktop/tablet/mobile geometry, both themes, blocked storage,
keyboard filtering, actual card navigation and event payloads, no-JavaScript
browsing, privacy opt-outs and the HTTP redirect. Screenshots go to `/tmp/`.

## Edit the inventory

**`tools.mjs` is the only card-data source.** Change `order` to reorder within a
section, or add one entry to add a tool. Run `npm run build`; Cloudflare Workers
Builds also does this automatically. No layout changes are needed.

```js
{
  id: 'example',
  name: 'Example',
  tagline: 'Six words or fewer here',
  url: 'https://example.lowkey.tools/',
  icon: '/icons/example.svg',
  badges: ['Live'],
  pwa: false,
  section: 'apps', // apps, games, or featured
  order: 10,
}
```

- `Live` includes a tool in llms.txt and JSON-LD. Only same-origin tool URLs
  can also appear in the hub sitemap. Use `Coming soon`
  (optionally another date badge) to keep a planned tool out of those live lists.
  Give upcoming cards a working announcement destination; cards are real links.
- Only SuperBrain, SuperSplit, SuperFocus, StreakFreak and Billgen have
  `Installable · works offline` in this brief. Set `pwa` consistently with that
  badge. Only FuseLLM gets `Advanced · BYOK`.
- The `kind: 'teaser'` entry owns all teaser text, glyph, CTA, link and position.
  Set `ctaIcon: 'x'` for a follow CTA; omit it for a plain announcement CTA.
  Edit that entry to rotate its announcement. It is excluded from live-tool SEO.
  A new real tool should use a normal entry with its icon and status.
- Featured text, disclosure and CTA also live in the inventory.
- All real tool taglines are validated to contain at most six words.

`index.template.html` owns the page structure. `styles.css` owns layout/themes.
`main.js` enhances the static links with filtering and anonymous events.
`theme.js` applies saved/system theme before the stylesheet paints. Blocked
localStorage does not break the page. No-JavaScript visitors retain every card
and get their system theme; unusable search/toggle controls remain hidden.

The generator writes `index.html`, `llms.txt` and `sitemap.xml` in the repository
and in `dist/`. Do not edit generated copies. Only public assets are copied to
`dist/`; source, tests, documentation and the launch kit are not published.
`api/follow.js` is a Web Standard handler bundled into the Worker.

## URLs and deployment

All twelve live tool roots were checked on 2026-09-15. Cards use their existing
subdomains and canonical slash conventions. **Billgen links to Billbook's
existing `https://billbook.lowkey.tools/` deployment.** Credo currently declares
its root without a trailing slash. Hub identity is `https://lowkey.tools/`.

Legacy path proxies (`/superbrain`, `/supersplit`, `/favigen`, `/credo`,
`/billbook`, `/spotfast`) live in `worker/index.js`, along with the response
header policy. This change does not migrate the individual tools or their hosting.

- `/follow` and `/follow/` are handled by `api/follow.js` inside the Worker.
- The handler logs the follow hit, then returns **302** to
  `https://x.com/intent/follow?screen_name=shrinath_prabhu` with `Cache-Control:
  no-store`. It ignores caller query strings. HEAD/prefetch requests do not count.

Local build/tests do not deploy the site. After deployment, verify the `/follow`
302 and event records in Cloudflare Workers Logs on the production hostname.

## Anonymous analytics

The previous hub had **no analytics SDK or configuration**, including on the
live site. The default implementation therefore emits structured JSON to the hosting
platform logs (Cloudflare Workers Logs), through the existing `/follow` function. It needs no account keys,
new third-party script, cookies, database, or browser/session identifiers.

Browser POSTs to `/follow` contain only:

```json
{"event":"tool_click","tool_id":"superbrain","section":"apps","position":1,"visible_position":1}
```

- `position` is the original one-based slot in its section, assigned from config
  order; `visible_position` is the slot after filtering. The DOM exposes
  `data-tool-id` and `data-position` on each entire link.
- `tool_click` handles pointer/keyboard activation and middle clicks. Beacon or
  keepalive delivery does not block navigation. Following also produces a
  separate server `follow_click` event: do not add it to `tool_click` totals.
- `tool_impression` fires once per card per page load when at least half the
  card is visible. Group clicks and impressions by ID, section and position to
  compare click/impression rates. Repeat clicks can exceed impressions: these
  are aggregate interactions, not unique-user CTR or confirmed tool usage.
- Inspect/export those event records from Cloudflare Workers Logs. Retention and
  access depend on the hosting account. There is no analytics dashboard bundled
  here. For longer comparisons, export the logs or connect the log sink to the
  intended analytics service when its configuration is available.
- No search queries, page URLs, referrers, IP addresses, user agents, keys or
  tool contents are included in application events. DNT and GPC suppress counts.
  Cloudflare's own platform request logging is separate from these application events.
- The event receiver validates inventory IDs/positions, accepts at most 512
  bytes, rejects cross-site browser requests and strips extra fields. Like other
  public analytics endpoints it is not proof against scripted/bot traffic.
- Delivery is best effort. Offline visits, blocked requests and opt-outs are not
  counted. GET `/follow` counts requests, not verified X follows; X may require
  sign-in. The redirect remains functional if application logging fails.

The footer discloses these anonymous counts. The FuseLLM card preserves the
requested subtitle and explicitly clarifies that prompts go to the selected
AI providers and provider fees can apply.

## SEO and assets

Hub title/description, OG/Twitter tags and JSON-LD derive from the same config.
The existing `og.png` is a valid 1200 × 630 hub preview. This pass does not change
individual tools' social images. Existing brand assets are reused locally.

The generated hub sitemap contains only canonical, indexable URLs on
`https://lowkey.tools/`; currently, this is just the homepage. Tool subdomains
use their own sitemaps. They remain linked from the homepage, JSON-LD and
llms.txt. The generator excludes other origins automatically, so adding a tool
won't reintroduce subdomains. `www`, wildcard hosts, error pages and `/follow`
are excluded. `/follow` also sends `noindex`.

`robots.txt` allows search/answer-engine crawlers. The hub registers no service
worker. Existing favicon/social source regeneration stays in `build-icons.sh`.

## Typography and mobile layout

Geist Sans 1.7.2 is bundled at `fonts/geist-sans-v1.7.2.woff2`, with its SIL Open
Font License in `fonts/geist-OFL.txt`. It uses `font-display: swap`, is preloaded,
and makes no third-party font request. The font asset comes from the same official
Geist package already used by SuperFocus. No italic or cursive type is used.

The original Lowkey palette is retained: warm off-white, charcoal, and a small
orange accent matching the logo. Tiles use existing local favicons so mobile
cards stay compact. Apps remain two columns on phones; the teaser spans the last
row. Games use a compact three-card row that scrolls horizontally on narrow
screens. Mobile search text is 16px to avoid focus zoom on iOS, and the theme
button is 44px. The document has no horizontal overflow at 320px.

## HTTP error pages

`lib/status-pages.mjs` owns the shared recovery page and messages for **400, 403,
404, 405, 410, 413, 429, 500, 502, 503 and 504**. The build emits each status as a
static `<code>.html` file in `dist/`; the checked-in `404.html` is generated too.
Pages are noindex, share the logo/palette/Geist and saved theme, and have real
links back to the toolbox and Games. They include inline CSS so recovery still
works when assets fail. They have no analytics and require no JavaScript.

- The Workers asset binding serves `dist/404.html` for unmatched static routes
  with a real 404 status. There is no catch-all 200 rewrite.
- `/follow` application errors return branded HTML with their real 400, 403,
  405 or 413 code. Successful event collection still returns an empty 204;
  navigation still returns its 302.
- The local server serves `/404.html` (or `/404`) with 404, `/503.html` with 503,
  and likewise for every supported status. It also returns branded real errors
  for missing files and unsupported methods. These named local URLs allow QA;
  simply requesting a static status file on a host does not simulate a platform
  outage or guarantee that status code there.
- Cloudflare platform-level errors (edge failures, upstream timeouts) are not
  replaced by these pages, nor is error handling inside separately deployed tools.

With the preview running, verify the status pages using an existing Playwright
installation:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser-status.mjs
```

This checks all 11 HTTP statuses and HEAD responses, actual missing-page 404s,
application error HTML, mobile overflow, font loading, theme persistence across
recovery, and recovery with JavaScript/stylesheets/fonts unavailable.

## Cloudflare Workers custom domains

`wrangler.jsonc` deploys the generated `dist/` assets and `worker/index.js` as
`lowkey-tools`, with these domain rules:

| Host | Behavior |
| --- | --- |
| `lowkey.tools` | Root custom domain; serves the hub |
| `www.lowkey.tools` | Custom domain; **308 permanent redirect** to `https://lowkey.tools`, preserving path, query and method |
| `*.lowkey.tools/*` | Wildcard Worker route; unknown subdomains return the branded **404** |

The catch-all always serves error HTML with **HTTP 404** for every unknown-host
path and method (HEAD returns the same status without a body). It never redirects
to the root and never returns the homepage with a 200 status.

The wildcard is a **route**, not a Custom Domain. Cloudflare Custom Domains do
not accept wildcards. The Worker runs before all assets so even `www` requests
for CSS, icons, or `/follow` redirect first. Listed tool hosts from `tools.mjs`
pass through to their existing origins; more-specific Worker routes also take
precedence. Keep existing tool DNS records and Workers bindings. Add any future
tool's URL to the inventory before routing it through this wildcard zone.

### DNS prerequisite for the catch-all

In Cloudflare DNS for `lowkey.tools`, the wildcard must resolve through Cloudflare:

| Type | Name | Value | Proxy | TTL |
| --- | --- | --- | --- | --- |
| AAAA | `*` | `100::` | Proxied | Auto |

This is a placeholder origin for an edge-only route: the Worker returns 404 for
unknown hosts without contacting it. Preserve any existing explicit records.
Inspect an existing wildcard before replacing it. Normal full-zone Cloudflare
TLS coverage must cover `*.lowkey.tools`; deeper nested subdomains may need
additional certificates. Wrangler does not create this wildcard DNS record.

The two exact Custom Domains are registered by Wrangler on deployment. The
`lowkey.tools` zone must already be active in the deploying account. Resolve any
conflicting root/www DNS records before deploying.

```sh
npm run preview:cloudflare # local Workers runtime on port 8787
npm run deploy:cloudflare  # build + deploy, registers exact custom domains/routes
```

Cloudflare Workers Builds: repository root, build command `npm run build`, deploy
command `npx wrangler@4 deploy`. Wrangler's configured custom build also runs the
static generator when invoked directly. Local verification used Wrangler 4.131.1.

The Worker reuses `/follow` and its analytics validation, the legacy path
proxies, and header policy. On Cloudflare, anonymous event JSON appears
in Workers Logs (`observability.enabled` is set). The static-asset binding serves
the generated `404.html` with 404, not a SPA fallback. The unknown-host error page
uses the canonical root as its base so recovery links and assets lead back to
the hub. Proxied upstream applications retain their own error responses.

A Wrangler dry run and local runtime checks do not provision domains, DNS, or TLS.

References: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
[Worker routes and precedence](https://developers.cloudflare.com/workers/configuration/routing/routes/),
[wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).

## Layout stability and the 404 game

The homepage and status pages share the same 1040px outer container and responsive
padding. A stable scrollbar gutter prevents width jumps when search shortens a
page. Search and theme controls reserve their space before JavaScript loads.
Geist is preloaded with `font-display: optional`: on a slow first visit, the system
font stays for that navigation rather than swapping late and moving content.
Only the small saved-theme initializer runs before paint; external scripts defer.
Hover transitions affect color and transforms and respect reduced motion.

The 404 page includes a five-question math game with touch/keyboard controls,
scoring and replay. Its deferred inline module needs no external application,
network requests, storage, timers or animation loop. Without JavaScript, the
recovery links remain available. Other status pages do not load the game.

Optional browser checks against `npm run dev` (supply `PLAYWRIGHT_MODULE` if
Playwright is installed outside this repository):

```sh
node tests/browser-performance.mjs
node tests/browser-game.mjs
```

The performance check covers homepage, 404 and 500 at 320, 390, 768 and 1440px,
with 4× CPU throttling and deliberately delayed fonts/scripts. It asserts zero
observed CLS, no tasks exceeding 50ms, aligned header/main/footer edges, no page
overflow, stable widths while filtering and reduced-motion support. These are
local lab checks, not a guarantee for every device or production environment.

### Catch-all diagnosis and live verification

On September 16, 2026, `fuse.lowkey.tools` returned `NXDOMAIN`: the hostname could
not resolve, so the request never reached the Worker. A wildcard Worker route
alone does not create wildcard DNS. Add the proxied `AAAA` record `*` → `100::`
listed above, then ensure the latest Worker and its `*.lowkey.tools/*` route are
deployed. Keep explicit app records intact. A DNS change needs authenticated
Cloudflare access and cannot be configured as a DNS record in `wrangler.jsonc`.

```sh
npm run check:domains
```

This read-only check tests root, the permanent www redirect, `fuse.lowkey.tools`,
and a fresh unknown hostname. It fails clearly on missing DNS, incorrect status,
or an older 404 response missing the game. A missing hostname must return HTTP
404 with the game and a recovery link to the canonical hub, not a redirect or 200.
