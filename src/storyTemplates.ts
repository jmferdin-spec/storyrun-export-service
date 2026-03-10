import type { StoryTemplate, StoryConfig, OverlayType } from './types';

// ─── Default Config ────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: Omit<StoryConfig, 'activity'> = {
  backgroundImage: null,
  templateId: 'minimal-bottom',
  fontFamily: 'Bebas Neue',
  fontSize: 72,
  fontWeight: '700',
  letterSpacing: 0,
  statColor: '#FFFFFF',
  labelColor: 'rgba(255,255,255,0.6)',
  overlayColor: '#000000',
  overlayOpacity: 0.45,
  overlayType: 'gradient-bottom',
  accentColor: '#FC4C02',
  gradientStartColor: '#FC4C02',
  gradientEndColor: '#000000',
  visibleStats: {
    distance: true,
    time: true,
    pace: true,
    elevation: true,
    date: true,
  },
  statAlignment: 'center',
  statPosition: { x: 540, y: 1440 },
  useAbsolutePosition: false,
  showRoute: true,
  routeColor: '#FC4C02',
  routeThickness: 4,
  routeOpacity: 0.9,
  routePosition: 'middle',
  routeGlowIntensity: 1.5,
  statVerticalOffset: 75,
};

// ─── Template Definitions ──────────────────────────────────────────────────────

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'minimal-bottom',
    name: 'Minimal Bottom',
    description: 'Clean stats at the bottom with a deep gradient fade',
    thumbnail: '▬',
    defaults: {
      templateId: 'minimal-bottom',
      fontFamily: 'Inter',
      fontSize: 64,
      fontWeight: '700',
      letterSpacing: -0.02,
      statColor: '#FFFFFF',
      labelColor: 'rgba(255,255,255,0.55)',
      overlayColor: '#000000',
      overlayOpacity: 0.7,
      overlayType: 'gradient-bottom',
      accentColor: '#FC4C02',
      statAlignment: 'left',
      statVerticalOffset: 80,
      routePosition: 'middle',
      routeGlowIntensity: 1.5,
      useAbsolutePosition: false,
    },
  },
  {
    id: 'large-center',
    name: 'Large Center',
    description: 'Bold centered stats dominate with a dramatic vignette',
    thumbnail: '◉',
    defaults: {
      templateId: 'large-center',
      fontFamily: 'Bebas Neue',
      fontSize: 96,
      fontWeight: '400',
      letterSpacing: 0.02,
      statColor: '#FFFFFF',
      labelColor: 'rgba(255,255,255,0.5)',
      overlayColor: '#000000',
      overlayOpacity: 0.5,
      overlayType: 'vignette',
      accentColor: '#FC4C02',
      statAlignment: 'center',
      statVerticalOffset: 45,
      routePosition: 'bottom',
      routeGlowIntensity: 2,
      useAbsolutePosition: false,
    },
  },
  {
    id: 'route-focus',
    name: 'Route Focus',
    description: 'Neon route front and center, cinematic dark overlay',
    thumbnail: '〰',
    defaults: {
      templateId: 'route-focus',
      fontFamily: 'Space Mono',
      fontSize: 52,
      fontWeight: '400',
      letterSpacing: 0.05,
      statColor: '#FFFFFF',
      labelColor: 'rgba(255,255,255,0.6)',
      overlayColor: '#0A0A0B',
      overlayOpacity: 0.65,
      overlayType: 'cinematic',
      accentColor: '#00D4FF',
      routeColor: '#00D4FF',
      statAlignment: 'left',
      statVerticalOffset: 85,
      routePosition: 'middle',
      showRoute: true,
      routeGlowIntensity: 3,
      useAbsolutePosition: false,
    },
  },
  {
    id: 'gradient-bar',
    name: 'Gradient Bar',
    description: 'Stats in a bold Strava-orange gradient bar',
    thumbnail: '▰',
    defaults: {
      templateId: 'gradient-bar',
      fontFamily: 'Montserrat',
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -0.01,
      statColor: '#FFFFFF',
      labelColor: 'rgba(255,255,255,0.65)',
      overlayColor: '#FC4C02',
      overlayOpacity: 0.9,
      overlayType: 'gradient-bottom',
      accentColor: '#FFFFFF',
      statAlignment: 'center',
      statVerticalOffset: 78,
      routePosition: 'middle',
      routeGlowIntensity: 1,
      useAbsolutePosition: false,
    },
  },
  {
    id: 'athlete-poster',
    name: 'Athlete Poster',
    description: 'Magazine editorial with duotone atmosphere',
    thumbnail: '◰',
    defaults: {
      templateId: 'athlete-poster',
      fontFamily: 'Oswald',
      fontSize: 80,
      fontWeight: '600',
      letterSpacing: 0.01,
      statColor: '#FFFFFF',
      labelColor: 'rgba(255,255,255,0.5)',
      overlayColor: '#000000',
      overlayOpacity: 0.6,
      overlayType: 'duotone',
      accentColor: '#FFE500',
      gradientStartColor: '#FC4C02',
      gradientEndColor: '#1a0533',
      statAlignment: 'left',
      statVerticalOffset: 70,
      routePosition: 'background',
      routeGlowIntensity: 0.5,
      useAbsolutePosition: false,
    },
  },
];

