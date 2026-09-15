import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { proxyTarget } from '../worker/index.js';
import { liveTools } from '../tools.mjs';

test('www redirects every path permanently before touching assets or follow', async () => {
  for (const path of ['/', '/styles.css', '/follow?from=teaser', '/superbrain/note%20name?x=1&y=2', '/missing']) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const response = await worker.fetch(new Request(`https://www.lowkey.tools${path}`, { method }), { ASSETS: { fetch() { throw Error('Assets must not run on www'); } } });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), `https://lowkey.tools${path}`);
    }
  }
});

test('root domain serves assets, preserves headers and returns real 404s', async () => {
  const home = await worker.fetch(new Request('https://lowkey.tools/'), { ASSETS: { fetch: async () => new Response('homepage') } });
  assert.equal(home.status, 200);
  assert.equal(await home.text(), 'homepage');
  assert.equal(home.headers.get('X-Content-Type-Options'), 'nosniff');
  const missing = await worker.fetch(new Request('https://lowkey.tools/missing'), { ASSETS: { fetch: async () => new Response('404 page', { status: 404 }) } });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('Cache-Control'), 'no-store');
});

test('unknown wildcard hosts return a real 404 with recovery links to the root', async () => {
  for (const path of ['/', '/follow', '/anything?target=https://example.com']) {
    const response = await worker.fetch(new Request(`https://unknown.lowkey.tools${path}`), {});
    assert.equal(response.status, 404);
    const html = await response.text();
    assert.ok(html.includes('<base href="https://lowkey.tools/">'));
    assert.ok(!html.includes('target='));
  }
  const head = await worker.fetch(new Request('https://unknown.lowkey.tools/', { method: 'HEAD' }), {});
  assert.equal(head.status, 404);
  assert.equal(await head.text(), '');
});

test('all live tool subdomains pass through to their existing origins', async (context) => {
  const calls = [];
  context.mock.method(globalThis, 'fetch', async request => { calls.push(request.url); return new Response('existing tool'); });
  for (const tool of liveTools()) {
    const url = new URL('/existing/path?x=1', tool.url).href;
    const response = await worker.fetch(new Request(url), {});
    assert.equal(await response.text(), 'existing tool');
    assert.equal(calls.at(-1), url);
  }
});

test('follow still redirects on root and invalid methods use error HTML', async () => {
  const follow = await worker.fetch(new Request('https://lowkey.tools/follow', { headers: { dnt: '1' } }), {});
  assert.equal(follow.status, 302);
  assert.equal(follow.headers.get('location'), 'https://x.com/intent/follow?screen_name=shrinath_prabhu');
  const method = await worker.fetch(new Request('https://lowkey.tools/', { method: 'POST' }), {});
  assert.equal(method.status, 405);
  const failure = await worker.fetch(new Request('https://lowkey.tools/'), { ASSETS: { fetch() { throw Error('Unavailable'); } } });
  assert.equal(failure.status, 500);
});

test('legacy proxy targets retain their existing domain/path/query mappings', () => {
  for (const name of ['superbrain', 'supersplit', 'favigen', 'credo', 'billbook', 'spotfast']) {
    assert.equal(proxyTarget(new URL(`https://lowkey.tools/${name}`)).href, `https://${name}.lowkey.tools/`);
    assert.equal(proxyTarget(new URL(`https://lowkey.tools/${name}/`)).href, `https://${name}.lowkey.tools/`);
    assert.equal(proxyTarget(new URL(`https://lowkey.tools/${name}/nested/file?x=1`)).href, `https://${name}.lowkey.tools/nested/file?x=1`);
  }
  assert.equal(proxyTarget(new URL('https://lowkey.tools/superbrain-imposter')), null);
});
