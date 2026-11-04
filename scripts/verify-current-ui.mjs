import { seedAuthSession, fulfillAuthFixture } from './auth-fixture.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts/current-ui', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = []; const writes = []; const checks = [];
page.on('pageerror', error => errors.push(error.message));
// Test layout in isolation. Live connection reads are checked separately;
// automated UI verification never writes or creates a row in cloud services.
await page.route('https://*.supabase.co/**', async route => {
  if (await fulfillAuthFixture(route)) return;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); return route.abort(); }
  return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: route.request().url().includes('branding_settings') ? 'null' : '[]' });
});
await page.route('**/api/google-sheets/append', route => { writes.push('sheets'); return route.abort(); });
for (const [theme, width] of [['light', 1440], ['light', 390], ['dark', 1440], ['dark', 390]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('http://localhost:3000/dashboard');

  await page.reload();
  if (theme === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
  const mode = await page.evaluate(async () => { const config = await import('/lib/supabase.ts'); return { local: config.isLocalMode, sheets: config.isSheetsSyncEnabled }; });
  assert.deepEqual(mode, { local: false, sheets: true });
  assert.equal(await page.locator('.workspace-switch, .workspace-search, .local-pill, .command-dialog').count(), 0);
  assert.ok(await page.locator('.app-topbar .admin-button').isVisible());
  assert.equal(await page.locator('.app-sidebar').evaluate(el => getComputedStyle(el).backgroundColor), theme === 'light' ? 'rgb(238, 240, 255)' : 'rgb(24, 33, 39)');
  assert.ok(await page.getByRole('combobox', { name: 'Filter year', exact: true }).isVisible());
  assert.ok(await page.getByRole('combobox', { name: 'Filter month', exact: true }).isVisible());
  assert.equal(await page.locator('.filter-desk').count(), 0, 'Dashboard filters must stay inline');
  await page.getByRole('combobox', { name: 'Filter month', exact: true }).selectOption('');
  await page.screenshot({ path: `artifacts/current-ui/dashboard-${theme}-${width}.png` });
  await page.goto('http://localhost:3000/issue-reports');
  if (theme === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
  const toggle = page.locator('.filter-desk-toggle');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Other modules keep collapsed filters');
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.ok(await page.getByPlaceholder('Search client, details...').isVisible());
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(layout.scroll <= layout.width + 2, JSON.stringify(layout));
  await page.screenshot({ path: `artifacts/current-ui/issues-${theme}-${width}.png` });
  checks.push({ theme, width, databaseEnabled: !mode.local, sheetsEnabled: mode.sheets });
}
await browser.close();
fs.writeFileSync('artifacts/current-ui/results.json', JSON.stringify({ checks, errors, writes }, null, 2));
console.log(JSON.stringify({ views: checks.length * 2, errors, cloudWrites: writes }));
assert.deepEqual(errors, []); assert.deepEqual(writes, []);

