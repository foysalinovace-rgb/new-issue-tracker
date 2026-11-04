import { loadEnv } from 'vite';
const env = loadEnv('development', process.cwd(), '');
const checks = [
  ['database', async () => {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/issues?select=id&limit=1`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` }, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    return { enabled: env.VITE_ENABLE_DATABASE === 'true', status: response.status, connected: response.ok && Array.isArray(body), error: response.ok ? undefined : body.message || body.error };
  }],
  ['sheets_web_app', async () => {
    const response = await fetch(env.GOOGLE_SHEET_WEBAPP_URL, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    const readHandlerUnavailable = /doGet/.test(body);
    return { enabled: env.VITE_ENABLE_GOOGLE_SHEETS_SYNC === 'true', status: response.status, reachable: response.ok, authenticationRequired: new URL(response.url).hostname === 'accounts.google.com', postOnlyEndpoint: readHandlerUnavailable, writesTested: false };
  }],
  ['sim_sheet', async () => {
    const url = 'https://docs.google.com/spreadsheets/d/1-6Xq4TUjJbP1Mfdv8OJmCu8o2DNMRiVY6CqUi3A-_sc/gviz/tq?tqx=out:json&sheet=TFT%20MQTT&tq=select%20A%20limit%201';
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return { status: response.status, reachable: response.ok };
  }],
];
await Promise.all(checks.map(async ([name, run]) => {
  try { console.log(JSON.stringify({ name, ...await run() })); }
  catch (error) { console.log(JSON.stringify({ name, connected: false, error: error.message, cause: error.cause?.code })); process.exitCode = 1; }
}));