export function getTemplate(id: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find((t) => t.id === id);
}

// ─── HTML Template Generators ──────────────────────────────────────────────────

export interface StoryRenderData {
  backgroundImage: string | null;
  routeSvg?: string;
  stats: {
    distance: string;
    time: string;
    pace: string;
    elevation: string;
    date: string;
  };
  visibleStats: {
    distance: boolean;
    time: boolean;
    pace: boolean;
    elevation: boolean;
    date: boolean;
  };
  config: StoryConfig;
}

export function generateStoryHtml(data: StoryRenderData): string {
  const { backgroundImage, routeSvg, stats, visibleStats, config } = data;
  const googleFontsUrl = getGoogleFontsUrl(config.fontFamily);

  const bgStyle = backgroundImage
    ? `background-image: url('${backgroundImage}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(155deg, #0d1117 0%, #161b27 40%, #0f1923 100%);`;

  const overlayStyle = getOverlayStyle(config);
  const statBlockHtml = getStatBlockHtml(stats, visibleStats, config);

  const routeHtml = config.showRoute && routeSvg
    ? `<div class="route-container route-${config.routePosition}">${routeSvg}</div>`
    : '';

  // Absolute position style for dragged stat blocks
  const absPos = config.useAbsolutePosition
    ? `left: ${config.statPosition.x}px; top: ${config.statPosition.y}px; transform: translate(-50%, -50%);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080">
  ${googleFontsUrl ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1080px; height: 1920px;
      overflow: hidden;
      font-family: '${config.fontFamily}', 'Helvetica Neue', sans-serif;
    }

    .story {
      position: relative;
      width: 1080px; height: 1920px;
      overflow: hidden;
      ${bgStyle}
    }

    .overlay {
      position: absolute; inset: 0;
      ${overlayStyle}
    }

    .route-container {
      position: absolute; left: 0; right: 0;
      pointer-events: none;
    }
    .route-top    { top: 250px; height: 600px; }
    .route-middle { top: 50%; transform: translateY(-50%); height: 700px; }
    .route-bottom { bottom: 350px; height: 600px; }
    .route-background { top: 0; bottom: 0; height: 100%; opacity: 0.35; }

    .route-container svg { width: 100%; height: 100%; }

    .safe-zone {
      position: absolute;
      top: 250px; bottom: 300px;
      left: 0; right: 0;
    }

    ${getTemplateStyles(config, absPos)}
  </style>
</head>
<body>
  <div class="story">
    <div class="overlay"></div>
    ${routeHtml}
    <div class="safe-zone">
      ${statBlockHtml}
    </div>
  </div>
</body>
</html>`;
}

// ─── Overlay Styles ────────────────────────────────────────────────────────────

