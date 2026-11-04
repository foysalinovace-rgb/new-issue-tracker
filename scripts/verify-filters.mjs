import { seedAuthSession, fulfillAuthFixture } from './auth-fixture.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts/filters', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
await seedAuthSession(context);
const page = await context.newPage();
await page.route('https://*.supabase.co/**', async route => {
  if (await fulfillAuthFixture(route)) return;
  if (!['GET','HEAD','OPTIONS'].includes(route.request().method())) return route.abort();
  const path = new URL(route.request().url()).pathname;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/settings') ? [{id:'fixture-setting',category:'priority',name:'High',created_at:new Date().toISOString()}] : [])});
});
const errors = []; const checks = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('https://docs.google.com/**', route => route.abort());
await page.goto('http://localhost:3000');
const routes = ['issue-reports', 'csat-report', 'weekly-report', 'monthly-reports', 'downtime-reports', 'sales/dashboard', 'sales/report', 'retention/customers', 'retention/assignment', 'retention/followup', 'retention/feedback', 'sim-finder', 'admin'];
for (const [theme, width] of [['light', 1440], ['light', 390], ['dark', 1440]]) {
  await page.setViewportSize({ width, height: 1000 });

  for (const route of routes) {
    await page.goto(`http://localhost:3000/${route}`);
    await page.locator('main').waitFor();
    if (theme === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
    const panels = page.locator('.filter-desk');
    assert.ok(await panels.count(), `${route} has no collapsible filters`);
    assert.equal(await page.locator('.filter-desk-toggle[aria-expanded=true]').count(), 0, `${route} filters must start closed`);
    assert.equal(await page.locator('.filter-desk-content table, .filter-desk-content .data-ledger').count(), 0, `${route} hides records with the filters`);
    assert.equal(await page.locator('aside .sidebar-bottom, aside .local-card, aside .profile-link, aside a[href^="/admin"]').count(), 0);
    assert.ok(await page.locator('.app-topbar .admin-button').isVisible());
    const sidebar = await page.locator('.app-sidebar').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(sidebar, theme === 'light' ? 'rgb(238, 240, 255)' : 'rgb(24, 33, 39)');
    if (theme === 'light' && width === 1440 && ['issue-reports', 'sales/report', 'retention/feedback'].includes(route)) await page.screenshot({ path: `artifacts/filters/${route.replaceAll('/', '-')}-closed.png` });
    for (const toggle of await page.locator('.filter-desk-toggle').all()) {
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator(`#${(await toggle.getAttribute('aria-controls')).replaceAll(':', '\\:')}`).isVisible());
    }
    await page.waitForTimeout(100);
    const measurements = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(measurements.scrollWidth <= width + 2, `${route}/${theme}/${width} overflow: ${JSON.stringify(measurements)}`);
    if (theme === 'dark') {
      const colors = await page.locator('select').evaluateAll(selects => selects.map(select => ({ select: getComputedStyle(select).backgroundColor, text: getComputedStyle(select).color, options: Array.from(select.options).slice(0, 3).map(option => ({ bg: getComputedStyle(option).backgroundColor, text: getComputedStyle(option).color, selected: option.selected })) })));
      for (const control of colors) {
        assert.equal(control.select, 'rgb(29, 41, 47)', `${route} dropdown surface`);
        assert.equal(control.text, 'rgb(229, 237, 239)', `${route} dropdown text`);
        for (const option of control.options) {
          assert.equal(option.bg, option.selected ? 'rgb(28, 57, 52)' : 'rgb(24, 33, 39)', `${route} option surface`);
          assert.equal(option.text, option.selected ? 'rgb(184, 233, 223)' : 'rgb(229, 237, 239)', `${route} option text`);
        }
      }
    }
    await page.screenshot({ path: `artifacts/filters/${route.replaceAll('/', '-')}-${theme}-${width}.png`, fullPage: false });
    for (const toggle of await page.locator('.filter-desk-toggle').all()) {
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    }
    checks.push({ route, theme, width, panels: await panels.count() });
  }
  console.log(`Verified ${routes.length} filter pages: ${theme}, ${width}px`);
}
// Collapsed filters still apply the selected value and keep actions accessible.
await page.goto('http://localhost:3000/issue-reports');
assert.ok(await page.getByTitle('Export Excel', { exact: true }).isVisible());
await page.locator('.filter-desk-toggle').click();
await page.getByPlaceholder('Search client, details...').fill('A filtered company');
await page.locator('.filter-desk-toggle').click();
assert.equal(await page.getByPlaceholder('Search client, details...').inputValue(), 'A filtered company');
await page.reload();
assert.equal(await page.locator('.filter-desk-toggle').getAttribute('aria-expanded'), 'false');
await page.goto('http://localhost:3000/retention/feedback');
assert.ok(await page.getByRole('button', { name: 'Add Feedback', exact: true }).isVisible());
fs.writeFileSync('artifacts/filters/results.json', JSON.stringify({ checks, errors }, null, 2));
await browser.close();
console.log(JSON.stringify({ views: checks.length, errors }));
assert.deepEqual(errors, []);

