import { handleFollow } from '../api/follow.js';
import { renderStatus } from '../lib/status-pages.mjs';
import { tools } from '../tools.mjs';
import hosting from '../vercel.json' with { type: 'json' };

const policy = hosting.headers.map(rule => ({
  match: new RegExp(`^${rule.source.replaceAll('.', '\\.').replaceAll(':path*', '.*')}$`),
  headers: rule.headers,
}));
const toolHosts = new Set(tools.filter(tool => tool.url.startsWith('https://')).map(tool => new URL(tool.url).hostname).filter(host => host.endsWith('.lowkey.tools')));

// Reuse the existing path proxies on the Cloudflare target as well.
export function proxyTarget(url) {
  let path = url.pathname;
  for (let hop = 0; hop < 3; hop++) {
    let destination;
    for (const rule of hosting.rewrites) {
      if (rule.source.endsWith('/:path*')) {
        const prefix = rule.source.slice(0, -6);
        if (path.startsWith(prefix)) {
          destination = rule.destination.replace(':path*', path.slice(prefix.length));
          break;
        }
      } else if (rule.source === path) {
        destination = rule.destination;
        break;
      }
    }
    if (!destination) return null;
    if (destination.startsWith('https://')) {
      const target = new URL(destination);
      target.search = url.search;
      return target;
    }
    path = destination;
  }
  return null;
}

function applyHeaders(response, pathname) {
  const result = new Response(response.body, response);
  for (const rule of policy) {
    if (rule.match.test(pathname)) {
      for (const { key, value } of rule.headers) result.headers.set(key, value);
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
