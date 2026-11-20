export type WeatherCondition = 'clear' | 'hazy' | 'rain';

export interface RGBTuple {
  r: number;
  g: number;
  b: number;
}

export interface WeatherRenderParams {
  condition: WeatherCondition;
  wetness: number; // 0 (bone dry) .. 1 (rain-slick)
  hazeFactor: number; // 0 .. 1
  rainIntensity: number; // 0 .. 1
  cloudCover: number; // 0 .. 1

  // Sky dome & fog colors (normalized 0..1 RGB)
  zenithColor: RGBTuple;
  horizonColor: RGBTuple;
  sunGlowColor: RGBTuple;
  fogColor: RGBTuple;
  fogNear: number;
  fogFar: number;

  // Lighting parameters
  sunColor: RGBTuple;
  sunIntensity: number;
  hemiSkyColor: RGBTuple;
  hemiGroundColor: RGBTuple;
  hemiIntensity: number;
  rimColor: RGBTuple;
  rimIntensity: number;
  envIntensity: number;
  exposure: number;
  emissiveBoost: number;

  // Surface material PBR properties
  roadRoughness: number;
  roadMetalness: number;
  roadTint: number; // 1.0 dry -> 0.62 wet darkened asphalt
  sidewalkRoughness: number;
  sidewalkMetalness: number;
  sidewalkTint: number;
  glassRoughness: number;
  oceanRoughness: number;
  waveAmplitude: number;
  tireGripMultiplier: number;
}

const WEATHER_ORDER: WeatherCondition[] = ['clear', 'hazy', 'rain'];

