import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts/modules', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('http://localhost:3000/dashboard');
const integrationMode = await page.evaluate(async () => { const config = await import('/lib/supabase.ts'); return { local: config.isLocalMode, sheets: config.isSheetsSyncEnabled }; });
assert.ok(integrationMode.local && !integrationMode.sheets, 'Mutation tests require an isolated local-mode server with Sheets sync disabled. Cloud records were not modified.');
const errors = []; const violations = []; const checks = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('https://docs.google.com/**', route => route.abort());
const routes = ['issue-entry', 'issue-reports', 'analytics', 'csat-report', 'weekly-report', 'monthly-entry', 'monthly-reports', 'downtime-entry', 'downtime-reports', 'notice-generator', 'sim-finder', 'settings', 'sales/dashboard', 'sales/add', 'sales/report', 'retention/dashboard', 'retention/customers', 'retention/assignment', 'retention/team', 'retention/followup', 'retention/feedback', 'retention/reports', 'admin/login'];
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const route of routes) {
    await page.goto(`http://localhost:3000/${route}`);
    await page.locator('.module-page-heading h1').waitFor();
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.module-page-heading').count(), 1, `Duplicate workbench ${route}`);
    assert.equal(await page.locator('.workbench-outline, .workbench-body, .workbench-hero').count(), 0, 'Module should use the open Overview layout');
    assert.equal(await page.locator('.module-workspace > .workbench-stage').evaluate(el => getComputedStyle(el).padding), '0px');
    assert.equal(await page.locator('.module-workspace').first().evaluate(el => getComputedStyle(el).getPropertyValue('--wb-accent').trim()), '#68cabb');
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    if (dimensions.scroll > width + 2) violations.push({ route, ...dimensions });
    await page.screenshot({ path: `artifacts/modules/${route.replaceAll('/', '-')}-${width}.png` });
    checks.push({ route, width, title: await page.locator('.module-page-heading h1').innerText(), controls: await page.locator('main input, main select, main textarea, main button').count() });
  }
  console.log(`Checked ${routes.length} module pages at ${width}px`);
}
await page.setViewportSize({ width: 1440, height: 1000 });
const drawers = [
  ['retention/dashboard', 'Add customer'],
  ['retention/dashboard', 'Log call'],
  ['retention/team', 'Add Team Member'],
  ['retention/feedback', 'Add Feedback'],
];
for (const [route, button] of drawers) {
  await page.goto(`http://localhost:3000/${route}`);
  await page.getByRole('button', { name: button, exact: true }).first().click();
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  const bounds = await dialog.boundingBox();
  assert.ok(bounds.x >= 775 && bounds.height >= 990, `Drawer position failed ${button}: ${JSON.stringify(bounds)}`);
  await page.screenshot({ path: `artifacts/modules/drawer-${button.replaceAll(' ', '-')}.png` });
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
}
await page.goto('http://localhost:3000/retention/customers');
await page.getByTitle('View Customer 360', { exact: true }).first().click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: 'artifacts/modules/drawer-customer-profile.png' });
await page.getByRole('button', { name: 'Mark as Churned', exact: true }).click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: 'artifacts/modules/drawer-churn.png' });
await page.keyboard.press('Escape');
await page.goto('http://localhost:3000/retention/assignment');
await page.locator('tbody input[type=checkbox]').first().check();
await page.getByRole('button', { name: 'Reassign in Bulk' }).click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: 'artifacts/modules/drawer-bulk-assignment.png' });
await page.keyboard.press('Escape');
// Rebuilt studio: both languages and copy action remain available.
await page.goto('http://localhost:3000/notice-generator');
await page.getByRole('combobox', { name: 'Hour', exact: true }).selectOption('10');
await page.getByLabel('Topic in English').fill('Customer onboarding');
await page.getByRole('button', { name: 'Generate notice' }).click();
await page.getByRole('button', { name: 'English', exact: true }).click();
assert.match(await page.locator('.notice-paper > p').innerText(), /Customer onboarding/);
await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
assert.ok((await page.locator('.notice-paper > p').innerText()).length > 30);
// Rebuilt incident recorder: overnight calculation and actual local save.
await page.goto('http://localhost:3000/downtime-entry');
await page.getByLabel('Service interrupted').fill('23:30');
await page.getByLabel('Service recovered').fill('00:15');
assert.match(await page.locator('.incident-duration > strong').innerText(), /45/);
await page.getByRole('button', { name: 'Log Incident' }).click();
await page.getByText('Downtime entry recorded!').waitFor();
// Preferences navigation: open real editable options.
await page.goto('http://localhost:3000/settings');
await page.getByRole('button', { name: 'Priorities', exact: true }).click();
assert.ok(await page.getByText('High', { exact: true }).first().isVisible());
// The ledger controls now work as independent reading tools.
await page.goto('http://localhost:3000/issue-reports');
await page.getByRole('button', { name: 'Expand table', exact: true }).click();
assert.ok(await page.locator('body > .ledger-portal .ledger-expanded').isVisible());
await page.keyboard.press('Escape');
assert.equal(await page.locator('.ledger-expanded').count(), 0);
const filters = page.locator('.filter-desk-toggle');
assert.equal(await filters.getAttribute('aria-expanded'), 'false');
await filters.click(); assert.equal(await filters.getAttribute('aria-expanded'), 'true');
await filters.click(); assert.equal(await filters.getAttribute('aria-expanded'), 'false');
// Submit an actual order through the new section editor, then edit and export it.
await page.goto('http://localhost:3000/sales/add');
await page.getByPlaceholder('Enter company name', { exact: true }).fill('Module verification company');
await page.getByPlaceholder('e.g. Tanvir Hossain (Admin Manager)').fill('Test contact');
await page.getByPlaceholder('e.g. +880 1711-234567').fill('01700000000');
await page.getByPlaceholder('Enter product name', { exact: true }).fill('Test device');
await page.getByPlaceholder('Price', { exact: true }).fill('1200');
await page.getByPlaceholder('Qty', { exact: true }).fill('2');
await page.getByRole('button', { name: /Save & Record Sale/ }).click();
await page.getByText('Saved on this browser', { exact: true }).waitFor();
await page.goto('http://localhost:3000/sales/report');
await page.getByText('Module verification company', { exact: true }).first().waitFor();
await page.getByTitle('Edit Sale', { exact: true }).first().click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: 'artifacts/modules/drawer-edit-sale.png' });
await page.keyboard.press('Escape');
const download = page.waitForEvent('download');
await page.getByTitle('Download Excel report with all product item details').click();
assert.match((await download).suggestedFilename(), /\.xlsx$/);
// Admin and public feedback are also redesigned, without changing shared module config.
await page.evaluate(() => localStorage.setItem('app_admin_session_v1', JSON.stringify({ isLoggedIn: true, email: 'fapolok7@gmail.com' })));
await page.goto('http://localhost:3000/admin');
await page.getByRole('heading', { name: 'Workspace control.', exact: true }).waitFor();
await page.screenshot({ path: 'artifacts/modules/admin-control.png' });
await page.goto('http://localhost:3000/feedback/not-a-real-record');
await page.locator('.module-page-heading h1').waitFor();
await page.screenshot({ path: 'artifacts/modules/public-feedback.png' });
await page.goto('http://localhost:3000/sales/add');
if (await page.getByRole('button', { name: 'Switch to dark mode' }).count()) await page.getByRole('button', { name: 'Switch to dark mode' }).click();
await page.screenshot({ path: 'artifacts/modules/sales-order-dark.png' });
fs.writeFileSync('artifacts/modules/results.json', JSON.stringify({ checks, drawers: 8, salesSubmission: true, excelExport: true, errors, violations }, null, 2));
await browser.close();
console.log(JSON.stringify({ moduleViews: checks.length, drawers: 8, salesSubmission: true, excelExport: true, errors, violations }, null, 2));
assert.deepEqual(errors, []); assert.deepEqual(violations, []);




