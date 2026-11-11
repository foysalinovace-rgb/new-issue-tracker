import { seedAuthSession, fulfillAuthFixture } from './auth-fixture.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts/dark-edit', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ colorScheme: 'light' });
await context.addInitScript(() => localStorage.setItem('theme', 'light'));
await seedAuthSession(context);
const page = await context.newPage();
const errors = []; const writes = []; const results = [];
page.on('pageerror', e => errors.push(e.message));
const day = new Date().toISOString().slice(0, 10);
const issue = { id: '00000000-0000-4000-8000-000000000001', client_name: 'Edit layout verification', issue_type: 'System Bugs', category: 'Software', segment: 'Segment A', clickup_ticket_id: 'LAYOUT-TEST', priority: 'High', status: 'Open', assigned_person: 'Fuad', issue_details: 'Isolated browser fixture. Never submitted to the database.', issue_date: day, created_at: `${day}T09:00:00Z`, updated_at: `${day}T09:00:00Z`, client_reporting_time: '09:00 AM', response_time: '09:15 AM', resolution_time: '', resolution_date: '', issue_resolved_confirmed: 'No Response', customer_satisfaction: '', feedback_rating: undefined, called_by: '' };
const settings = Object.entries({ issue_type: ['System Bugs', 'Device Issues'], issue_category: ['Software', 'Hardware'], segment: ['Segment A'], priority: ['Low', 'Medium', 'High'], status: ['Open', 'Done'], assigned_person: ['Fuad', 'Rahat'] }).flatMap(([category, names]) => names.map((name, i) => ({ id: `${category}-${i}`, name, category })));
await page.route('https://*.supabase.co/**', async route => {
  if (await fulfillAuthFixture(route)) return;
  const request = route.request();
  if (!['GET', 'OPTIONS', 'HEAD'].includes(request.method())) { writes.push(request.method()); return route.abort(); }
  const url = new URL(request.url());
  let body = [];
  if (url.pathname.endsWith('/issues')) body = [issue];
  if (url.pathname.endsWith('/settings')) { const category = url.searchParams.get('category')?.replace(/^eq\./, ''); body = category ? settings.filter(s => s.category === category) : settings; }
  if (url.pathname.endsWith('/branding_settings')) body = null;
  return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await page.route('**/api/google-sheets/append', route => { writes.push('sheets'); return route.abort(); });

for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('http://localhost:3000/dashboard');
  await page.locator('.page-content').waitFor();
  assert.equal(await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches), true);
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true, 'Light device + saved light theme must still start dark');
  const overviewIcons = await page.locator('.metric-grid .stat-icon').evaluateAll(icons => icons.map(el => ({ width: Math.round(el.getBoundingClientRect().width * 100) / 100, height: Math.round(el.getBoundingClientRect().height * 100) / 100, radius: getComputedStyle(el).borderRadius, bg: getComputedStyle(el).backgroundColor, svgSize: el.querySelector('svg')?.getAttribute('width'), color: getComputedStyle(el.querySelector('svg')).color })));
  assert.equal(overviewIcons.length, 6);
  assert.equal(await page.getByText('Keep things moving', { exact: true }).count(), 0);
  assert.equal(await page.locator('.quick-link').count(), 0);
  assert.ok(await page.evaluate(() => {
    const overview = document.querySelector('.overview');
    const recent = Array.from(overview.querySelectorAll('section')).find(el => el.querySelector('h3')?.textContent === 'Recent issues');
    return Math.abs(recent.getBoundingClientRect().width - overview.getBoundingClientRect().width) < 2;
  }));
  await page.screenshot({ path: `artifacts/dark-edit/overview-${width}.png` });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), false);
  await page.reload();
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true, 'Reload must return to dark by default');

  await page.goto('http://localhost:3000/issue-entry');
  await page.locator('.page-content').waitFor();
  const expectedSections = ['Client & Classification', 'Ownership & Status', 'Timing & SLA Metrics', 'Issue Description & Findings'];
  const headings = await page.locator('.issue-entry-sections > .v2-surface .editor-section-intro h2').allTextContents();
  assert.deepEqual(headings.map(text => text.replace(/\s+/g, ' ').trim()), expectedSections);
  const positions = await page.locator('.issue-entry-sections > .v2-surface').evaluateAll(sections => sections.map(el => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom })));
  for (let index = 1; index < positions.length; index++) assert.ok(positions[index].top >= positions[index - 1].bottom, 'Entry sections must follow the same visual and DOM order');
  assert.equal(await page.locator('.module-page-heading .eyebrow').count(), 0);
  assert.ok(await page.getByPlaceholder('e.g. Acme Corporation / Rahim Steel / Star Logistics').isVisible());
  assert.equal(await page.locator('.v2-form textarea').count(), 1);
  await page.screenshot({ path: `artifacts/dark-edit/issue-entry-order-${width}.png`, fullPage: true });

  await page.goto('http://localhost:3000/csat-report');
  await page.locator('.page-content').waitFor();
  assert.equal((await page.locator('.module-page-heading h1').innerText()).trim(), 'CSAT Report.');
  assert.equal(await page.locator('.module-page-heading .eyebrow').count(), 0);
  assert.equal(await page.locator('a.nav-item[href="/csat-report"]').innerText(), 'CSAT Report');

  await page.goto('http://localhost:3000/weekly-report');
  await page.locator('.page-content').waitFor();
  const weeklyIcons = await page.locator('.stat-icon').evaluateAll(icons => icons.map(el => ({ width: Math.round(el.getBoundingClientRect().width * 100) / 100, height: Math.round(el.getBoundingClientRect().height * 100) / 100, radius: getComputedStyle(el).borderRadius, bg: getComputedStyle(el).backgroundColor, svgSize: el.querySelector('svg')?.getAttribute('width'), color: getComputedStyle(el.querySelector('svg')).color })));
  assert.deepEqual(overviewIcons, weeklyIcons, 'Overview icons must match Weekly Report');

  await page.goto('http://localhost:3000/analytics');
  await page.locator('.page-content').waitFor();
  assert.equal(await page.locator('.filter-desk').count(), 0, 'Analytics must retain visible inline filters');
  assert.ok(await page.locator('select').first().isVisible());
  assert.ok(await page.getByPlaceholder('Search person or company...').isVisible());
  await page.getByRole('button', { name: 'Daily', exact: true }).click();
  assert.ok(await page.locator('select').count() >= 4);
  await page.screenshot({ path: `artifacts/dark-edit/analytics-${width}.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));

  await page.goto('http://localhost:3000/issue-reports');
  await page.locator('.page-content').waitFor();
  await page.getByTitle('Edit Issue', { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Edit Issue Ticket', exact: true });
  await dialog.waitFor();
  const timing = page.getByRole('group', { name: 'Timing & SLA Metrics', exact: true });
  const feedback = page.getByRole('group', { name: 'Resolution Confirmation & Customer Feedback', exact: true });
  for (const [name, section] of [['timing', timing], ['feedback', feedback]]) {
    await section.scrollIntoViewIfNeeded();
    const dimensions = await section.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, columns: getComputedStyle(el.querySelector('.v2-grid')).gridTemplateColumns.split(' ').length, fields: Array.from(el.querySelectorAll('input, select')).map(control => ({ width: control.clientWidth, height: control.getBoundingClientRect().height })) }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `${name} overflow: ${JSON.stringify(dimensions)}`);
    assert.equal(dimensions.columns, width === 390 ? 1 : 2);
    assert.ok(dimensions.fields.every(field => field.width >= 200 && field.height >= 42), `${name} has cramped controls`);
    await page.screenshot({ path: `artifacts/dark-edit/edit-${name}-${width}.png` });
  }
  const satisfaction = feedback.locator('select').nth(2);
  await satisfaction.selectOption('Excellent');
  assert.equal(await satisfaction.inputValue(), 'Excellent');
  assert.equal(await satisfaction.evaluate(el => getComputedStyle(el).color), 'rgb(229, 237, 239)');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  results.push({ width, darkOnLightDevice: true, matchingIcons: true, orderedEntrySections: true, noCategoryLabels: true, csatRenamed: true, removedOverviewShortcuts: true, inlineAnalyticsFilters: true, alignedEditFields: true });
}
await browser.close();
fs.writeFileSync('artifacts/dark-edit/results.json', JSON.stringify({ results, errors, writes }, null, 2));
console.log(JSON.stringify({ results, errors, cloudWrites: writes }));
assert.deepEqual(errors, []); assert.deepEqual(writes, []);

