// Run against npm run dev; optional Playwright install supplied by PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_URL || 'http://localhost:4321';
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.metrics = { cls: 0, longTasks: [] };
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) window.metrics.cls += entry.value;
      })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => window.metrics.longTasks.push(entry.duration)))
        .observe({ type: 'longtask', buffered: true });
    });
    // Deliberately separate first paint, enhancement startup and font completion.
    await page.route('**/*.js', async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.continue(); });
    await page.route('**/*.woff2', async route => { await new Promise(resolve => setTimeout(resolve, 1600)); await route.continue(); });
    const widths = [];
    for (const path of ['/', '/404.html', '/500.html']) {
      await page.goto(base + path);
      await page.waitForTimeout(1800);
      const metrics = await page.evaluate(() => ({
        ...window.metrics,
        edges: ['header', 'main', 'footer'].map(selector => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return [rect.x, rect.width];
        }),
        overflow: document.documentElement.scrollWidth > innerWidth,
        blockingScripts: [...document.scripts].filter(s => s.src && !s.defer && !s.async && s.type !== 'module').length,
      }));
      assert.equal(metrics.cls, 0, `${width} ${path}: ${JSON.stringify(metrics)}`);
      assert.deepEqual(metrics.longTasks, [], `${width} ${path}: long task`);
      assert.equal(metrics.overflow, false);
      assert.equal(metrics.blockingScripts, 0);
      assert.deepEqual(metrics.edges[0], metrics.edges[1]);
      assert.deepEqual(metrics.edges[0], metrics.edges[2]);
      widths.push(metrics.edges[0]);
      if (path === '/') {
        await page.locator('#tool-search').fill('no-matching-tool');
        assert.deepEqual(await page.locator('header').evaluate(el => { const r = el.getBoundingClientRect(); return [r.x, r.width]; }), metrics.edges[0]);
      }
      console.log(`${width}px ${path}: CLS 0, no long tasks, aligned containers`);
    }
    assert.deepEqual(widths[0], widths[1]);
    assert.deepEqual(widths[0], widths[2]);
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(base);
  assert.equal(await page.locator('.tool').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.goto(base + '/404.html');
  assert.equal(await page.locator('#game-next').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.close();
} finally { await browser.close(); }
