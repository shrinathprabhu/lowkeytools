import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { tools, inSection, liveTools, site } from '../tools.mjs';
import { build } from '../scripts/build.mjs';
import { handleFollow } from '../api/follow.js';
import { createHash } from 'node:crypto';
import { owleye, bundlePath, mockAnalytics } from '../lib/analytics.mjs';

await build();
test('required inventory order, URLs and capability boundaries', () => {
  assert.deepEqual(inSection('apps').map(t => t.id), ['superbrain', 'supersplit', 'superfocus', 'streakfreak', 'credo', 'converteasy', 'favigen', 'billgen', 'follow']);
  assert.deepEqual(inSection('games').map(t => t.id), ['mathmagician', 'chesscape', 'spotfast']);
  assert.deepEqual(tools.filter(t => t.pwa).map(t => t.id), ['superbrain', 'supersplit', 'superfocus', 'streakfreak', 'billgen']);
  assert.deepEqual(tools.filter(t => t.badges.includes('Advanced · BYOK')).map(t => t.id), ['fusellm']);
  assert.equal(tools.find(t => t.id === 'billgen').url, 'https://billbook.lowkey.tools/');
  assert.equal(liveTools().length, 12);
});

test('static links, JSON-LD and crawler files stay in sync without browser JS', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const xml = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  const llms = await readFile(new URL('../dist/llms.txt', import.meta.url), 'utf8');
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = graph['@graph'].find(item => item['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, liveTools().length);
  assert.equal(list.itemListElement.length, liveTools().length);
  for (const tool of liveTools()) {
    assert.ok(html.includes(`href="${tool.url}"`), tool.id);
    assert.ok(!xml.includes(`<loc>${tool.url}</loc>`), tool.id);
    assert.ok(llms.includes(`](${tool.url})`), tool.id);
    await access(new URL(`../dist${tool.icon}`, import.meta.url));
  }
  assert.equal((html.match(/data-tool-id=/g) || []).length, tools.length);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [site.url]);
  assert.ok(!xml.includes('/follow'));
  assert.ok(html.includes('<link rel="canonical" href="https://lowkey.tools/">'));
  assert.ok(!html.includes('{{'));
});

test('changing only config order or adding an entry updates static output and discovery', async () => {
  const first = tools.find(t => t.id === 'superbrain');
  const order = first.order;
  try {
    first.order = 50;
    tools.push({ id: 'test-tool', name: 'Test tool', tagline: 'A test tool', url: 'https://example.com/', icon: '/favicon.svg', badges: ['Live'], pwa: false, section: 'apps', order: 10 });
    await build();
    const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
    const xml = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
    assert.ok(html.indexOf('data-tool-id="supersplit"') < html.indexOf('data-tool-id="superbrain"'));
    assert.ok(html.includes('data-tool-id="test-tool"'));
    assert.ok(!xml.includes('<loc>https://example.com/</loc>'));
    const llms = await readFile(new URL('../dist/llms.txt', import.meta.url), 'utf8');
    assert.ok(llms.includes('[Test tool](https://example.com/)'));
  } finally { first.order = order; tools.pop(); await build(); }
});

test('follow logs before a noncacheable, fixed-target 302 without query forwarding', async () => {
  const logs = [];
  const result = await handleFollow(new Request('https://lowkey.tools/follow?next=https://evil.example/&secret=private'), event => logs.push(event));
  assert.deepEqual(logs, [{ event: 'follow_click' }]);
  assert.equal(result.status, 302);
  assert.equal(result.headers.get('location'), site.followUrl);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('set-cookie'), null);
});

test('HEAD, prefetch, DNT and GPC do not inflate follow clicks', async () => {
  for (const options of [{ method: 'HEAD' }, { headers: { purpose: 'prefetch' } }, { headers: { 'sec-purpose': 'prefetch;prerender' } }, { headers: { dnt: '1' } }, { headers: { 'sec-gpc': '1' } }]) {
    const logs = [];
    const result = await handleFollow(new Request('https://lowkey.tools/follow', options), event => logs.push(event));
    assert.equal(result.status, 302);
    assert.deepEqual(logs, []);
  }
});

