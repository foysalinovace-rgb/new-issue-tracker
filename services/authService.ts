export interface WorkspaceUser {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin';
  is_active: boolean;
  created_at: string;
}

let currentUser: WorkspaceUser | null = null;
const TOKEN_KEY = 'workspace_admin_token_v1';

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch { /* Storage might be unavailable */ }
}

async function request(path: string, body?: Record<string, unknown>) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let result: any = null;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(response.ok ? 'Server returned invalid response.' : 'Server connection failed. Please try again.');
  }

  if (!response.ok) {
    throw new Error(result?.error || 'Could not verify your session.');
  }
  return result;
}

function announce() {
  window.dispatchEvent(new Event('workspace-auth-changed'));
  try {
    localStorage.setItem('workspace-auth-event', `${Date.now()}-${Math.random()}`);
  } catch { /* Storage unavailable */ }
}

export const authService = {
  getCurrentUser: () => currentUser,
  setCurrentUser(user: WorkspaceUser | null) {
    currentUser = user;
    window.dispatchEvent(new CustomEvent('admin-auth-changed'));
  },
  async getSession(): Promise<WorkspaceUser | null> {
    try {
      const res = await request('session');
      if (res?.token) {
        setToken(res.token);
      }
      return res?.user || null;
    } catch {
      // If no valid session exists or backend restarted, treat as signed out
      return null;
    }
  },
  async signIn(email: string, password: string): Promise<WorkspaceUser> {
    const result = await request('login', { email: email.trim().toLowerCase(), password });
    if (result.token) {
      setToken(result.token);
    }
    this.setCurrentUser(result.user);
    announce();
    return result.user;
  },
  async signOut() {
    try {
      await request('logout', {});
    } catch { /* Continue clearing local state */ }
    setToken(null);
    this.setCurrentUser(null);
    try { localStorage.removeItem('app_admin_session_v1'); } catch {}
    announce();
  },
  async headers(): Promise<Record<string, string>> {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}`, 'x-session-token': token } : {};
  },
};
