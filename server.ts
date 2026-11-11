import { createWorkspaceAuth } from './server/auth';
import express from 'express';
import { createServer as createViteServer, loadEnv } from 'vite';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

if (!process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('your_supabase_project_url')) {
  process.env.VITE_SUPABASE_URL = 'https://pzjkgoebjttuxoiopcqu.supabase.co';
}
if (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY.includes('your_supabase_anon_key')) {
  process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amtnb2VianR0dXhvaW9wY3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODY2NDYsImV4cCI6MjA5MTA2MjY0Nn0.284IbEwcWqPp73D3R6B_aVf5ezf26lkPVe3KqrHfjcw';
}
process.env.VITE_ENABLE_DATABASE = 'true';

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
  ReviewTracker: true,
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
  app.set('trust proxy', 1);
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

  const REVIEWS_FILE = path.join(DATA_DIR, 'google-maps-reviews.json');

  function readReviewsData() {
    try {
      if (fs.existsSync(REVIEWS_FILE)) {
        return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed reading reviews file:', e);
    }
    return {
      place: {
        id: 'ChIJMWfQRJWHEAYRLCYbtfI0ZU4',
        name: 'Tipsoi',
        category: 'Software company',
        address: 'Nad Al Sheba, Meydan Grandstand, Dubai, United Arab Emirates',
        location: { latitude: 25.1105788, longitude: 55.317707 },
        rating: 4.7,
        userRatingCount: 3,
        websiteUri: 'https://tipsoi.ai',
        nationalPhoneNumber: '+971 54 567 9417',
        googleMapsUri: 'https://www.google.com/maps/place//@25.1105788,55.317707,8z/data=!3m1!4b1!4m3!3m2!1s0x610879544d06731:0x4e6534f2b51b262c!12e1',
        writeReviewUri: 'https://search.google.com/local/writereview?placeid=ChIJMWfQRJWHEAYRLCYbtfI0ZU4',
        lastSyncedAt: new Date().toISOString(),
      },
      reviews: []
    };
  }

  function writeReviewsData(data: any) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed writing reviews file:', e);
    }
  }

  // Google Maps Reviews - Fetch & Track
  app.get('/api/google-maps/reviews', async (req, res) => {
    try {
      const data = readReviewsData();
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      const placeId = (req.query.placeId as string) || data.place?.id || 'ChIJMWfQRJWHEAYRLCYbtfI0ZU4';

      if (req.query.refresh === 'true' && apiKey) {
        try {
          const gmpUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
          const response = await fetch(gmpUrl, {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews,googleMapsLinks,googleMapsUri,formattedAddress',
              'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const apiResult = await response.json();
            if (apiResult.displayName?.text) data.place.name = apiResult.displayName.text;
            if (typeof apiResult.rating === 'number') data.place.rating = apiResult.rating;
            if (typeof apiResult.userRatingCount === 'number') data.place.userRatingCount = apiResult.userRatingCount;
            if (apiResult.formattedAddress) data.place.address = apiResult.formattedAddress;
            if (apiResult.googleMapsUri) data.place.googleMapsUri = apiResult.googleMapsUri;
            if (apiResult.googleMapsLinks?.writeAReviewUri) data.place.writeReviewUri = apiResult.googleMapsLinks.writeAReviewUri;

            if (Array.isArray(apiResult.reviews) && apiResult.reviews.length > 0) {
              const existingIds = new Set(data.reviews.map((r: any) => r.id));
              for (const r of apiResult.reviews) {
                const rid = r.name?.split('/').pop() || `gmp-${Date.now()}`;
                if (!existingIds.has(rid)) {
                  data.reviews.unshift({
                    id: rid,
                    authorName: r.authorAttribution?.displayName || 'Anonymous Google User',
                    authorPhotoUrl: r.authorAttribution?.photoURI || null,
                    authorUri: r.authorAttribution?.uri || null,
                    rating: r.rating || 5,
                    publishTime: r.publishTime || new Date().toISOString(),
                    relativePublishTimeDescription: r.relativePublishTimeDescription || 'recently',
                    text: r.text?.text || r.originalText?.text || '',
                    source: 'Google Maps Verified Review',
                    responseStatus: 'Needs Response',
                    responseNote: '',
                    clientSegment: 'Google Maps User'
                  });
                }
              }
            }
            data.place.lastSyncedAt = new Date().toISOString();
            writeReviewsData(data);
          }
        } catch (apiErr) {
          console.error('Google Maps API fetch error (using cached reviews):', apiErr);
        }
      }

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in reviews endpoint:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update or add review in tracker
  app.post('/api/google-maps/reviews', (req, res) => {
    try {
      const data = readReviewsData();
      const { review, updateId } = req.body;

      if (updateId) {
        const idx = data.reviews.findIndex((r: any) => r.id === updateId);
        if (idx !== -1) {
          data.reviews[idx] = { ...data.reviews[idx], ...review };
          writeReviewsData(data);
          return res.status(200).json({ success: true, review: data.reviews[idx] });
        }
        return res.status(404).json({ success: false, error: 'Review not found' });
      }

      if (review) {
        const newReview = {
          id: `manual-${Date.now()}`,
          authorName: review.authorName || 'Anonymous Client',
          authorPhotoUrl: review.authorPhotoUrl || null,
          rating: Number(review.rating) || 5,
          publishTime: review.publishTime || new Date().toISOString(),
          relativePublishTimeDescription: 'Just now',
          text: review.text || '',
          source: review.source || 'Google Maps Client',
          responseStatus: review.responseStatus || 'Acknowledged',
          responseNote: review.responseNote || '',
          clientSegment: review.clientSegment || 'Enterprise Client'
        };
        data.reviews.unshift(newReview);
        // Recalculate average rating
        const totalRating = data.reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0);
        data.place.rating = Math.round((totalRating / data.reviews.length) * 10) / 10;
        data.place.userRatingCount = data.reviews.length;
        writeReviewsData(data);
        return res.status(201).json({ success: true, review: newReview, place: data.place });
      }

      res.status(400).json({ success: false, error: 'Invalid payload' });
    } catch (error: any) {
      console.error('Error saving review:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API endpoint not found.' }); });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
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

