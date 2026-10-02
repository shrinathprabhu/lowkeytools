import { themeBoot } from './theme.mjs';
import { analyticsScripts } from './analytics.mjs';
import { mathGameHTML, mathGameScript } from './math-game.mjs';

// Shared static error copy; no request URL, query, or exception is reflected.
export const statusPages = {
  400: { title: 'That request looks incomplete.', message: 'We couldn’t understand this request. Head back to the toolbox and try again.' },
  403: { title: 'This request isn’t allowed.', message: 'This part of the site isn’t available through that request. The public tools are still a good place to start.' },
  404: { title: 'A little off the beaten path.', message: 'This page doesn’t exist, or it has moved. Your next useful find is back in the toolbox.' },
  405: { title: 'Try opening the page instead.', message: 'This address doesn’t support that kind of request. Open the toolbox to continue.' },
  410: { title: 'This page has retired.', message: 'This page is no longer available. Explore the toolbox for something useful today.' },
  413: { title: 'That request is too large.', message: 'There’s more here than this page can accept. Go back and try a smaller request.' },
  429: { title: 'A moment to catch up.', message: 'Too many requests arrived at once. Give it a little time, then try again.' },
  500: { title: 'A small hiccup on our side.', message: 'Something went wrong while opening this page. Please try again in a moment.' },
  502: { title: 'We couldn’t reach that tool.', message: 'The service behind this page didn’t respond correctly. Please try again shortly.' },
  503: { title: 'Taking a short breather.', message: 'This service is temporarily unavailable. Give it a moment, then try again.' },
  504: { title: 'That took a little too long.', message: 'The service didn’t respond in time. Please try again in a moment.' },
};

// Critical styles remain inline so recovery links are usable during asset failures.
const fallbackCSS = `:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0 auto;max-width:1040px;width:100%;padding:28px 32px;font:16px/1.6 Geist,system-ui,sans-serif;background:#faf9f6;color:#191b1f}a{color:inherit}header{display:flex;align-items:center;justify-content:space-between}header a{display:flex;align-items:center;gap:9px;text-decoration:none;font-weight:650}main{padding:48px 0;width:100%}.status-code{font-size:90px;line-height:1;color:#62666e;letter-spacing:-.06em}h1{font-size:36px;line-height:1.15;letter-spacing:-.04em}.status-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.status-actions a{display:inline-flex;align-items:center;min-height:46px;padding:10px 16px;border:1px solid #d3cec3;border-radius:8px;text-decoration:none}.status-actions .primary{background:#191b1f;color:#fff}footer{font-size:13px}[data-pending]{visibility:hidden}.theme-toggle{width:44px;height:44px}html{scrollbar-gutter:stable both-edges}.math-game{border:1px solid #d3cec3;border-radius:12px;padding:20px;margin-top:24px}.game-answers{display:flex;gap:10px}.math-game button{min-height:46px;min-width:46px;padding:10px}.game-question{font-size:32px}.game-feedback{min-height:3em}@media(prefers-color-scheme:dark){body{background:#121316;color:#ececea}.status-actions .primary{background:#ececea;color:#121316}}`;

// The inline modules run after the deferred analytics bundles, so the global is ready.
export function renderStatus(code, css = fallbackCSS) {
  const page = statusPages[code] || statusPages[500];
  const effectiveCode = statusPages[code] ? Number(code) : 500;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${effectiveCode} | ${page.title} | lowkey.tools</title>
<meta name="robots" content="noindex, follow"><meta name="color-scheme" content="light dark">
<meta name="theme-color" id="theme-color" content="#faf9f6">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/geist-sans-v1.7.2.woff2" as="font" type="font/woff2" crossorigin>
${themeBoot}<style>${css}</style><link rel="stylesheet" href="/styles.css">
${analyticsScripts.replaceAll('\n  ', '\n')}
<script src="/theme.js" defer></script>
</head><body class="status-page">
<header class="site-head"><a class="brand" href="/" aria-label="lowkey.tools home"><img src="/favicon.svg" width="32" height="32" alt=""><span class="wordmark">lowkey<span class="dot">.</span>tools</span></a>
<button id="theme-toggle" class="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="false" data-pending><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z"/></svg></button></header>
<main id="main" class="status-main"><div class="status-copy"><div class="status-code" aria-hidden="true">${effectiveCode}</div><h1>${page.title}</h1><p class="lede">${page.message}</p>
<div class="status-actions"><a class="primary" href="/" data-owleye-track="status-home">Back to the toolbox <span aria-hidden="true">&nbsp;↗</span></a><a href="/#games-title" data-owleye-track="status-games">Take a game break</a></div></div>${effectiveCode === 404 ? mathGameHTML : ''}</main>
<footer class="status-foot"><p>Small tools, quietly useful. <a href="/">lowkey.tools</a></p><p>Built by <a href="https://shrinath.me" data-owleye-track="author-link">Shrinath Prabhu</a>, creator of <a href="https://owleye.dev" data-owleye-track="owleye-link">OwlEye Analytics</a>.</p></footer>
<script type="module">window.OwlEyeAnalytics?.track('status_page_viewed', { status: ${effectiveCode} });</script>
${effectiveCode === 404 ? mathGameScript : ''}
</body></html>\n`;
}
