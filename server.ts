import { createWorkspaceAuth } from './server/auth';
import express from 'express';
import { createServer as createViteServer, loadEnv } from 'vite';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

const DATA_DIR = path.join(process.cwd(), 'data');
const MODULE_CONFIG_FILE = path.join(DATA_DIR, 'module-config.json');

const DEFAULT_SERVER_MODULE_CONFIG = {
  Dashboard: true,
  Sales: true,
  Retention: true,
  IssueEntry: true,
  IssueReports: true,
  CSATReport: true,
  Analytics: true,
  WeeklyReport: true,
  MonthlyEntry: true,
  MonthlyReports: true,
  DowntimeEntry: true,
  DowntimeReports: true,
  NoticeGenerator: true,
  SimFinder: true,
  Settings: true,
};

function readModuleConfigFromFile() {
  try {
    if (fs.existsSync(MODULE_CONFIG_FILE)) {
      const raw = fs.readFileSync(MODULE_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_SERVER_MODULE_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error reading module config from file:', err);
  }
  return { ...DEFAULT_SERVER_MODULE_CONFIG };
}

function writeModuleConfigToFile(config: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MODULE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing module config to file:', err);
  }
}

async function startServer() {
  const app = express();
  
  let PORT = 3000;
  if (process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10);
  } else {
    const portArgIndex = process.argv.indexOf('--port');
    if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
      PORT = parseInt(process.argv[portArgIndex + 1], 10);
    }
  }

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  const auth = createWorkspaceAuth({
    sessionFile: path.join(DATA_DIR, 'auth-sessions.json'),
    secureCookies: env.AUTH_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && env.AUTH_COOKIE_SECURE !== 'false'),
    origin: env.APP_ORIGIN || undefined,
  });
  app.use('/api/auth', auth.router);
  // Server code, session storage and private setup/test files are never public.
  app.use((req, res, next) => {
    let requestPath: string;
    try { requestPath = decodeURIComponent(req.path).replaceAll('\\', '/').toLowerCase(); }
    catch { res.sendStatus(400); return; }
    if (/\/(supabase|scripts|data|server)(\/|$)|\/server\.ts$/.test(requestPath)) { res.sendStatus(404); return; }
    next();
  });

  // Global Module Configuration API (Synchronized across all browsers and devices)
  app.get('/api/admin/module-config', (req, res) => {
    try {
      const config = readModuleConfigFromFile();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).json({ success: true, config });
    } catch (error: any) {
      console.error('Error fetching module config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/module-config', auth.requireSession, auth.sameOrigin, (req, res) => {
    try {
      const updatedConfig = { ...DEFAULT_SERVER_MODULE_CONFIG, ...(req.body?.config || req.body) };
      writeModuleConfigToFile(updatedConfig);
      res.status(200).json({ success: true, config: updatedConfig });
    } catch (error: any) {
      console.error('Error saving module config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google Sheets API Endpoint to append issue
  app.post('/api/google-sheets/append', auth.requireSession, auth.sameOrigin, async (req, res) => {
    try {
      // UPDATE THIS URL AFTER NEW DEPLOYMENT (OR USE ENV VAR)
      const webappUrl = env.GOOGLE_SHEET_WEBAPP_URL;
      if (env.VITE_ENABLE_GOOGLE_SHEETS_SYNC !== 'true' || !webappUrl) { res.status(503).json({ success: false, disabled: true, message: 'Google Sheets sync is not configured.' }); return; }
      
      const response = await fetch(webappUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
      const result = await response.json();
      if (result.success === false || result.status === 'error') throw new Error(result.error || result.message || 'Google Sheets could not save this entry.');
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Google Sheets Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to sync with Google Sheets' 
      });
    }
  });

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API endpoint not found.' }); });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/supabase/**', '**/scripts/**', '**/data/**', '**/server/**', '**/server.ts'] }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

