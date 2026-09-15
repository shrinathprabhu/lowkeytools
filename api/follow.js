import { site, inSection } from '../tools.mjs';
import { renderStatus } from '../lib/status-pages.mjs';

const positions = new Map(['featured', 'apps', 'games'].flatMap(section => inSection(section).map((tool, index) => [tool.id, { section, position: index + 1, count: inSection(section).length }])));
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const response = (status, extra = {}) => new Response(status >= 400 ? renderStatus(status) : null, { status, headers: { ...headers, ...(status >= 400 ? { 'Content-Type': 'text/html; charset=utf-8' } : {}), ...extra } });

// Logs contain only an event name and validated inventory fields. No application
// database, user identifiers, cookies, request headers, IPs or search terms.
export function handleFollow(request, log = event => console.info(JSON.stringify(event))) {
  const optedOut = request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1';
  if (request.method === 'GET' || request.method === 'HEAD') {
    const prefetch = /prefetch|prerender/i.test(`${request.headers.get('purpose') || ''} ${request.headers.get('sec-purpose') || ''}`);
    if (request.method === 'GET' && !prefetch && !optedOut) {
      try { log({ event: 'follow_click' }); } catch { /* Following still works if the log sink fails. */ }
    }
    return response(302, { Location: site.followUrl });
  }
  if (request.method !== 'POST') return response(405, { Allow: 'GET, HEAD, POST' });
  return collect(request, log, optedOut);
}

async function collect(request, log, optedOut) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return response(403);
  if (optedOut) return response(204);
  // Bound the body even when Content-Length is omitted or dishonest.
  const reader = request.body?.getReader();
  if (!reader) return response(400);
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 512) { await reader.cancel(); return response(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const expected = positions.get(payload?.tool_id);
    if (!expected || !['tool_click', 'tool_impression'].includes(payload.event) || payload.section !== expected.section || payload.position !== expected.position || !Number.isInteger(payload.visible_position) || payload.visible_position < 1 || payload.visible_position > expected.count) return response(400);
    log({ event: payload.event, tool_id: payload.tool_id, section: expected.section, position: expected.position, visible_position: payload.visible_position });
    return response(204);
  } catch { return response(400); }
}

export default { fetch: request => handleFollow(request) };
