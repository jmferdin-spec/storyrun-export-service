// ─── Strava Types ─────────────────────────────────────────────────────────────

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string;
  country: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  map: {
    id: string;
    summary_polyline: string;
    polyline?: string;
  };
  kudos_count: number;
  achievement_count: number;
  athlete_count: number;
  photos?: {
    count: number;
    primary?: { urls: Record<string, string> };
  };
}

// ─── Story Config Types ────────────────────────────────────────────────────────

export type TemplateId =
  | 'minimal-bottom'
  | 'large-center'
  | 'route-focus'
  | 'gradient-bar'
  | 'athlete-poster';

export type FontFamily =
  | 'Inter'
  | 'Bebas Neue'
  | 'Oswald'
  | 'Montserrat'
  | 'Raleway'
  | 'Space Mono'
  | 'DM Serif Display'
  | 'Barlow Condensed'
  | 'Black Han Sans'
  | 'Fjalla One'
  | 'Staatliches'
  | 'Russo One'
  | 'Teko'
  | 'Anton';

export type FontWeight = '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type StatAlignment = 'left' | 'center' | 'right';

export type RoutePosition = 'top' | 'middle' | 'bottom' | 'background';

export type OverlayType =
  | 'solid'
  | 'gradient-bottom'
  | 'gradient-top'
  | 'vignette'
  | 'cinematic'
  | 'duotone';

export interface StatPosition {
  x: number;
  y: number;
}

export interface StatVisibility {
  distance: boolean;
  time: boolean;
  pace: boolean;
  elevation: boolean;
  date: boolean;
}

export interface StoryConfig {
  activity: StravaActivity | null;
  backgroundImage: string | null;
  templateId: TemplateId;
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: FontWeight;
  letterSpacing: number;
  statColor: string;
  labelColor: string;
  overlayColor: string;
  overlayOpacity: number;
  overlayType: OverlayType;
  accentColor: string;
  gradientStartColor: string;
  gradientEndColor: string;
  visibleStats: StatVisibility;
  statAlignment: StatAlignment;
  statPosition: StatPosition;
  useAbsolutePosition: boolean;
  showRoute: boolean;
  routeColor: string;
  routeThickness: number;
  routeOpacity: number;
  routePosition: RoutePosition;
  routeGlowIntensity: number;
  statVerticalOffset: number;
}

export interface StoryTemplate {
  id: TemplateId;
  name: string;
  description: string;
  thumbnail: string;
  defaults: Partial<StoryConfig>;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteRenderOptions {
  width: number;
  height: number;
  color: string;
  thickness: number;
  opacity: number;
  padding: number;
  glowIntensity?: number;
}

export interface ExportOptions {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality: number;
}

export interface GenerateStoryRequest {
  config: StoryConfig;
  html: string;
}

export const GRID_SIZE = 120;
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
