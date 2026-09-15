import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_URL || 'http://localhost:4321';
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: width === 768 ? 'dark' : 'light' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal((await page.goto(base + '/404.html')).status(), 404);
    assert.equal(await page.locator('#game-next').isDisabled(), true);
    for (let round = 1; round <= 5; round++) {
      const [a, op, b] = (await page.locator('#game-question').textContent()).split(' ');
      const correct = op === '+' ? +a + +b : op === '−' ? +a - +b : +a * +b;
      const choices = await page.locator('.game-answers button').allTextContents();
      assert.equal(new Set(choices).size, 3);
      const answer = page.locator('.game-answers').getByRole('button', { name: String(correct), exact: true });
      await answer.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter'); // Cannot score the same question twice.
      assert.equal(await page.locator('#game-progress').textContent(), `Question ${round} of 5 · Score ${round}`);
      if (round < 5) { await page.locator('#game-next').click(); assert.equal(await page.locator('.game-answers button').first().evaluate(el => el === document.activeElement), true); }
    }
    assert.match(await page.locator('#game-feedback').textContent(), /5 out of 5/);
    await page.getByRole('button', { name: 'Play again' }).click();
    assert.equal(await page.locator('#game-progress').textContent(), 'Question 1 of 5 · Score 0');
    const [a, op, b] = (await page.locator('#game-question').textContent()).split(' ');
    const correct = op === '+' ? +a + +b : op === '−' ? +a - +b : +a * +b;
    const wrong = page.locator('.game-answers button').filter({ hasText: new RegExp('^(?!' + correct + '$)') }).first();
    await wrong.click();
    assert.match(await page.locator('#game-feedback').textContent(), new RegExp(`answer is ${correct}`));
    assert.match(await page.locator('#game-progress').textContent(), /Score 0/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/lowkey-game-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Back to the toolbox' }).click();
    assert.equal(new URL(page.url()).pathname, '/');
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/*.css', route => route.abort());
  await page.route('**/*.js', route => route.abort());
  await page.route('**/*.woff2', route => route.abort());
  await page.goto(base + '/404.html');
  await page.locator('.game-answers').getByRole('button', { name: '12', exact: true }).click();
  assert.match(await page.locator('#game-progress').textContent(), /Score 1/);
  await page.close();
  console.log('404 game: keyboard, scoring, duplicate-answer guard, replay, wrong answers, responsive layout, recovery links and asset-failure play passed.');
} finally { await browser.close(); }
