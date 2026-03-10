import type { LatLng, RouteRenderOptions } from './types';
import { decodePolyline, getBounds, simplifyPolyline } from './polylineDecoder';

export function polylineToSvgPath(
  encodedPolyline: string,
  options: RouteRenderOptions
): string {
  const { width, height, padding } = options;
  const points = decodePolyline(encodedPolyline);
  if (points.length < 2) return '';

  const simplified = simplifyPolyline(points, 0.00003);
  const bounds = getBounds(simplified);

  const padW = padding;
  const padH = padding;
  const drawW = width - padW * 2;
  const drawH = height - padH * 2;

  const latRange = bounds.maxLat - bounds.minLat || 0.0001;
  const lngRange = bounds.maxLng - bounds.minLng || 0.0001;

  const scaleX = drawW / lngRange;
  const scaleY = drawH / latRange;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padW + (drawW - lngRange * scale) / 2;
  const offsetY = padH + (drawH - latRange * scale) / 2;

  const coords = simplified.map((point) => ({
    x: (point.lng - bounds.minLng) * scale + offsetX,
    y: height - ((point.lat - bounds.minLat) * scale + offsetY),
  }));

  let pathData = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    pathData += ` Q ${cpx.toFixed(2)} ${cpy.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  return pathData;
}

/**
 * Generates a multi-layer SVG with configurable glow intensity.
 * glowIntensity: 0 = no glow, 1 = subtle, 2 = neon, 3 = intense bloom
 */
export function generateRouteSvg(
  encodedPolyline: string,
  options: RouteRenderOptions
): string {
  const { width, height, color, thickness, opacity, glowIntensity = 1 } = options;

  const pathData = polylineToSvgPath(encodedPolyline, options);
  if (!pathData) return '';

  const id = `r${Math.random().toString(36).slice(2, 8)}`;
  const glowBlur = thickness * (1.5 + glowIntensity * 2.5);
  const outerBlur = thickness * (3 + glowIntensity * 4);
  const glowOpacity = 0.15 + glowIntensity * 0.15;
  const outerOpacity = 0.06 + glowIntensity * 0.08;

  // project endpoints
  const points = decodePolyline(encodedPolyline);
  const allPoints = points;
  const startPt = points.length ? projectPoint(points[0], allPoints, options) : { x: 0, y: 0 };
  const endPt = points.length ? projectPoint(points[points.length - 1], allPoints, options) : { x: 0, y: 0 };

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
    style="position:absolute;top:0;left:0;pointer-events:none;overflow:visible;"
  >
    <defs>
      <filter id="${id}-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${glowBlur}" result="blur1"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="${glowBlur * 0.4}" result="blur2"/>
        <feMerge>
          <feMergeNode in="blur1"/>
          <feMergeNode in="blur2"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="${id}-outer" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${outerBlur}" result="outerBlur"/>
        <feColorMatrix in="outerBlur" type="saturate" values="3" result="saturated"/>
        <feMerge>
          <feMergeNode in="saturated"/>
        </feMerge>
      </filter>
      <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="${thickness}" flood-color="rgba(0,0,0,0.6)"/>
      </filter>
      <linearGradient id="${id}-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.7"/>
        <stop offset="50%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.8"/>
      </linearGradient>
    </defs>

    ${glowIntensity > 0 ? `
    <!-- Outer bloom -->
    <path d="${pathData}" fill="none" stroke="${color}"
      stroke-width="${thickness * 6}" stroke-linecap="round" stroke-linejoin="round"
      opacity="${outerOpacity * opacity}" filter="url(#${id}-outer)"/>

    <!-- Inner glow halo -->
    <path d="${pathData}" fill="none" stroke="${color}"
      stroke-width="${thickness * 3}" stroke-linecap="round" stroke-linejoin="round"
      opacity="${glowOpacity * opacity}" filter="url(#${id}-glow)"/>
    ` : ''}

    <!-- Drop shadow for depth -->
    <path d="${pathData}" fill="none" stroke="rgba(0,0,0,0.4)"
      stroke-width="${thickness + 1.5}" stroke-linecap="round" stroke-linejoin="round"
      filter="url(#${id}-shadow)" opacity="${opacity * 0.5}"/>

    <!-- Core route line with gradient -->
    <path d="${pathData}" fill="none" stroke="url(#${id}-line-grad)"
      stroke-width="${thickness}" stroke-linecap="round" stroke-linejoin="round"
      opacity="${opacity}"/>

    <!-- Bright core highlight -->
    <path d="${pathData}" fill="none" stroke="rgba(255,255,255,0.4)"
      stroke-width="${Math.max(1, thickness * 0.3)}" stroke-linecap="round" stroke-linejoin="round"
      opacity="${opacity * 0.6}"/>

    <!-- Start marker -->
    ${glowIntensity > 0 ? `<circle cx="${startPt.x}" cy="${startPt.y}" r="${thickness * 4}"
      fill="${color}" opacity="${opacity * 0.2}" filter="url(#${id}-glow)"/>` : ''}
    <circle cx="${startPt.x}" cy="${startPt.y}" r="${thickness * 1.8}"
      fill="${color}" opacity="${opacity}"/>
    <circle cx="${startPt.x}" cy="${startPt.y}" r="${thickness * 0.7}"
      fill="white" opacity="${opacity * 0.9}"/>

    <!-- End marker -->
    ${glowIntensity > 0 ? `<circle cx="${endPt.x}" cy="${endPt.y}" r="${thickness * 5}"
      fill="${color}" opacity="${opacity * 0.15}" filter="url(#${id}-glow)"/>` : ''}
    <circle cx="${endPt.x}" cy="${endPt.y}" r="${thickness * 2.5}"
      fill="white" stroke="${color}" stroke-width="${thickness * 0.9}"
      opacity="${opacity}"/>
    <circle cx="${endPt.x}" cy="${endPt.y}" r="${thickness * 1}"
      fill="${color}" opacity="${opacity * 0.8}"/>
  </svg>`;
}

function projectPoint(
  point: LatLng,
  allPoints: LatLng[],
  options: RouteRenderOptions
): { x: number; y: number } {
  const { width, height, padding } = options;
  const bounds = getBounds(allPoints);

  const padW = padding;
  const padH = padding;
  const drawW = width - padW * 2;
  const drawH = height - padH * 2;

  const latRange = bounds.maxLat - bounds.minLat || 0.0001;
  const lngRange = bounds.maxLng - bounds.minLng || 0.0001;

  const scaleX = drawW / lngRange;
  const scaleY = drawH / latRange;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padW + (drawW - lngRange * scale) / 2;
  const offsetY = padH + (drawH - latRange * scale) / 2;

  return {
    x: (point.lng - bounds.minLng) * scale + offsetX,
    y: height - ((point.lat - bounds.minLat) * scale + offsetY),
  };
}