const validEvent = { event: 'tool_click', tool_id: 'superbrain', section: 'apps', position: 1, visible_position: 1 };
const request = (data, headers = {}) => new Request('https://lowkey.tools/follow', { method: 'POST', headers, body: typeof data === 'string' ? data : JSON.stringify(data) });
test('card clicks/impressions are measurable and extra user content never reaches logs', async () => {
  for (const event of ['tool_click', 'tool_impression']) {
    const logs = [];
    const result = await handleFollow(request({ ...validEvent, event, query: 'private words', email: 'private@example.com' }), entry => logs.push(entry));
    assert.equal(result.status, 204);
    assert.deepEqual(logs, [{ ...validEvent, event }]);
  }
});

test('rejects malformed, oversized, cross-site and invalid-inventory events', async () => {
  const cases = [
    [request('{'), 400], [request('x'.repeat(513)), 413], [request(null), 400],
    [request({ ...validEvent, tool_id: 'unknown' }), 400],
    [request({ ...validEvent, position: 2 }), 400],
    [request({ ...validEvent, visible_position: 0 }), 400],
    [request({ ...validEvent, section: 'games' }), 400],
    [request(validEvent, { origin: 'https://other.example' }), 403],
    [request(validEvent, { 'sec-fetch-site': 'cross-site' }), 403],
  ];
  for (const [input, status] of cases) {
    const logs = [];
    assert.equal((await handleFollow(input, e => logs.push(e))).status, status);
    assert.deepEqual(logs, []);
  }
});

test('privacy opt-outs work for POSTs; unsupported methods are explicit', async () => {
  for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }]) {
    const logs = [];
    assert.equal((await handleFollow(request(validEvent, headers), e => logs.push(e))).status, 204);
    assert.deepEqual(logs, []);
  }
  assert.equal((await handleFollow(new Request('https://lowkey.tools/follow', { method: 'DELETE' }))).status, 405);
});


test('all error pages are static, noindex and share the modern theme', async () => {
  const { statusPages } = await import('../lib/status-pages.mjs');
  for (const code of Object.keys(statusPages)) {
    const html = await readFile(new URL(`../dist/${code}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${code} |`));
    assert.ok(html.includes('content="noindex, follow"'));
    assert.ok(html.includes('href="/"'));
    assert.ok(html.includes('Geist'));
    assert.ok(!html.includes('main.js'));
    assert.ok(!html.includes('Georgia'));
  }
  const result = await handleFollow(new Request('https://lowkey.tools/follow', { method: 'DELETE' }));
  assert.equal(result.status, 405);
  assert.match(result.headers.get('content-type'), /text\/html/);
  assert.ok((await result.text()).includes('Try opening the page instead.'));
});

test('OwlEye bundles are pinned, self-hosted, deferred and loaded before page scripts', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const missing = await readFile(new URL('../dist/404.html', import.meta.url), 'utf8');
  for (const [name, integrity] of Object.entries(owleye.bundles)) {
    const file = await readFile(new URL(`../dist${bundlePath(name)}`, import.meta.url));
    assert.equal(`sha384-${createHash('sha384').update(file).digest('base64')}`, integrity, name);
    const tag = `<script defer src="${bundlePath(name)}" data-owleye-id="${owleye.id}" data-owleye-capture-campaigns="true"></script>`;
    for (const page of [html, missing]) {
      assert.equal(page.split(tag).length, 2, name);
      assert.ok(page.indexOf(tag) < page.indexOf('src="/theme.js"'), name);
    }
  }
  assert.match(owleye.id, /^owl_[a-f0-9]{32}$/);
  assert.ok(!html.includes('cdn.jsdelivr.net'));
  assert.ok(!html.includes('data-owleye-mock'));
  assert.ok(missing.includes("track('status_page_viewed', { status: 404 })"));
  assert.equal((mockAnalytics(html).match(/data-owleye-mock="true"/g) || []).length, 3);
});
