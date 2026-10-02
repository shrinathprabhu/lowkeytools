import { handleFollow } from '../api/follow.js';
import { renderStatus } from '../lib/status-pages.mjs';
import { tools } from '../tools.mjs';

// Response headers by path. A later matching rule overrides an earlier one.
const policy = [
  { match: /^\/$/, headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' } },
  { match: /^\/(styles\.css|favicon\.svg|favicon\.ico|icon\.svg|apple-touch-icon\.png|icon-192\.png|icon-512\.png|og\.png)$/, headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  { match: /^\/hotlink-ok\//, headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  { match: /^\/(robots\.txt|sitemap\.xml|llms\.txt|site\.webmanifest|\.well-known\/security\.txt)$/, headers: { 'Cache-Control': 'public, max-age=3600' } },
  { match: /^\/(main\.js|theme\.js)$/, headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } },
  { match: /^\/fonts\//, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  // Versioned directory names: a new SDK release gets a new URL.
  { match: /^\/vendor\//, headers: { 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } },
  { match: /^\/(400|403|404|405|410|413|429|500|502|503|504)\.html$/, headers: { 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-store' } },
];
const toolHosts = new Set(tools.filter(tool => tool.url.startsWith('https://')).map(tool => new URL(tool.url).hostname).filter(host => host.endsWith('.lowkey.tools')));

// Legacy path proxies: /<name>, /<name>/ and /<name>/* map to <name>.lowkey.tools.
const proxied = /^\/(superbrain|supersplit|favigen|credo|billbook|spotfast)(?:\/(.*))?$/;
export function proxyTarget(url) {
  const found = url.pathname.match(proxied);
  if (!found) return null;
  const target = new URL(`/${found[2] ?? ''}`, `https://${found[1]}.lowkey.tools`);
  target.search = url.search;
  return target;
}

function applyHeaders(response, pathname) {
  const result = new Response(response.body, response);
  for (const rule of policy) {
    if (rule.match.test(pathname)) {
      for (const [key, value] of Object.entries(rule.headers)) result.headers.set(key, value);
    }
  }
  if (result.status >= 400) {
    result.headers.set('Cache-Control', 'no-store');
    result.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  if (pathname.startsWith('/fonts/')) result.headers.set('Access-Control-Allow-Origin', '*');
  return result;
}

function errorResponse(request, code, headers = {}) {
  return new Response(request.method === 'HEAD' ? null : renderStatus(code), {
    status: code,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Always run before static assets, proxies or analytics. Preserve path/query
    // and method, and use a fixed origin to avoid open redirects.
    if (url.hostname === 'www.lowkey.tools') {
      url.protocol = 'https:';
      url.hostname = 'lowkey.tools';
      url.port = '';
      return new Response(null, { status: 308, headers: { Location: url.href } });
    }
    if (url.hostname.endsWith('.lowkey.tools')) {
      // A wildcard route runs in front of existing custom-domain Workers and
      // other proxied origins. Pass known tool hosts to their existing origin.
      if (toolHosts.has(url.hostname)) return fetch(request);
      // Unknown hosts must never serve the hub (or loop on relative home links).
      const page = renderStatus(404).replace('<head>', '<head><base href="https://lowkey.tools/">');
      return new Response(request.method === 'HEAD' ? null : page, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' },
      });
    }
    try {
      if (['/follow', '/follow/', '/api/follow'].includes(url.pathname)) return await handleFollow(request);
      const target = proxyTarget(url);
      if (target) return await fetch(new Request(target, request), { redirect: 'manual' });
      if (!['GET', 'HEAD'].includes(request.method)) return errorResponse(request, 405, { Allow: 'GET, HEAD' });
      return applyHeaders(await env.ASSETS.fetch(request), url.pathname);
    } catch {
      return errorResponse(request, 500);
    }
  },
};
