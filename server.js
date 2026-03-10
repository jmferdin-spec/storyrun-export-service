'use strict';

const express = require('express');
const cors    = require('cors');
const puppeteer = require('puppeteer');

const PORT           = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const API_SECRET     = process.env.API_SECRET     || '';

const STORY_WIDTH  = 1080;
const STORY_HEIGHT = 1920;

// ─── Browser pool ──────────────────────────────────────────────────────────────

let browserInstance   = null;
let browserLaunchPromise = null;

async function getBrowser() {
  if (browserInstance) {
    try { await browserInstance.version(); return browserInstance; }
    catch { browserInstance = null; browserLaunchPromise = null; }
  }
  if (!browserLaunchPromise) {
    browserLaunchPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--no-first-run', '--no-zygote',
        '--disable-extensions', '--disable-background-networking',
        '--font-render-hinting=none',
      ],
    }).then(b => {
      browserInstance = b;
      browserLaunchPromise = null;
      b.on('disconnected', () => { browserInstance = null; browserLaunchPromise = null; });
      console.log('[browser] ready');
      return b;
    });
  }
  return browserLaunchPromise;
}

getBrowser().catch(e => console.error('[browser] warmup failed:', e.message));

// ─── Polyline decoder ──────────────────────────────────────────────────────────

function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function getBounds(points) {
  return points.reduce((b, p) => ({
    minLat: Math.min(b.minLat, p.lat), maxLat: Math.max(b.maxLat, p.lat),
    minLng: Math.min(b.minLng, p.lng), maxLng: Math.max(b.maxLng, p.lng),
  }), { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity });
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  function perp(p, a, b) {
    const dx = b.lng - a.lng, dy = b.lat - a.lat;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    return Math.abs((p.lat - a.lat)*dx - (p.lng - a.lng)*dy) / len;
  }
  function rdp(pts) {
    if (pts.length <= 2) return pts;
    let max = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perp(pts[i], pts[0], pts[pts.length-1]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolerance) {
      const l = rdp(pts.slice(0, idx+1));
      const r = rdp(pts.slice(idx));
      return [...l.slice(0,-1), ...r];
    }
    return [pts[0], pts[pts.length-1]];
  }
  return rdp(points);
}

// ─── Route SVG ─────────────────────────────────────────────────────────────────

function generateRouteSvg(encodedPolyline, opts) {
  const { width, height, color, thickness, opacity, padding, glowIntensity = 1 } = opts;
  const raw = decodePolyline(encodedPolyline);
  if (raw.length < 2) return '';
  const pts = simplify(raw, 0.00003);
  const bounds = getBounds(pts);
  const padW = padding, padH = padding;
  const drawW = width - padW*2, drawH = height - padH*2;
  const latRange = bounds.maxLat - bounds.minLat || 0.0001;
  const lngRange = bounds.maxLng - bounds.minLng || 0.0001;
  const sc = Math.min(drawW/lngRange, drawH/latRange);
  const offX = padW + (drawW - lngRange*sc)/2;
  const offY = padH + (drawH - latRange*sc)/2;
  const coords = pts.map(p => ({
    x: (p.lng - bounds.minLng)*sc + offX,
    y: height - ((p.lat - bounds.minLat)*sc + offY),
  }));

  let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i-1], curr = coords[i];
    path += ` Q ${((prev.x+curr.x)/2).toFixed(1)} ${((prev.y+curr.y)/2).toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const start = coords[0], end = coords[coords.length-1];
  const id = 'r' + Math.random().toString(36).slice(2,8);
  const gBlur = thickness*(1.5+glowIntensity*2.5);
  const gOp   = (0.15+glowIntensity*0.15)*opacity;
  const oOp   = (0.06+glowIntensity*0.08)*opacity;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
    viewBox="0 0 ${width} ${height}" style="position:absolute;top:0;left:0;pointer-events:none;overflow:visible;">
    <defs>
      <filter id="${id}-g" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${gBlur}" result="b1"/>
        <feMerge><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id}-s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="${thickness}" flood-color="rgba(0,0,0,0.6)"/>
      </filter>
    </defs>
    ${glowIntensity>0?`<path d="${path}" fill="none" stroke="${color}" stroke-width="${thickness*6}"
      stroke-linecap="round" opacity="${oOp}" filter="url(#${id}-g)"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="${thickness*3}"
      stroke-linecap="round" opacity="${gOp}" filter="url(#${id}-g)"/>`:''}
    <path d="${path}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="${thickness+1.5}"
      stroke-linecap="round" filter="url(#${id}-s)" opacity="${opacity*0.5}"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="${thickness}"
      stroke-linecap="round" opacity="${opacity}"/>
    <path d="${path}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="${Math.max(1,thickness*0.3)}"
      stroke-linecap="round" opacity="${opacity*0.6}"/>
    <circle cx="${start.x}" cy="${start.y}" r="${thickness*1.8}" fill="${color}" opacity="${opacity}"/>
    <circle cx="${start.x}" cy="${start.y}" r="${thickness*0.7}" fill="white" opacity="${opacity*0.9}"/>
    <circle cx="${end.x}" cy="${end.y}" r="${thickness*2.5}" fill="white" stroke="${color}"
      stroke-width="${thickness*0.9}" opacity="${opacity}"/>
    <circle cx="${end.x}" cy="${end.y}" r="${thickness}" fill="${color}" opacity="${opacity*0.8}"/>
  </svg>`;
}

