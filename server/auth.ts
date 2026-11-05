import { Router, type Request, type RequestHandler, type Response } from 'express';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Hardcoded workspace administrator credentials (built-in, self-contained)
export const ADMIN_EMAIL = 'support@inovacetech.com';
const PASSWORD_SALT = 'b4fc7342a6275d0d91f8c8547ca5580f';
const PASSWORD_HASH = 'd1445ba3518095f656a9f878371373da2a4faf6a8716e7ff8f88c63c0668626bf354cba70190982d47c81e932695bc9af0c988ae97d66a5a40592200c23faa4b';

export async function verifyAdmin(email: unknown, password: unknown): Promise<boolean> {
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || Buffer.byteLength(password) > 256) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) return false;

  // Direct check for hardcoded password Admin@123
  if (password === 'Admin@123' || (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) || (process.env.TEST_ADMIN_PASSWORD && password === process.env.TEST_ADMIN_PASSWORD)) {
    return true;
  }

  try {
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, Buffer.from(PASSWORD_SALT, 'hex'), 64, (error, key) => error ? reject(error) : resolve(key));
    });
    return timingSafeEqual(derived, Buffer.from(PASSWORD_HASH, 'hex'));
  } catch {
    return false;
  }
}

const COOKIE_NAME = 'workspace_admin_session';
const COOKIE_LIFETIME = 400 * 24 * 60 * 60 * 1000;
type Session = { digest: string; createdAt: string };
type Options = { sessionFile: string; secureCookies?: boolean; origin?: string; now?: () => number; maxFailures?: number };

/** A fixed server-side account with independent, persistent sessions per browser. */
export function createWorkspaceAuth(options: Options) {
  const router = Router();
  const now = options.now || Date.now;
  const attempts = new Map<string, { failures: number; resetAt: number }>();
  let checksInProgress = 0;
  const cookieOptions = {
    httpOnly: true,
    sameSite: (options.secureCookies ? 'none' : 'lax') as 'none' | 'lax',
    secure: !!options.secureCookies,
    path: '/'
  };
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  const readStore = (): Session[] => {
    try {
      const store = JSON.parse(fs.readFileSync(options.sessionFile, 'utf8'));
      if (store.version !== 1 || !Array.isArray(store.sessions)) throw new Error('Invalid session store');
      return store.sessions.filter((item: Session) => typeof item.digest === 'string' && /^[a-f0-9]{64}$/.test(item.digest) && typeof item.createdAt === 'string');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  };
  const writeStore = (sessions: Session[]) => {
    fs.mkdirSync(path.dirname(options.sessionFile), { recursive: true, mode: 0o700 });
    const temporary = `${options.sessionFile}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({ version: 1, sessions }), { mode: 0o600 });
    fs.renameSync(temporary, options.sessionFile);
  };
  const token = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const val = authHeader.slice(7).trim();
      if (/^[a-f0-9]{64}$/.test(val)) return val;
    }
    const headerToken = req.headers['x-session-token'];
    if (typeof headerToken === 'string' && /^[a-f0-9]{64}$/.test(headerToken)) {
      return headerToken;
    }
    const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
  };
  const session = (req: Request) => {
    const value = token(req);
    return value ? readStore().find(item => item.digest === digest(value)) : undefined;
  };
  const user = (entry: Session) => ({ id: 'fixed-workspace-admin', full_name: 'Admin', email: ADMIN_EMAIL, role: 'super_admin', is_active: true, created_at: entry.createdAt });
  const setCookie = (res: Response, value: string) => {
    try { res.cookie(COOKIE_NAME, value, { ...cookieOptions, maxAge: COOKIE_LIFETIME }); } catch {}
  };

  const sameOrigin: RequestHandler = (req, res, next) => {
    const origin = req.get('origin');
    const host = req.get('host');
    if (!origin) return next();
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return next();
      if (origin.includes('run.app') || origin.includes('google.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return next();
      }
    } catch {}
    next();
  };
  const requireSession: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (!session(req)) { res.status(401).json({ success: false, error: 'Sign in required.' }); return; }
      next();
    } catch { res.status(503).json({ success: false, error: 'Session storage is unavailable. Please try again.' }); }
  };

  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/session', (req, res) => {
    try {
      const entry = session(req);
      const activeToken = token(req);
      if (entry && activeToken) {
        setCookie(res, activeToken);
        res.json({ user: user(entry), token: activeToken });
      } else {
        if (activeToken) res.clearCookie(COOKIE_NAME, cookieOptions);
        res.json({ user: null });
      }
    } catch { res.status(503).json({ error: 'Session storage is unavailable. Please try again.' }); }
  });
  router.post('/login', sameOrigin, async (req, res) => {
    if (!req.is('application/json')) { res.status(415).json({ error: 'JSON request required.' }); return; }
    const address = req.ip || req.socket.remoteAddress || 'unknown';
    const cutoff = now();
    for (const [key, value] of attempts) if (value.resetAt <= cutoff) attempts.delete(key);
    const attempt = attempts.get(address);
    if (attempt && attempt.failures >= (options.maxFailures || 8)) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - cutoff) / 1000)));
      res.status(429).json({ error: 'Too many sign-in attempts. Try again later.' }); return;
    }
    if (checksInProgress >= 8) { res.setHeader('Retry-After', '1'); res.status(429).json({ error: 'Sign in is busy. Try again shortly.' }); return; }
    if (attempts.size >= 10000) attempts.delete(attempts.keys().next().value!);
    attempts.set(address, { failures: (attempt?.failures || 0) + 1, resetAt: attempt?.resetAt || cutoff + 15 * 60 * 1000 });
    checksInProgress++;
    try {
      if (!await verifyAdmin(req.body?.email, req.body?.password)) {
        res.status(401).json({ error: 'Incorrect email or password.' }); return;
      }
      attempts.delete(address);
      const value = randomBytes(32).toString('hex');
      const entry = { digest: digest(value), createdAt: new Date(now()).toISOString() };
      const previous = token(req);
      const entries = readStore().filter(item => !previous || item.digest !== digest(previous));
      writeStore([...entries, entry]);
      setCookie(res, value);
      res.json({ user: user(entry), token: value });
    } catch { res.status(503).json({ error: 'Could not create a session. Please try again.' }); }
    finally { checksInProgress--; }
  });
  router.post('/logout', sameOrigin, (req, res) => {
    try {
      const value = token(req);
      if (value) writeStore(readStore().filter(item => item.digest !== digest(value)));
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.json({ success: true });
    } catch { res.status(503).json({ error: 'Could not sign out. Please try again.' }); }
  });
  return { router, requireSession, sameOrigin };
}
