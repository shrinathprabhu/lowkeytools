import assert from 'node:assert/strict';
import { statusPages } from '../lib/status-pages.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_URL || 'http://localhost:4321';
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 667 } });
  for (const [code, content] of Object.entries(statusPages)) {
    const response = await page.request.get(`${base}/${code}.html`);
    assert.equal(response.status(), Number(code));
    assert.equal(response.headers()['cache-control'], 'no-store');
    assert.match(response.headers()['x-robots-tag'], /noindex/);
    assert.ok((await response.text()).includes(content.title));
    const head = await page.request.head(`${base}/${code}.html`);
    assert.equal(head.status(), Number(code));
    assert.equal((await head.body()).length, 0);
  }
  assert.equal((await page.request.get(`${base}/this-page-does-not-exist`)).status(), 404);
  assert.equal((await page.request.get(`${base}/icons/missing.svg`)).status(), 404);
  assert.equal((await page.request.post(base, { data: 'test' })).status(), 405);
  const invalid = await page.request.post(`${base}/follow`, { data: '{' });
  assert.equal(invalid.status(), 400);
  assert.ok((await invalid.text()).includes(statusPages[400].title));
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${base}/missing-page`);
    assert.equal(response.status(), 404);
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      font: getComputedStyle(document.querySelector('h1')).fontFamily,
      fontLoaded: [...document.fonts].some(font => font.family === 'Geist' && font.status === 'loaded'),
      italic: getComputedStyle(document.querySelector('h1')).fontStyle,
    }));
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.fontLoaded, true);
    assert.match(metrics.font, /Geist/);
    assert.equal(metrics.italic, 'normal');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/lowkey-404-${theme}.png`, fullPage: true });
  }
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.getByRole('link', { name: 'Back to the toolbox' }).click();
  assert.equal(new URL(page.url()).pathname, '/');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  assert.equal(await page.locator('#tool-search').evaluate(input => getComputedStyle(input).fontSize), '16px');
  await page.locator('[data-tool-id="spotfast"]').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('[data-tool-id="spotfast"]').evaluate(card => card.getBoundingClientRect().right <= innerWidth));
  await page.close();

  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await fallback.route('**/styles.css', route => route.abort());
  await fallback.route('**/fonts/**', route => route.abort());
  const response = await fallback.goto(`${base}/503.html`);
  assert.equal(response.status(), 503);
  assert.equal(await fallback.getByRole('link', { name: 'Back to the toolbox' }).isVisible(), true);
  assert.equal(await fallback.locator('h1').innerText(), statusPages[503].title);
  await fallback.screenshot({ path: '/tmp/lowkey-503-fallback.png', fullPage: true });
  await fallback.close();
  console.log('11 HTTP error pages, real 404/405/400 responses, HEAD, local Geist, mobile recovery links and asset-failure fallback passed.');
} finally { await browser.close(); }
