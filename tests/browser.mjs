// Optional integration check: use an existing Playwright installation; no app dependency.
// Start npm run dev first. PLAYWRIGHT_MODULE can be an absolute path to index.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_URL || 'http://localhost:4321';
const expected = ['superbrain','supersplit','superfocus','streakfreak','credo','converteasy','favigen','billbook','follow'];
let checks = 0;
try {
  for (const [width, height, colorScheme] of [[1440,1000,'light'],[390,844,'light'],[390,844,'dark'],[320,667,'light'],[768,1024,'dark']]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    assert.deepEqual(await page.locator('#app-grid [data-tool-id]').evaluateAll(cards => cards.map(card => card.dataset.toolId)), expected);
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      columns: getComputedStyle(document.querySelector('#app-grid')).gridTemplateColumns.split(' ').length,
      gameColumns: getComputedStyle(document.querySelector('#game-grid')).gridTemplateColumns.split(' ').length,
      gamesY: document.querySelector('.games').getBoundingClientRect().top,
      missingImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).length,
    }));
    assert.equal(geometry.overflow, false);
    assert.equal(geometry.columns, width <= 600 ? 2 : 3);
    assert.equal(geometry.gameColumns, 3);
    assert.equal(geometry.missingImages, 0);
    if (width <= 600) assert.ok(geometry.gamesY < height * 2.2, JSON.stringify(geometry));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/lowkey-${width}-${colorScheme}.png`, fullPage: true });
    await page.close();
    checks++;
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const events = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/follow')) events.push(JSON.parse(request.postData())); });
  await page.goto(base);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  checks++;

  await page.keyboard.press('/');
  assert.equal(await page.locator('#tool-search').evaluate(input => input === document.activeElement), true);
  await page.locator('#tool-search').fill('offline');
  assert.equal(await page.locator('[data-tool-id]:visible').count(), 5);
  await page.keyboard.press('/');
  assert.equal(await page.locator('#tool-search').inputValue(), 'offline/');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-tool-id]:visible').count(), 13);
  await page.locator('#tool-search').fill('mental');
  assert.equal(await page.locator('[data-tool-id]:visible').getAttribute('data-tool-id'), 'mathmagician');
  await page.locator('#tool-search').fill('BYOK');
  assert.equal(await page.locator('[data-tool-id]:visible').getAttribute('data-tool-id'), 'fusellm');
  await page.locator('#tool-search').fill('live');
  assert.equal(await page.locator('[data-tool-id]:visible').count(), 12);
  await page.locator('#tool-search').fill('no tool matches these words');
  assert.equal(await page.locator('#empty-state').isVisible(), true);
  await page.getByRole('button', { name: 'Clear search' }).click();
  assert.equal(await page.locator('[data-tool-id]:visible').count(), 13);
  checks++;

  // Keep this page in place while validating every element inside the same link.
  await page.evaluate(() => document.addEventListener('click', event => {
    if (event.target.closest('[data-tool-id]')) event.preventDefault();
  }, true));
  for (const selector of ['.tool-name', '.tool-desc', '.badge-capability', '.tool-icon']) {
    const received = page.waitForResponse(response => response.url().endsWith('/follow') && response.request().method() === 'POST' && response.request().postDataJSON()?.event === 'tool_click');
    await page.locator(`[data-tool-id="superbrain"] ${selector}`).click();
    const response = await received;
    assert.equal(response.status(), 204);
    assert.deepEqual(response.request().postDataJSON(), { event: 'tool_click', tool_id: 'superbrain', section: 'apps', position: 1, visible_position: 1 });
  }
  await page.locator('#tool-search').fill('SuperFocus');
  const keyClick = page.waitForRequest(req => req.method() === 'POST' && req.postDataJSON()?.event === 'tool_click');
  await page.locator('[data-tool-id="superfocus"]').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual((await keyClick).postDataJSON(), { event: 'tool_click', tool_id: 'superfocus', section: 'apps', position: 3, visible_position: 1 });
  checks++;
  await page.close();

  // A real full-card navigation, without contacting the destination app.
  const navigation = await browser.newPage();
  await navigation.route('https://superbrain.lowkey.tools/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Tool destination</h1>' }));
  await navigation.goto(base);
  await navigation.locator('[data-tool-id="superbrain"] .tool-desc').click();
  await navigation.waitForURL('https://superbrain.lowkey.tools/');
  assert.equal(await navigation.locator('h1').innerText(), 'Tool destination');
  await navigation.close();
  checks++;

  const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await nojs.goto(base);
  assert.equal(await nojs.locator('[data-tool-id]:visible').count(), 13);
  assert.equal(await nojs.locator('#theme-toggle').isVisible(), false);
  assert.equal(await nojs.locator('#search-controls').isVisible(), false);
  await nojs.close();
  checks++;

  const blocked = await browser.newPage({ colorScheme: 'dark' });
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await blocked.goto(base);
  assert.equal(await blocked.locator('html').getAttribute('data-theme'), 'dark');
  await blocked.locator('#theme-toggle').click();
  assert.equal(await blocked.locator('html').getAttribute('data-theme'), 'light');
  await blocked.close();
  checks++;

  const privacy = await browser.newPage();
  await privacy.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
  const privacyPosts = [];
  privacy.on('request', req => { if (req.method() === 'POST') privacyPosts.push(req.url()); });
  await privacy.goto(base);
  await privacy.evaluate(() => document.addEventListener('click', e => e.preventDefault(), true));
  await privacy.locator('[data-tool-id="superbrain"]').click();
  await privacy.locator('[data-tool-id="spotfast"]').scrollIntoViewIfNeeded();
  await privacy.waitForTimeout(150);
  assert.deepEqual(privacyPosts, []);
  await privacy.close();
  checks++;

  const redirect = await browser.newPage();
  const result = await redirect.request.get(`${base}/follow?next=https://example.com`, { maxRedirects: 0 });
  assert.equal(result.status(), 302);
  assert.equal(result.headers().location, 'https://x.com/intent/follow?screen_name=shrinath_prabhu');
  assert.equal(result.headers()['cache-control'], 'no-store');
  await redirect.close();
  checks++;
  console.log(`${checks} browser scenarios passed: responsive layout, themes/storage, search, click payloads/navigation, no-JS, privacy and HTTP redirect.`);
} finally { await browser.close(); }