function hexToRgb(hex: string): RGBTuple {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGBTuple, b: RGBTuple, t: number): RGBTuple {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

export function nextWeatherCondition(current: WeatherCondition): WeatherCondition {
  const idx = WEATHER_ORDER.indexOf(current);
  return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
}

interface TimePalette {
  zenith: RGBTuple;
  horizon: RGBTuple;
  sunGlow: RGBTuple;
  sun: RGBTuple;
  hemiSky: RGBTuple;
  hemiGround: RGBTuple;
  sunIntensity: number;
  hemiIntensity: number;
  nightFactor: number;
}

function evaluateTimeOfDayPalette(hours: number): TimePalette {
  const h = ((hours % 24) + 24) % 24;
  const sunAngle = ((h - 6) / 24) * Math.PI * 2;
  const elev = Math.sin(sunAngle); // -1 midnight .. +1 noon

  const dayPal: TimePalette = {
    zenith: hexToRgb('#1b6ec2'),
    horizon: hexToRgb('#8ed1f5'),
    sunGlow: hexToRgb('#fff5d6'),
    sun: hexToRgb('#fff4dc'),
    hemiSky: hexToRgb('#9bd7ff'),
    hemiGround: hexToRgb('#7a6c5a'),
    sunIntensity: 2.35,
    hemiIntensity: 1.05,
    nightFactor: 0,
  };

  const goldenPal: TimePalette = {
    zenith: hexToRgb('#24437a'),
    horizon: hexToRgb('#e58c5a'),
    sunGlow: hexToRgb('#ffd280'),
    sun: hexToRgb('#ffc67a'),
    hemiSky: hexToRgb('#7cb2e2'),
    hemiGround: hexToRgb('#6a5144'),
    sunIntensity: 2.45,
    hemiIntensity: 0.92,
    nightFactor: 0.45,
  };

  const nightPal: TimePalette = {
    zenith: hexToRgb('#040916'),
    horizon: hexToRgb('#0b172c'),
    sunGlow: hexToRgb('#38bdf8'),
    sun: hexToRgb('#72b8f0'),
    hemiSky: hexToRgb('#162d52'),
    hemiGround: hexToRgb('#09101d'),
    sunIntensity: 0.44,
    hemiIntensity: 0.42,
    nightFactor: 1.0,
  };

  if (elev >= 0.36) {
    return dayPal;
  } else if (elev >= 0.0) {
    // Blend golden hour <-> day
    const t = elev / 0.36;
    return {
      zenith: lerpRgb(goldenPal.zenith, dayPal.zenith, t),
      horizon: lerpRgb(goldenPal.horizon, dayPal.horizon, t),
      sunGlow: lerpRgb(goldenPal.sunGlow, dayPal.sunGlow, t),
      sun: lerpRgb(goldenPal.sun, dayPal.sun, t),
      hemiSky: lerpRgb(goldenPal.hemiSky, dayPal.hemiSky, t),
      hemiGround: lerpRgb(goldenPal.hemiGround, dayPal.hemiGround, t),
      sunIntensity: lerp(goldenPal.sunIntensity, dayPal.sunIntensity, t),
      hemiIntensity: lerp(goldenPal.hemiIntensity, dayPal.hemiIntensity, t),
      nightFactor: lerp(goldenPal.nightFactor, dayPal.nightFactor, t),
    };
  } else if (elev >= -0.22) {
    // Blend dusk/dawn <-> night
    const t = Math.min(1, Math.abs(elev) / 0.22);
    return {
      zenith: lerpRgb(goldenPal.zenith, nightPal.zenith, t),
      horizon: lerpRgb(goldenPal.horizon, nightPal.horizon, t),
      sunGlow: lerpRgb(goldenPal.sunGlow, nightPal.sunGlow, t),
      sun: lerpRgb(goldenPal.sun, nightPal.sun, t),
      hemiSky: lerpRgb(goldenPal.hemiSky, nightPal.hemiSky, t),
      hemiGround: lerpRgb(goldenPal.hemiGround, nightPal.hemiGround, t),
      sunIntensity: lerp(goldenPal.sunIntensity, nightPal.sunIntensity, t),
      hemiIntensity: lerp(goldenPal.hemiIntensity, nightPal.hemiIntensity, t),
      nightFactor: lerp(goldenPal.nightFactor, nightPal.nightFactor, t),
    };
  }
  return nightPal;
}

const HAZE_HORIZON = hexToRgb('#e2be96');
const HAZE_ZENITH = hexToRgb('#8a98ab');
const RAIN_HORIZON = hexToRgb('#304156');
const RAIN_ZENITH = hexToRgb('#141e2e');
const RAIN_SUN = hexToRgb('#94b4d2');
const RAIN_HEMI_SKY = hexToRgb('#4f6785');
const RAIN_HEMI_GROUND = hexToRgb('#202a38');
const RIM_CLEAR = hexToRgb('#7dd3fc');
const RIM_HAZE = hexToRgb('#f6c186');
const RIM_RAIN = hexToRgb('#67e8f9');

/**
 * Global Weather State Manager controlling smooth transitions between Clear, Hazy, and Rain
 * and computing cohesive atmospheric, lighting, and surface PBR material targets.
 */
export class WeatherManager {
  private targetCondition: WeatherCondition;
  private wetness = 0;
  private hazeFactor = 0;
  private rainIntensity = 0;
  private autoCycle = false;
  private autoCycleTimer = 0;
  private readonly autoCycleIntervalSec = 150;

  constructor(initial: WeatherCondition = 'clear') {
    this.targetCondition = initial;
    this.snapTo(initial);
  }

  public getCondition(): WeatherCondition {
    return this.targetCondition;
  }

  public setAutoCycle(enabled: boolean): void {
    this.autoCycle = enabled;
  }

  public isAutoCycle(): boolean {
    return this.autoCycle;
  }

  public setCondition(condition: WeatherCondition, immediate = false): void {
    this.targetCondition = condition;
    this.autoCycleTimer = 0;
    if (immediate) {
      this.snapTo(condition);
    }
  }

  public cycleCondition(immediate = false): WeatherCondition {
    const next = nextWeatherCondition(this.targetCondition);
    this.setCondition(next, immediate);
    return next;
  }

  public snapTo(condition: WeatherCondition): void {
    this.targetCondition = condition;
    this.hazeFactor = condition === 'hazy' ? 1 : condition === 'rain' ? 0.35 : 0;
    this.rainIntensity = condition === 'rain' ? 1 : 0;
    this.wetness = condition === 'rain' ? 1 : condition === 'hazy' ? 0.14 : 0;
  }

  public update(dt: number, timeOfDayHours: number): WeatherRenderParams {
    const clampedDt = Math.max(0, Math.min(dt, 0.25));

    if (this.autoCycle) {
      this.autoCycleTimer += clampedDt;
      if (this.autoCycleTimer >= this.autoCycleIntervalSec) {
        this.autoCycleTimer = 0;
        this.targetCondition = nextWeatherCondition(this.targetCondition);
      }
    }

    const goalHaze = this.targetCondition === 'hazy' ? 1 : this.targetCondition === 'rain' ? 0.35 : 0;
    const goalRain = this.targetCondition === 'rain' ? 1 : 0;
    const goalWet = this.targetCondition === 'rain' ? 1 : this.targetCondition === 'hazy' ? 0.14 : 0;

    // Smooth responsive atmospheric transition (wetness dries slightly slower than rain starts)
    const alpha = 1 - Math.exp(-3.0 * clampedDt);
    const wetAlpha = goalWet > this.wetness ? 1 - Math.exp(-2.4 * clampedDt) : 1 - Math.exp(-1.1 * clampedDt);

    this.hazeFactor = lerp(this.hazeFactor, goalHaze, alpha);
    this.rainIntensity = lerp(this.rainIntensity, goalRain, alpha);
    this.wetness = lerp(this.wetness, goalWet, wetAlpha);

    return this.computeRenderParams(timeOfDayHours);
  }

  public computeRenderParams(timeOfDayHours: number): WeatherRenderParams {
    const tod = evaluateTimeOfDayPalette(timeOfDayHours);
    const h = this.hazeFactor;
    const r = this.rainIntensity;
    const w = this.wetness;

    const nightDim = 1 - tod.nightFactor * 0.68;
    const hazeDim = 1 - tod.nightFactor * 0.58;
    const scaleRgb = (c: RGBTuple, s: number): RGBTuple => ({ r: c.r * s, g: c.g * s, b: c.b * s });

    const adjHazeZenith = scaleRgb(HAZE_ZENITH, hazeDim);
    const adjHazeHorizon = scaleRgb(HAZE_HORIZON, hazeDim);
    const adjRainZenith = scaleRgb(RAIN_ZENITH, nightDim);
    const adjRainHorizon = scaleRgb(RAIN_HORIZON, nightDim);
    const adjRainSun = scaleRgb(RAIN_SUN, nightDim);
    const adjRainHemiSky = scaleRgb(RAIN_HEMI_SKY, nightDim);
    const adjRainHemiGround = scaleRgb(RAIN_HEMI_GROUND, nightDim);

    // Blend sky & fog colors across Clear -> Hazy -> Rain (respecting day/night luminance)
    let zenith = lerpRgb(tod.zenith, adjHazeZenith, h * 0.58);
    zenith = lerpRgb(zenith, adjRainZenith, r * 0.78);

    let horizon = lerpRgb(tod.horizon, adjHazeHorizon, h * 0.65);
    horizon = lerpRgb(horizon, adjRainHorizon, r * 0.76);

    const sunGlow = lerpRgb(tod.sunGlow, adjRainSun, r * 0.85);
    const fogColor = lerpRgb(horizon, zenith, 0.14 + r * 0.18);

    // Fog distances narrow dramatically in Hazy & Rain
    const fogNear = lerp(lerp(170, 36, h), 28, r);
    const fogFar = lerp(lerp(660, 210, h), 175, r);

    // Lighting intensities & colors
    let sunColor = lerpRgb(tod.sun, adjHazeHorizon, h * 0.42);
    sunColor = lerpRgb(sunColor, adjRainSun, r * 0.8);
    const sunIntensity = tod.sunIntensity * (1 - h * 0.3) * (1 - r * 0.68);

    let hemiSky = lerpRgb(tod.hemiSky, adjHazeHorizon, h * 0.4);
    hemiSky = lerpRgb(hemiSky, adjRainHemiSky, r * 0.72);

    const hemiGround = lerpRgb(tod.hemiGround, adjRainHemiGround, r * 0.68);
    const hemiIntensity = tod.hemiIntensity * (1 + h * 0.06) * (1 - r * 0.22);

    let rimColor = lerpRgb(RIM_CLEAR, RIM_HAZE, h);
    rimColor = lerpRgb(rimColor, RIM_RAIN, r);
    const rimIntensity = lerp(0.36, 0.56, r) * (1 - tod.nightFactor * 0.48);

    // Studio IBL environment intensity drops sharply at night so wet surfaces don't glow white
    const baseEnv = lerp(0.76, 0.16, tod.nightFactor);
    const envIntensity = baseEnv * (1 - h * 0.16) * (1 - r * 0.28);

    const baseExposure = lerp(1.08, 0.94, tod.nightFactor);
    const exposure = baseExposure * lerp(lerp(1.0, 0.95, h), 0.88, r);
    const emissiveBoost = Math.min(1.85, tod.nightFactor * 1.25 + h * 0.25 + r * 0.78);

    // Surface PBR material responses (dry matte -> rain-slick sheen)
    const roadRoughness = lerp(0.86, 0.18, w);
    const roadMetalness = lerp(0.05, 0.36, w);
    const roadTint = lerp(1.0, 0.54, w);

    const sidewalkRoughness = lerp(0.88, 0.38, w);
    const sidewalkMetalness = lerp(0.02, 0.14, w);
    const sidewalkTint = lerp(1.0, 0.72, w);

    const glassRoughness = lerp(0.16, 0.06, w);
    const oceanRoughness = lerp(0.18, 0.09, w);
    const waveAmplitude = lerp(1.0, 2.2, r);
    const tireGripMultiplier = lerp(1.0, 0.82, w);

    return {
      condition: this.targetCondition,
      wetness: w,
      hazeFactor: h,
      rainIntensity: r,
      cloudCover: Math.min(1, 0.18 + h * 0.42 + r * 0.8),
      zenithColor: zenith,
      horizonColor: horizon,
      sunGlowColor: sunGlow,
      fogColor,
      fogNear,
      fogFar,
      sunColor,
      sunIntensity,
      hemiSkyColor: hemiSky,
      hemiGroundColor: hemiGround,
      hemiIntensity,
      rimColor,
      rimIntensity,
      envIntensity,
      exposure,
      emissiveBoost,
      roadRoughness,
      roadMetalness,
      roadTint,
      sidewalkRoughness,
      sidewalkMetalness,
      sidewalkTint,
      glassRoughness,
      oceanRoughness,
      waveAmplitude,
      tireGripMultiplier,
    };
  }
}