function getOverlayStyle(config: StoryConfig): string {
  const { overlayColor, overlayOpacity, overlayType, gradientStartColor, gradientEndColor } = config;
  const c = hexToRgba(overlayColor, overlayOpacity);
  const c0 = hexToRgba(overlayColor, 0);
  const c30 = hexToRgba(overlayColor, overlayOpacity * 0.3);
  const c60 = hexToRgba(overlayColor, overlayOpacity * 0.65);

  switch (overlayType as OverlayType) {
    case 'solid':
      return `background: ${c};`;

    case 'gradient-bottom':
      return `background: linear-gradient(
        to bottom,
        ${c0} 0%,
        ${c0} 30%,
        ${c30} 55%,
        ${c60} 72%,
        ${c} 100%
      );`;

    case 'gradient-top':
      return `background: linear-gradient(
        to top,
        ${c0} 0%,
        ${c0} 30%,
        ${c30} 55%,
        ${c60} 72%,
        ${c} 100%
      );`;

    case 'vignette':
      return `background: radial-gradient(
        ellipse 80% 70% at 50% 50%,
        ${c0} 0%,
        ${hexToRgba(overlayColor, overlayOpacity * 0.3)} 50%,
        ${c} 100%
      );`;

    case 'cinematic': {
      // Dark bars top + bottom + subtle overall tint
      const barC = hexToRgba(overlayColor, Math.min(1, overlayOpacity * 1.4));
      return `background: linear-gradient(
        to bottom,
        ${barC} 0%,
        ${barC} 8%,
        ${c0} 18%,
        ${c30} 50%,
        ${c0} 78%,
        ${barC} 90%,
        ${barC} 100%
      );`;
    }

    case 'duotone': {
      // Overlay two colors blended — approximated with a diagonal gradient
      const gs = hexToRgba(gradientStartColor, overlayOpacity * 0.75);
      const ge = hexToRgba(gradientEndColor, overlayOpacity * 0.85);
      return `background: linear-gradient(155deg, ${gs} 0%, ${ge} 100%);
        mix-blend-mode: multiply;`;
    }

    default:
      return `background: ${c};`;
  }
}

// ─── Template CSS ──────────────────────────────────────────────────────────────

function getTemplateStyles(config: StoryConfig, absPos: string): string {
  const ls = config.letterSpacing !== 0 ? `letter-spacing: ${config.letterSpacing}em;` : '';

  const base = `
    .stat-block {
      position: absolute;
      padding: 60px;
      text-align: ${config.statAlignment};
      ${absPos || `
        ${config.statAlignment === 'center' ? 'left: 0; right: 0; text-align: center;' : ''}
        ${config.statAlignment === 'left' ? 'left: 0; padding-left: 80px;' : ''}
        ${config.statAlignment === 'right' ? 'right: 0; padding-right: 80px;' : ''}
        top: ${config.statVerticalOffset}%;
        transform: translateY(-${config.statVerticalOffset}%);
      `}
    }
    .stat-label {
      font-family: '${config.fontFamily}', sans-serif;
      font-size: ${Math.round(config.fontSize * 0.27)}px;
      font-weight: 400;
      color: ${config.labelColor};
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .stat-value {
      font-family: '${config.fontFamily}', sans-serif;
      font-size: ${config.fontSize}px;
      font-weight: ${config.fontWeight};
      color: ${config.statColor};
      line-height: 1;
      ${ls}
    }
    .stat-unit {
      font-size: ${Math.round(config.fontSize * 0.33)}px;
      font-weight: 400;
      opacity: 0.65;
      margin-left: 6px;
    }
    .stat-item { margin-bottom: 28px; }
    .stat-divider {
      width: 52px; height: 3px;
      background: ${config.accentColor};
      border-radius: 2px;
      margin: 36px ${config.statAlignment === 'center' ? 'auto' : '0'};
    }
    .stat-date {
      font-family: '${config.fontFamily}', sans-serif;
      font-size: ${Math.round(config.fontSize * 0.28)}px;
      font-weight: 400;
      color: ${config.labelColor};
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-top: 18px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px 56px;
    }
  `;

  const templateSpecific: Record<string, string> = {
    'minimal-bottom': `.stat-block { bottom: 0; top: auto; transform: none; }`,

    'gradient-bar': `
      .stat-block {
        background: linear-gradient(135deg,
          ${config.overlayColor} 0%,
          ${hexToRgba(config.accentColor, 0.55)} 100%
        );
        padding: 56px 80px;
        left: 0; right: 0;
        bottom: 0; top: auto; transform: none;
        border-top: 3px solid ${config.accentColor};
        backdrop-filter: blur(4px);
      }
    `,

    'athlete-poster': `
      .stat-block { top: auto; bottom: 0; transform: none; }
      .stat-value { font-size: ${config.fontSize * 1.1}px; }
      .accent-line {
        width: 110px; height: 5px;
        background: ${config.accentColor};
        border-radius: 3px;
        margin-bottom: 44px;
        ${config.statAlignment === 'center' ? 'margin-left: auto; margin-right: auto;' : ''}
      }
    `,
  };

  return base + (templateSpecific[config.templateId] || '');
}

