import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await context.newPage();
const errors = [];
const remoteDatabaseRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/supabase\.co|script\.google\.com/.test(request.url())) remoteDatabaseRequests.push(request.url()); });
await page.goto('http://localhost:3000/dashboard');
const integrationMode = await page.evaluate(async () => { const config = await import('/lib/supabase.ts'); return { local: config.isLocalMode, sheets: config.isSheetsSyncEnabled }; });
assert.ok(integrationMode.local && !integrationMode.sheets, 'Mutation tests require an isolated local-mode server with Sheets sync disabled. Cloud records were not modified.');
await page.getByRole('heading', { name: 'Workspace overview.' }).waitFor();
await page.screenshot({ path: 'artifacts/desktop-overview.png', fullPage: true });
await page.goto('http://localhost:3000/monthly-entry');
await page.getByRole('heading', { name: 'Monthly Aggregate Entry' }).waitFor();
await page.locator('input[type=number]').first().fill('17');
await page.getByRole('button', { name: 'Save Monthly Summary' }).click();
await page.getByText('Monthly data saved!').waitFor();
await page.reload();
assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('issue_tracker_local_v1_monthly_entries'))[0].total_issues), 17);

await page.goto('http://localhost:3000/issue-entry');
await page.getByPlaceholder('e.g. Acme Corporation / Rahim Steel / Star Logistics').fill('Form verification customer');
await page.locator('select').filter({ has: page.locator('option[value="Help Requests"]') }).selectOption('Help Requests');
await page.locator('select').filter({ has: page.locator('option[value="Software"]') }).selectOption('Software');
await page.locator('textarea').fill('Verify the complete local form submission and report flow.');
await page.getByRole('button', { name: 'Submit Issue Report' }).click();
await page.getByText('Issue ticket saved on this browser and ready in your reports.').waitFor();
await page.goto('http://localhost:3000/issue-reports');
await page.getByText('Form verification customer', { exact: true }).first().waitFor();
await page.reload();
await page.getByText('Form verification customer', { exact: true }).first().waitFor();
await page.evaluate(async () => {
  const { dbService } = await import('/services/dbService.ts');
  const issue = (await dbService.getIssues()).find(i => i.client_name === 'Form verification customer');
  await dbService.deleteIssue(issue.id);
});

// Exercise the real service used by every form, with local persistence and realtime events.
const serviceResult = await page.evaluate(async () => {
  const { dbService } = await import('/services/dbService.ts');
  const { supabase } = await import('/lib/supabase.ts');
  let updates = 0;
  const channel = supabase.channel('test').on('postgres_changes', { table: 'issues' }, () => updates++).subscribe();
  const issue = await dbService.saveIssue({ client_name: 'UI verification customer', issue_type: 'Help Requests', category: 'Software', priority: 'Medium', status: 'Open', assigned_person: 'Fuad', issue_details: 'Local test entry', issue_date: new Date().toISOString().slice(0, 10) });
  await dbService.updateIssue(issue.id, { status: 'Done' });
  const saved = await dbService.getIssueById(issue.id);
  const setting = await dbService.saveSetting({ category: 'segment', name: 'Test segment' });
  await dbService.updateSetting(setting.id, 'Updated segment');
  await dbService.deleteSetting(setting.id);
  const monthly = await dbService.saveMonthlyEntry({ month: '2025-01', total_issues: 10, system_bugs: 3, device_issues: 2, awareness: 2, help_requests: 3 });
  await dbService.updateMonthlyEntry(monthly.id, { total_issues: 11 });
  await dbService.deleteMonthlyEntry(monthly.id);
  const outage = await dbService.saveDowntime({ date: '2025-01-01', system_name: 'HRM', start_time: '10:00', end_time: '10:10', duration_minutes: 10 });
  await dbService.updateDowntime(outage.id, { duration_minutes: 12 });
  await dbService.deleteDowntime(outage.id);
  await dbService.deleteIssues([issue.id]);
  supabase.removeChannel(channel);
  return { status: saved?.status, updates, remaining: (await dbService.getIssues()).length };
});
assert.equal(serviceResult.status, 'Done');
assert.equal(serviceResult.updates, 3);
assert.equal(serviceResult.remaining, 0);

const routes = ['/dashboard', '/issue-entry', '/issue-reports', '/analytics', '/csat-report', '/weekly-report', '/monthly-entry', '/monthly-reports', '/downtime-entry', '/downtime-reports', '/notice-generator', '/sim-finder', '/settings', '/sales/dashboard', '/sales/add', '/sales/report', '/retention/dashboard', '/retention/customers', '/retention/assignment', '/retention/team', '/retention/followup', '/retention/feedback', '/retention/reports', '/admin/login'];
const overflow = [];
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 950 });
  for (const route of routes) {
    await page.goto(`http://localhost:3000${route}`);
    await page.locator('main').waitFor();
    await page.waitForTimeout(180);
    assert.ok((await page.locator('main').innerText()).length > 5, `Empty route ${route}`);
    const sizes = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
    if (sizes.document > sizes.viewport + 2) overflow.push({ route, width, ...sizes });
  }
}
await page.goto('http://localhost:3000/dashboard');
await page.getByRole('button', { name: 'Toggle sidebar' }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: 'artifacts/mobile-navigation.png', fullPage: true });
await page.getByRole('button', { name: 'Close navigation', exact: true }).click({ position: { x: 350, y: 300 } });
await page.waitForTimeout(300);
await page.screenshot({ path: 'artifacts/mobile-overview.png', fullPage: true });
if (await page.getByRole('button', { name: 'Switch to dark mode' }).count()) await page.getByRole('button', { name: 'Switch to dark mode' }).click();
await page.reload();
assert.ok(await page.locator('html').evaluate(el => el.classList.contains('dark')));
await page.setViewportSize({ width: 1440, height: 1050 });
await page.screenshot({ path: 'artifacts/dark-overview.png', fullPage: true });
await browser.close();
fs.writeFileSync('artifacts/verification.json', JSON.stringify({ routes: routes.length, viewports: [1440, 390], serviceResult, errors, remoteDatabaseRequests, overflow }, null, 2));
console.log(JSON.stringify({ routes: routes.length, serviceResult, errors, remoteDatabaseRequests, overflow }, null, 2));
assert.deepEqual(errors, []);
assert.deepEqual(remoteDatabaseRequests, []);
assert.deepEqual(overflow, []);

