// UI-only fixture. Real session authorization is covered by verify-server-auth.
export const fixtureUser = { id: 'fixed-workspace-admin', full_name: 'Fixture Admin', email: 'fixture-admin@example.test', role: 'super_admin', is_active: true, created_at: '2026-11-05T00:00:00Z' };
export async function seedAuthSession(context) {
  await context.route('**/api/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: fixtureUser }) }));
}
export async function fulfillAuthFixture(route) {
  if (!new URL(route.request().url()).pathname.endsWith('/rpc/get_public_branding')) return false;
  await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  return true;
}
