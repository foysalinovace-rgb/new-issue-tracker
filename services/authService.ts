export interface WorkspaceUser {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin';
  is_active: boolean;
  created_at: string;
}

let currentUser: WorkspaceUser | null = null;
async function request(path: string, body?: Record<string, unknown>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not verify your session.');
  return result;
}
function announce() {
  window.dispatchEvent(new Event('workspace-auth-changed'));
  try { localStorage.setItem('workspace-auth-event', `${Date.now()}-${Math.random()}`); } catch { /* Cookies manage the session. */ }
}
export const authService = {
  getCurrentUser: () => currentUser,
  setCurrentUser(user: WorkspaceUser | null) {
    currentUser = user;
    window.dispatchEvent(new CustomEvent('admin-auth-changed'));
  },
  async getSession(): Promise<WorkspaceUser | null> { return (await request('session')).user; },
  async signIn(email: string, password: string): Promise<WorkspaceUser> {
    const result = await request('login', { email: email.trim().toLowerCase(), password });
    this.setCurrentUser(result.user); announce();
    return result.user;
  },
  async signOut() {
    await request('logout', {});
    this.setCurrentUser(null);
    try { localStorage.removeItem('app_admin_session_v1'); } catch { /* No auth tokens are stored here. */ }
    announce();
  },
  // Same-origin API calls send the HttpOnly session cookie automatically.
  async headers(): Promise<Record<string, string>> { return {}; },
};
