import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import puppeteer, { Browser } from 'puppeteer';
import { generateStoryHtml } from './storyTemplates';
import { generateRouteSvg } from './routeRenderer';
import {
  formatDistanceValue,
  formatTime,
  formatPaceValue,
  formatElevation,
  formatDateShort,
} from './stravaFormat';
import type { StoryConfig } from './types';

// ─── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const API_SECRET = process.env.API_SECRET || '';   // optional shared secret

const STORY_WIDTH  = 1080;
const STORY_HEIGHT = 1920;

// ─── Browser pool ──────────────────────────────────────────────────────────────
// Reuse a single browser instance across requests — much faster than cold-launching
// Chromium on every request.

let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  // If we already have a healthy browser, return it
  if (browserInstance) {
    try {
      // Verify it's still alive with a cheap call
      await browserInstance.version();
      return browserInstance;
    } catch {
      // Browser died — clear and re-launch
      browserInstance = null;
      browserLaunchPromise = null;
    }
  }

  // Deduplicate concurrent launch requests
  if (!browserLaunchPromise) {
    browserLaunchPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--font-render-hinting=none',
        // Reduce memory usage on free tier containers
        '--js-flags=--max-old-space-size=512',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
      ],
    }).then((browser) => {
      browserInstance = browser;
      browserLaunchPromise = null;

      // Restart browser if it crashes
      browser.on('disconnected', () => {
        browserInstance = null;
        browserLaunchPromise = null;
        console.log('[browser] Disconnected — will relaunch on next request');
      });

      console.log('[browser] Launched successfully');
      return browser;
    });
  }

  return browserLaunchPromise;
}

// Pre-warm the browser on startup
getBrowser().catch((err) => console.error('[browser] Pre-warm failed:', err));

// ─── App ───────────────────────────────────────────────────────────────────────

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20mb' }));  // large because of base64 background images
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-secret'],
}));

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireSecret(req: Request, res: Response, next: NextFunction) {
  if (!API_SECRET) return next();  // no secret set → open access
  const provided = req.headers['x-api-secret'] || req.query.secret;
  if (provided !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    browser: browserInstance ? 'ready' : 'starting',
    uptime: Math.round(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
  });
});

// ─── Generate endpoint ─────────────────────────────────────────────────────────

interface GenerateRequest {
  config: StoryConfig;
  backgroundImageBase64?: string;
}

app.post('/generate', requireSecret, async (req: Request, res: Response) => {
  const startTime = Date.now();

  const { config, backgroundImageBase64 }: GenerateRequest = req.body;
  if (!config) {
    return res.status(400).json({ error: 'Missing config' });
  }

  let page;
  try {
    // Build stats
    const activity = config.activity;
    const stats = activity
      ? {
          distance:  formatDistanceValue(activity.distance),
          time:      formatTime(activity.moving_time),
          pace:      formatPaceValue(activity.average_speed),
          elevation: formatElevation(activity.total_elevation_gain),
          date:      formatDateShort(activity.start_date_local),
        }
      : { distance: '10.00', time: '52:30', pace: '5:15', elevation: '120m', date: 'Jan 1, 2024' };

    // Build route SVG
    let routeSvg: string | undefined;
    if (config.showRoute && activity?.map?.summary_polyline) {
      routeSvg = generateRouteSvg(activity.map.summary_polyline, {
        width:         STORY_WIDTH,
        height:        STORY_HEIGHT * 0.4,
        color:         config.routeColor,
        thickness:     config.routeThickness,
        opacity:       config.routeOpacity,
        padding:       80,
        glowIntensity: config.routeGlowIntensity ?? 1,
      });
    }

    const backgroundImage = backgroundImageBase64 ?? config.backgroundImage;

    // Generate HTML
    const html = generateStoryHtml({
      backgroundImage,
      routeSvg,
      stats,
      visibleStats: config.visibleStats,
      config: { ...config, backgroundImage },
    });

    // Get browser page
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({
      width:             STORY_WIDTH,
      height:            STORY_HEIGHT,
      deviceScaleFactor: 1,
    });

    // Set HTML and wait for fonts + images
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout:   25000,
    });

    // Wait for Google Fonts to render
    await page.evaluateHandle('document.fonts.ready');

    // Short stabilisation delay
    await new Promise((r) => setTimeout(r, 350));

    // Screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: STORY_WIDTH, height: STORY_HEIGHT },
    });

    await page.close();
    page = null;

    const elapsed = Date.now() - startTime;
    console.log(`[generate] ✓ ${elapsed}ms — activity: ${activity?.name || 'demo'}`);

    res.set({
      'Content-Type':        'image/png',
      'Content-Disposition': 'attachment; filename="strava-story.png"',
      'Cache-Control':       'no-cache',
      'X-Render-Time':       String(elapsed),
    });

    return res.send(screenshot);

  } catch (err) {
    if (page) await page.close().catch(() => {});

    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate] ✗', msg);

    return res.status(500).json({ error: `Render failed: ${msg}` });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] StoryRun export service running on port ${PORT}`);
  console.log(`[server] CORS origin: ${ALLOWED_ORIGIN}`);
  console.log(`[server] Auth: ${API_SECRET ? 'enabled' : 'disabled (set API_SECRET to enable)'}`);
});

export default app;
