# lowkey.tools

The hub landing page for lowkey.tools. Plain static HTML, no build step, no
dependencies. It lists the live tools and proxies each one onto this domain by
path prefix.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole landing page, including JSON-LD |
| `styles.css` | All styling, light and dark |
| `404.html` | Not found page (Vercel serves this automatically) |
| `vercel.json` | Path prefix rewrites to each tool, plus headers |
| `icon.svg` | The mark on its own, source of truth |
| `favicon.svg` | The mark on a rounded badge, used as the browser icon |
| `og.svg` | Source for the social card |
| `build-icons.sh` | Regenerates the PNG and ICO files from the SVGs |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Crawler and answer engine files |
| `site.webmanifest` | Icons and metadata for home screen installs |

Generated files, committed so the deploy stays build free: `favicon.ico`,
`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og.png`.

## Local preview

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321.

## Regenerating the icons

Only needed if the mark changes. Uses macOS Quick Look, so it is a Mac only script.

```bash
./build-icons.sh
```

## How the tools get onto this domain

Each tool stays exactly as it is: its own repo, its own deployment, its own
hosting. Nothing is merged. `vercel.json` on this hub forwards by path prefix,
so `lowkey.tools/supersplit/group-id/expense` is served transparently by
supersplit's own deployment. The origin platform does not matter, Vercel will
proxy to a Netlify hosted app fine.

Two changes are needed per app, in the app's own repo:

1. **Router basename.** `BrowserRouter basename="/supersplit"` for React Router,
   or `createWebHistory('/supersplit/')` for Vue Router, so internal links
   resolve under the prefix instead of assuming root.
2. **Build base path.** Vite `base: '/supersplit/'`, or webpack `publicPath`, so
   built JS and CSS are requested from `/supersplit/assets/...` and get caught by
   the same rewrite. This is the step people usually miss: routing works, then
   assets 404.

If a tool registers a service worker or a PWA manifest, scope it to its own
prefix too, otherwise two service workers fight over the root. The hub itself
must not register a service worker at `/` for the same reason.

## Promoting a tool from coming soon to live

Credo is listed on the page as coming soon. It is deliberately absent from
`vercel.json`, `sitemap.xml` and the JSON-LD, because a rewrite pointing at an
origin that is not up yet, or structured data for a URL that 404s, is worse than
nothing. When it ships, move it across using the checklist below and swap its
card from `<div class="tool tool--soon">` to a normal `<a class="tool">`.

## Adding a new tool

1. Add the two rewrite lines to `vercel.json` (the bare path and the wildcard,
   both are needed or the prefix without a trailing slash 404s).
2. Add a `<li>` to the tool list in `index.html`.
3. Add the tool to the `ItemList` in the JSON-LD block and bump `numberOfItems`.
4. Add it to `sitemap.xml` and to `llms.txt`.
5. Update the count next to "Live now".

## SEO notes

- `robots.txt` explicitly allows the answer engine crawlers (GPTBot, ClaudeBot,
  PerplexityBot and friends) on top of the blanket allow, so the tools can be
  cited by them.
- `llms.txt` is a plain text summary of the site for language models.
- The JSON-LD graph ties the site to OwlEye Analytics as publisher, which is the
  link that carries entity signal back to owleye.dev.
- **Open decision:** each tool is now reachable at two addresses, its subdomain
  and its hub path. Pick one as canonical. The hub sitemap currently claims the
  path versions, so each tool should set
  `<link rel="canonical" href="https://lowkey.tools/<tool>/...">` and ideally
  redirect its subdomain to the hub path. Leaving both indexable splits the
  ranking signal between them.