// ─── Stat Block HTML ───────────────────────────────────────────────────────────

function getStatBlockHtml(
  stats: StoryRenderData['stats'],
  visibleStats: StoryRenderData['visibleStats'],
  config: StoryConfig
): string {
  switch (config.templateId) {
    case 'minimal-bottom':
    case 'route-focus':
      return getMinimalStatBlock(stats, visibleStats, config);
    case 'large-center':
      return getLargeCenterStatBlock(stats, visibleStats, config);
    case 'gradient-bar':
      return getGradientBarStatBlock(stats, visibleStats, config);
    case 'athlete-poster':
      return getAthletePosterStatBlock(stats, visibleStats, config);
    default:
      return getMinimalStatBlock(stats, visibleStats, config);
  }
}

function getMinimalStatBlock(
  stats: StoryRenderData['stats'],
  visibleStats: StoryRenderData['visibleStats'],
  config: StoryConfig
): string {
  const row2: string[] = [];
  if (visibleStats.time) row2.push(`<div class="stat-item"><div class="stat-label">Time</div><div class="stat-value" style="font-size:${Math.round(config.fontSize * 0.72)}px">${stats.time}</div></div>`);
  if (visibleStats.pace) row2.push(`<div class="stat-item"><div class="stat-label">Pace</div><div class="stat-value" style="font-size:${Math.round(config.fontSize * 0.72)}px">${stats.pace}<span class="stat-unit">/km</span></div></div>`);
  if (visibleStats.elevation) row2.push(`<div class="stat-item"><div class="stat-label">Elevation</div><div class="stat-value" style="font-size:${Math.round(config.fontSize * 0.72)}px">${stats.elevation}</div></div>`);

  return `<div class="stat-block">
    <div class="stat-divider"></div>
    ${visibleStats.distance ? `<div class="stat-item"><div class="stat-label">Distance</div><div class="stat-value">${stats.distance}<span class="stat-unit">km</span></div></div>` : ''}
    ${row2.length > 0 ? `<div class="stats-grid">${row2.join('')}</div>` : ''}
    ${visibleStats.date ? `<div class="stat-date">${stats.date}</div>` : ''}
  </div>`;
}

function getLargeCenterStatBlock(
  stats: StoryRenderData['stats'],
  visibleStats: StoryRenderData['visibleStats'],
  config: StoryConfig
): string {
  return `<div class="stat-block">
    ${visibleStats.distance ? `<div class="stat-item"><div class="stat-label">Distance</div><div class="stat-value" style="font-size:${config.fontSize * 1.45}px">${stats.distance}<span class="stat-unit" style="font-size:${config.fontSize * 0.45}px">km</span></div></div>` : ''}
    <div class="stat-divider"></div>
    <div class="stats-grid" style="justify-content:center;text-align:center;">
      ${visibleStats.time ? `<div class="stat-item"><div class="stat-label">Time</div><div class="stat-value" style="font-size:${config.fontSize * 0.8}px">${stats.time}</div></div>` : ''}
      ${visibleStats.pace ? `<div class="stat-item"><div class="stat-label">Pace</div><div class="stat-value" style="font-size:${config.fontSize * 0.8}px">${stats.pace}</div></div>` : ''}
      ${visibleStats.elevation ? `<div class="stat-item"><div class="stat-label">Elevation</div><div class="stat-value" style="font-size:${config.fontSize * 0.8}px">${stats.elevation}</div></div>` : ''}
    </div>
    ${visibleStats.date ? `<div class="stat-date">${stats.date}</div>` : ''}
  </div>`;
}

