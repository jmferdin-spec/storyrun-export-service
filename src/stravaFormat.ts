import type { StravaAthlete, StravaActivity } from './types';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// ─── OAuth URLs ────────────────────────────────────────────────────────────────

export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

// ─── Token Exchange ────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: StravaAthlete;
  token_type: string;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava token exchange failed: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  return response.json();
}

// ─── API Helpers ───────────────────────────────────────────────────────────────

async function stravaFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${STRAVA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava API error ${response.status}: ${error}`);
  }

  return response.json();
}

// ─── API Methods ───────────────────────────────────────────────────────────────

export async function getAthlete(accessToken: string): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>('/athlete', accessToken);
}

export async function getActivities(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<StravaActivity[]> {
  const activities = await stravaFetch<StravaActivity[]>(
    `/athlete/activities?page=${page}&per_page=${perPage}`,
    accessToken
  );

  // Filter to running activities only
  return activities.filter(
    (activity) =>
      activity.type === 'Run' ||
      activity.sport_type === 'Run' ||
      activity.sport_type === 'TrailRun' ||
      activity.sport_type === 'VirtualRun'
  );
}

export async function getActivityById(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  return stravaFetch<StravaActivity>(`/activities/${activityId}`, accessToken);
}

// ─── Formatting Utilities ──────────────────────────────────────────────────────

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(2)} km`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDistanceValue(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond === 0) return '–';
  const secondsPerKm = 1000 / metersPerSecond;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function formatPaceValue(metersPerSecond: number): string {
  if (metersPerSecond === 0) return '–';
  const secondsPerKm = 1000 / metersPerSecond;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