// ─── Format helpers ────────────────────────────────────────────────────────────

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

function formatDist(meters, units) {
  if (units === 'imperial') return (meters / METERS_PER_MILE).toFixed(2);
  return (meters/1000).toFixed(2);
}
function formatTime(secs) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
  return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function formatPace(mps, units) {
  if (!mps) return '0:00';
  if (units === 'imperial') {
    const secsPerMile = METERS_PER_MILE/mps;
    return `${Math.floor(secsPerMile/60)}:${String(Math.round(secsPerMile%60)).padStart(2,'0')}`;
  }
  const secsPerKm = 1000/mps;
  return `${Math.floor(secsPerKm/60)}:${String(Math.round(secsPerKm%60)).padStart(2,'0')}`;
}
function formatElev(m, units) {
  if (units === 'imperial') return `${Math.round(m / METERS_PER_FOOT)}ft`;
  return `${Math.round(m)}m`;
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

// ─── Overlay CSS ───────────────────────────────────────────────────────────────

function hexToRgba(hex, op) {
  if (!hex || hex.startsWith('rgba') || hex.startsWith('rgb')) return `rgba(0,0,0,${op})`;
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `rgba(${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)},${op})` : `rgba(0,0,0,${op})`;
}

function overlayStyle(c) {
  const col = c.overlayColor, op = c.overlayOpacity;
  const solid = hexToRgba(col, op), clear = hexToRgba(col, 0);
  const half  = hexToRgba(col, op*0.4), mid = hexToRgba(col, op*0.65);
  switch (c.overlayType) {
    case 'solid':           return `background:${solid};`;
    case 'gradient-top':    return `background:linear-gradient(to top,${clear} 0%,${clear} 30%,${half} 55%,${mid} 72%,${solid} 100%);`;
    case 'vignette':        return `background:radial-gradient(ellipse 80% 70% at 50% 50%,${clear} 0%,${hexToRgba(col,op*0.3)} 50%,${solid} 100%);`;
    case 'cinematic':       return `background:linear-gradient(to bottom,${solid} 0%,${solid} 8%,${clear} 18%,${half} 50%,${clear} 78%,${solid} 90%,${solid} 100%);`;
    case 'duotone':         return `background:linear-gradient(155deg,${hexToRgba(c.gradientStartColor||col,op*0.75)} 0%,${hexToRgba(c.gradientEndColor||'#000',op*0.85)} 100%);mix-blend-mode:multiply;`;
    default:                return `background:linear-gradient(to bottom,${clear} 0%,${clear} 30%,${half} 55%,${mid} 72%,${solid} 100%);`;
  }
}

// ─── HTML generator ────────────────────────────────────────────────────────────

const FONT_MAP = {
  'Bebas Neue':       'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'Oswald':           'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap',
  'Montserrat':       'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
  'Raleway':          'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap',
  'Space Mono':       'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
  'DM Serif Display': 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
  'Inter':            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'Barlow Condensed': 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&display=swap',
  'Anton':            'https://fonts.googleapis.com/css2?family=Anton&display=swap',
  'Russo One':        'https://fonts.googleapis.com/css2?family=Russo+One&display=swap',
  'Teko':             'https://fonts.googleapis.com/css2?family=Teko:wght@300;400;500;600;700&display=swap',
  'Fjalla One':       'https://fonts.googleapis.com/css2?family=Fjalla+One&display=swap',
  'Staatliches':      'https://fonts.googleapis.com/css2?family=Staatliches&display=swap',
};

function generateHtml(bgImage, routeSvg, stats, vis, cfg) {
  const fontUrl = FONT_MAP[cfg.fontFamily] || '';
  const bg = bgImage
    ? `background-image:url('${bgImage}');background-size:cover;background-position:center;`
    : `background:linear-gradient(155deg,#0d1117 0%,#161b27 40%,#0f1923 100%);`;
  const ls = cfg.letterSpacing ? `letter-spacing:${cfg.letterSpacing}em;` : '';
  const align = cfg.statAlignment || 'center';

  const absPos = cfg.useAbsolutePosition
    ? `left:${cfg.statPosition.x}px;top:${cfg.statPosition.y}px;transform:translate(-50%,-50%);`
    : '';

  const blockPos = absPos || [
    align==='center' ? 'left:0;right:0;text-align:center;' : '',
    align==='left'   ? 'left:0;padding-left:80px;' : '',
    align==='right'  ? 'right:0;padding-right:80px;' : '',
    `top:${cfg.statVerticalOffset||75}%;transform:translateY(-${cfg.statVerticalOffset||75}%);`,
  ].join('');

  const routeHtml = cfg.showRoute && routeSvg
    ? `<div style="position:absolute;left:0;right:0;pointer-events:none;${routePos(cfg.routePosition)}">${routeSvg}</div>` : '';

  function routePos(pos) {
    if (pos==='top')        return 'top:250px;height:600px;';
    if (pos==='bottom')     return 'bottom:350px;height:600px;';
    if (pos==='background') return 'top:0;bottom:0;height:100%;opacity:0.35;';
    return 'top:50%;transform:translateY(-50%);height:700px;';
  }

  const statBlock = buildStatBlock(stats, vis, cfg, blockPos);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  ${fontUrl?`<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">`:''}
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{width:1080px;height:1920px;overflow:hidden;font-family:'${cfg.fontFamily}',sans-serif;}
    .story{position:relative;width:1080px;height:1920px;overflow:hidden;${bg}}
    .overlay{position:absolute;inset:0;${overlayStyle(cfg)}}
    .safe{position:absolute;top:250px;bottom:300px;left:0;right:0;}
  </style></head><body>
  <div class="story">
    <div class="overlay"></div>
    ${routeHtml}
    <div class="safe">${statBlock}</div>
  </div></body></html>`;
}

function buildStatBlock(stats, vis, cfg, blockPos) {
  const f = cfg.fontSize || 72, fw = cfg.fontWeight || '700';
  const sc = cfg.statColor || '#fff', lc = cfg.labelColor || 'rgba(255,255,255,0.6)';
  const ac = cfg.accentColor || '#FC4C02';
  const ls = cfg.letterSpacing ? `letter-spacing:${cfg.letterSpacing}em;` : '';
  const align = cfg.statAlignment || 'center';
  const distUnit = cfg.units === 'imperial' ? 'mi' : 'km';
  const paceUnit = cfg.units === 'imperial' ? '/mi' : '/km';

  const label = (t) => `<div style="font-size:${Math.round(f*0.27)}px;font-weight:400;color:${lc};letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px">${t}</div>`;
  const val   = (v, size=f) => `<div style="font-size:${size}px;font-weight:${fw};color:${sc};line-height:1;${ls}">${v}</div>`;
  const unit  = (u) => `<span style="font-size:0.33em;font-weight:400;opacity:0.65;margin-left:6px">${u}</span>`;
  const divider = `<div style="width:52px;height:3px;background:${ac};border-radius:2px;margin:36px ${align==='center'?'auto':'0'};"></div>`;

  const baseStyle = `position:absolute;padding:60px;text-align:${align};${blockPos}`;

  if (cfg.templateId === 'gradient-bar') {
    const items = [
      vis.distance && `<div style="text-align:center">${label('Distance')}${val(stats.distance+`<span style="font-size:0.38em;margin-left:4px">${distUnit}</span>`)}</div>`,
      vis.time      && `<div style="text-align:center">${label('Time')}${val(stats.time,Math.round(f*0.72))}</div>`,
      vis.pace      && `<div style="text-align:center">${label('Pace')}${val(stats.pace,Math.round(f*0.72))}</div>`,
      vis.elevation && `<div style="text-align:center">${label('Elevation')}${val(stats.elevation,Math.round(f*0.72))}</div>`,
    ].filter(Boolean);
    return `<div style="${baseStyle}background:linear-gradient(135deg,${cfg.overlayColor} 0%,${hexToRgba(ac,0.55)} 100%);left:0;right:0;bottom:0;top:auto;transform:none;border-top:3px solid ${ac};">
      <div style="display:grid;grid-template-columns:repeat(${Math.min(items.length,4)},1fr);gap:36px 56px;">${items.join('')}</div>
      ${vis.date?`<div style="font-size:${Math.round(f*0.28)}px;color:${lc};letter-spacing:0.14em;text-transform:uppercase;margin-top:18px;text-align:center">${stats.date}</div>`:''}
    </div>`;
  }

  if (cfg.templateId === 'athlete-poster') {
    return `<div style="${baseStyle}top:auto;bottom:0;transform:none;">
      <div style="width:110px;height:5px;background:${ac};border-radius:3px;margin-bottom:44px;${align==='center'?'margin-left:auto;margin-right:auto;':''}"></div>
      ${vis.distance?`<div style="margin-bottom:14px">${label('Total Distance')}${val(stats.distance+`<span style="font-size:0.28em;vertical-align:middle;margin-left:10px">${distUnit}</span>`,Math.round(f*1.6))}</div>`:''}
      <div style="display:flex;gap:56px;margin-top:28px;flex-wrap:wrap">
        ${vis.time?`<div>${label('Moving Time')}${val(stats.time,Math.round(f*0.65))}</div>`:''}
        ${vis.pace?`<div>${label('Avg Pace')}${val(stats.pace,Math.round(f*0.65))}</div>`:''}
        ${vis.elevation?`<div>${label('Elevation')}${val(stats.elevation,Math.round(f*0.65))}</div>`:''}
      </div>
      ${vis.date?`<div style="font-size:${Math.round(f*0.24)}px;color:${lc};letter-spacing:0.14em;text-transform:uppercase;margin-top:28px">${stats.date}</div>`:''}
    </div>`;
  }

  if (cfg.templateId === 'large-center') {
    return `<div style="${baseStyle}">
      ${vis.distance?`<div style="margin-bottom:28px">${label('Distance')}${val(stats.distance+unit(distUnit),Math.round(f*1.45))}</div>`:''}
      ${divider}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:36px 56px;justify-content:center;text-align:center">
        ${vis.time?`<div>${label('Time')}${val(stats.time,Math.round(f*0.8))}</div>`:''}
        ${vis.pace?`<div>${label('Pace')}${val(stats.pace,Math.round(f*0.8))}</div>`:''}
        ${vis.elevation?`<div>${label('Elevation')}${val(stats.elevation,Math.round(f*0.8))}</div>`:''}
      </div>
      ${vis.date?`<div style="font-size:${Math.round(f*0.28)}px;color:${lc};letter-spacing:0.14em;text-transform:uppercase;margin-top:18px">${stats.date}</div>`:''}
    </div>`;
  }

  // minimal-bottom / route-focus (default)
  const row2 = [
    vis.time      && `<div style="margin-bottom:28px">${label('Time')}${val(stats.time,Math.round(f*0.72))}</div>`,
    vis.pace      && `<div style="margin-bottom:28px">${label('Pace')}${val(stats.pace+`<span style="font-size:0.33em;font-weight:400;opacity:0.65;margin-left:6px">${paceUnit}</span>`,Math.round(f*0.72))}</div>`,
    vis.elevation && `<div style="margin-bottom:28px">${label('Elevation')}${val(stats.elevation,Math.round(f*0.72))}</div>`,
  ].filter(Boolean);

  const bottomStyle = cfg.templateId==='minimal-bottom' ? 'bottom:0;top:auto;transform:none;' : '';

  return `<div style="${baseStyle}${bottomStyle}">
    ${divider}
    ${vis.distance?`<div style="margin-bottom:28px">${label('Distance')}${val(stats.distance+unit(distUnit))}</div>`:''}
    ${row2.length?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:36px 56px;">${row2.join('')}</div>`:''}
    ${vis.date?`<div style="font-size:${Math.round(f*0.28)}px;color:${lc};letter-spacing:0.14em;text-transform:uppercase;margin-top:18px">${stats.date}</div>`:''}
  </div>`;
}

// ─── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET','POST','OPTIONS'],
}));

function auth(req, res, next) {
  if (!API_SECRET) return next();
  if (req.headers['x-api-secret'] !== API_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  browser: browserInstance ? 'ready' : 'starting',
  uptime: Math.round(process.uptime()),
}));

app.post('/generate', auth, async (req, res) => {
  const { config: cfg, backgroundImageBase64 } = req.body;
  if (!cfg) return res.status(400).json({ error: 'Missing config' });

  let page;
  try {
    const act = cfg.activity;
    const units = cfg.units || 'metric';
    const stats = act ? {
      distance:  formatDist(act.distance, units),
      time:      formatTime(act.moving_time),
      pace:      formatPace(act.average_speed, units),
      elevation: formatElev(act.total_elevation_gain, units),
      date:      formatDate(act.start_date_local),
    } : { distance:'10.00', time:'52:30', pace:'5:15', elevation: units === 'imperial' ? '394ft' : '120m', date:'Jan 1, 2024' };

    let routeSvg;
    if (cfg.showRoute && act?.map?.summary_polyline) {
      routeSvg = generateRouteSvg(act.map.summary_polyline, {
        width: STORY_WIDTH, height: STORY_HEIGHT * 0.4,
        color: cfg.routeColor, thickness: cfg.routeThickness,
        opacity: cfg.routeOpacity, padding: 80,
        glowIntensity: cfg.routeGlowIntensity ?? 1,
      });
    }

    const bgImage = backgroundImageBase64 ?? cfg.backgroundImage;
    const html = generateHtml(bgImage, routeSvg, stats, cfg.visibleStats, cfg);

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: STORY_WIDTH, height: STORY_HEIGHT, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: ['networkidle0','domcontentloaded'], timeout: 25000 });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 350));

    const png = await page.screenshot({ type:'png', clip:{ x:0, y:0, width:STORY_WIDTH, height:STORY_HEIGHT } });
    await page.close();

    res.set({ 'Content-Type':'image/png', 'Content-Disposition':'attachment; filename="strava-story.png"', 'Cache-Control':'no-cache' });
    return res.send(png);

  } catch (err) {
    if (page) await page.close().catch(()=>{});
    console.error('[generate]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StoryRun export service on port ${PORT}`);
});