function getGradientBarStatBlock(
  stats: StoryRenderData['stats'],
  visibleStats: StoryRenderData['visibleStats'],
  config: StoryConfig
): string {
  const items = [
    visibleStats.distance && `<div class="stat-item" style="text-align:center"><div class="stat-label">Distance</div><div class="stat-value">${stats.distance}<span style="font-size:0.38em;margin-left:4px">km</span></div></div>`,
    visibleStats.time && `<div class="stat-item" style="text-align:center"><div class="stat-label">Time</div><div class="stat-value" style="font-size:${config.fontSize * 0.72}px">${stats.time}</div></div>`,
    visibleStats.pace && `<div class="stat-item" style="text-align:center"><div class="stat-label">Pace</div><div class="stat-value" style="font-size:${config.fontSize * 0.72}px">${stats.pace}</div></div>`,
    visibleStats.elevation && `<div class="stat-item" style="text-align:center"><div class="stat-label">Elevation</div><div class="stat-value" style="font-size:${config.fontSize * 0.72}px">${stats.elevation}</div></div>`,
  ].filter(Boolean);

  return `<div class="stat-block">
    <div style="display:grid;grid-template-columns:repeat(${Math.min(items.length, 4)},1fr);gap:36px;">
      ${items.join('')}
    </div>
    ${visibleStats.date ? `<div class="stat-date" style="margin-top:20px;text-align:center">${stats.date}</div>` : ''}
  </div>`;
}

function getAthletePosterStatBlock(
  stats: StoryRenderData['stats'],
  visibleStats: StoryRenderData['visibleStats'],
  config: StoryConfig
): string {
  return `<div class="stat-block">
    <div class="accent-line"></div>
    ${visibleStats.distance ? `<div class="stat-item" style="margin-bottom:14px"><div class="stat-label" style="font-size:${config.fontSize * 0.22}px">Total Distance</div><div class="stat-value" style="font-size:${config.fontSize * 1.6}px;line-height:0.88">${stats.distance}<span style="font-size:0.28em;vertical-align:middle;margin-left:10px">km</span></div></div>` : ''}
    <div style="display:flex;gap:56px;margin-top:28px;flex-wrap:wrap">
      ${visibleStats.time ? `<div><div class="stat-label">Moving Time</div><div class="stat-value" style="font-size:${config.fontSize * 0.65}px">${stats.time}</div></div>` : ''}
      ${visibleStats.pace ? `<div><div class="stat-label">Avg Pace</div><div class="stat-value" style="font-size:${config.fontSize * 0.65}px">${stats.pace}</div></div>` : ''}
      ${visibleStats.elevation ? `<div><div class="stat-label">Elevation</div><div class="stat-value" style="font-size:${config.fontSize * 0.65}px">${stats.elevation}</div></div>` : ''}
    </div>
    ${visibleStats.date ? `<div class="stat-date" style="margin-top:28px;font-size:${config.fontSize * 0.24}px">${stats.date}</div>` : ''}
  </div>`;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, opacity: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${opacity})`);
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${opacity})`;
  return `rgba(${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)},${opacity})`;
}

const GOOGLE_FONTS_MAP: Record<string, string> = {
  'Bebas Neue':       'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'Oswald':           'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap',
  'Montserrat':       'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
  'Raleway':          'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap',
  'Space Mono':       'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
  'DM Serif Display': 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
  'Inter':            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'Barlow Condensed': 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&display=swap',
  'Black Han Sans':   'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap',
  'Fjalla One':       'https://fonts.googleapis.com/css2?family=Fjalla+One&display=swap',
  'Staatliches':      'https://fonts.googleapis.com/css2?family=Staatliches&display=swap',
  'Russo One':        'https://fonts.googleapis.com/css2?family=Russo+One&display=swap',
  'Teko':             'https://fonts.googleapis.com/css2?family=Teko:wght@300;400;500;600;700&display=swap',
  'Anton':            'https://fonts.googleapis.com/css2?family=Anton&display=swap',
};

export function getGoogleFontsUrl(fontFamily: string): string {
  return GOOGLE_FONTS_MAP[fontFamily] || '';
}

export { GOOGLE_FONTS_MAP };
