import type { RGBTuple, WeatherRenderParams } from '../weather/WeatherManager';

export interface PostProcessGrade {
  // Bloom parameters
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;

  // Tone & contrast shaping
  contrast: number;
  saturation: number;
  exposureTrim: number;

  // Color grading
  temperature: number; // -1 cool .. +1 warm
  tint: number; // -1 green/cyan .. +1 magenta
  shadowTint: RGBTuple; // Lift color applied to darks
  highlightTint: RGBTuple; // Gain color applied to brights
  vignetteIntensity: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
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

function rgb(r: number, g: number, b: number): RGBTuple {
  return { r, g, b };
}

/**
 * Evaluates base cinematic post-processing grade for the simulated Solara Bay time of day:
 * - Crisp sunlit tropical daylight (noon)
 * - Warm amber/coral filmic golden hour (sunrise / sunset)
 * - High-contrast neon-luminous coastal night
 */
function evaluateTimeGrade(hours: number): PostProcessGrade {
  const h = ((hours % 24) + 24) % 24;
  const sunAngle = ((h - 6) / 24) * Math.PI * 2;
  const elev = Math.sin(sunAngle); // -1 midnight .. +1 noon

  const dayGrade: PostProcessGrade = {
    bloomStrength: 0.24,
    bloomRadius: 0.36,
    bloomThreshold: 0.9,
    contrast: 1.07,
    saturation: 1.08,
    exposureTrim: 1.0,
    temperature: 0.08,
    tint: -0.02,
    shadowTint: rgb(0.96, 0.99, 1.04),
    highlightTint: rgb(1.03, 1.01, 0.97),
    vignetteIntensity: 0.16,
  };

  const goldenGrade: PostProcessGrade = {
    bloomStrength: 0.44,
    bloomRadius: 0.52,
    bloomThreshold: 0.78,
    contrast: 1.11,
    saturation: 1.15,
    exposureTrim: 1.02,
    temperature: 0.36,
    tint: 0.09,
    shadowTint: rgb(0.88, 0.93, 1.06),
    highlightTint: rgb(1.12, 1.01, 0.88),
    vignetteIntensity: 0.25,
  };

  const nightGrade: PostProcessGrade = {
    bloomStrength: 0.72,
    bloomRadius: 0.64,
    bloomThreshold: 0.58,
    contrast: 1.18,
    saturation: 1.14,
    exposureTrim: 1.04,
    temperature: -0.28,
    tint: 0.12,
    shadowTint: rgb(0.82, 0.9, 1.12),
    highlightTint: rgb(0.95, 1.04, 1.14),
    vignetteIntensity: 0.36,
  };

  if (elev >= 0.36) {
    return dayGrade;
  } else if (elev >= 0.0) {
    return blendGrades(goldenGrade, dayGrade, elev / 0.36);
  } else if (elev >= -0.22) {
    return blendGrades(goldenGrade, nightGrade, clamp(Math.abs(elev) / 0.22, 0, 1));
  }
  return nightGrade;
}

export function blendGrades(a: PostProcessGrade, b: PostProcessGrade, t: number): PostProcessGrade {
  const k = clamp(t, 0, 1);
  return {
    bloomStrength: lerp(a.bloomStrength, b.bloomStrength, k),
    bloomRadius: lerp(a.bloomRadius, b.bloomRadius, k),
    bloomThreshold: lerp(a.bloomThreshold, b.bloomThreshold, k),
    contrast: lerp(a.contrast, b.contrast, k),
    saturation: lerp(a.saturation, b.saturation, k),
    exposureTrim: lerp(a.exposureTrim, b.exposureTrim, k),
    temperature: lerp(a.temperature, b.temperature, k),
    tint: lerp(a.tint, b.tint, k),
    shadowTint: lerpRgb(a.shadowTint, b.shadowTint, k),
    highlightTint: lerpRgb(a.highlightTint, b.highlightTint, k),
    vignetteIntensity: lerp(a.vignetteIntensity, b.vignetteIntensity, k),
  };
}

/**
 * Computes the complete dynamic post-processing target (bloom, contrast, color grading)
 * combining current time of day with live WeatherManager atmospheric parameters.
 */
export function computePostProcessGrade(
  timeOfDayHours: number,
  weather: Pick<WeatherRenderParams, 'hazeFactor' | 'rainIntensity' | 'wetness'>
): PostProcessGrade {
  const base = evaluateTimeGrade(timeOfDayHours);
  const h = clamp(weather.hazeFactor, 0, 1);
  const r = clamp(weather.rainIntensity, 0, 1);
  const w = clamp(weather.wetness, 0, 1);

  // Hazy coastal mist: softer contrast, warmer sunlit dust halation, wider dreamy bloom
  const hazyTarget: PostProcessGrade = {
    bloomStrength: clamp(base.bloomStrength + 0.16, 0.15, 0.95),
    bloomRadius: clamp(base.bloomRadius + 0.22, 0.2, 0.95),
    bloomThreshold: clamp(base.bloomThreshold - 0.12, 0.45, 0.95),
    contrast: Math.max(0.88, base.contrast - 0.16),
    saturation: Math.max(0.78, base.saturation - 0.14),
    exposureTrim: base.exposureTrim * 1.03,
    temperature: clamp(base.temperature + 0.34, -1, 1),
    tint: clamp(base.tint + 0.04, -1, 1),
    shadowTint: lerpRgb(base.shadowTint, rgb(1.06, 1.0, 0.9), 0.55),
    highlightTint: lerpRgb(base.highlightTint, rgb(1.14, 1.04, 0.86), 0.65),
    vignetteIntensity: clamp(base.vignetteIntensity + 0.06, 0.1, 0.55),
  };

  const afterHaze = blendGrades(base, hazyTarget, h);

  // Rain storm: punchy moody contrast, cool teal-slate shadows, vivid wet-street neon bloom
  const rainTarget: PostProcessGrade = {
    bloomStrength: clamp(afterHaze.bloomStrength + 0.28 + w * 0.08, 0.2, 1.1),
    bloomRadius: clamp(afterHaze.bloomRadius + 0.16, 0.25, 0.95),
    bloomThreshold: clamp(afterHaze.bloomThreshold - 0.18, 0.42, 0.92),
    contrast: clamp(afterHaze.contrast + 0.12, 0.95, 1.32),
    saturation: clamp(afterHaze.saturation - 0.18, 0.72, 1.15),
    exposureTrim: afterHaze.exposureTrim * 0.95,
    temperature: clamp(afterHaze.temperature - 0.48, -1, 1),
    tint: clamp(afterHaze.tint - 0.06, -1, 1),
    shadowTint: lerpRgb(afterHaze.shadowTint, rgb(0.78, 0.9, 1.12), 0.72),
    highlightTint: lerpRgb(afterHaze.highlightTint, rgb(0.88, 1.02, 1.14), 0.68),
    vignetteIntensity: clamp(afterHaze.vignetteIntensity + 0.15, 0.15, 0.58),
  };

  return blendGrades(afterHaze, rainTarget, r);
}

export function stepPostProcessGrade(
  current: PostProcessGrade,
  target: PostProcessGrade,
  dt: number
): PostProcessGrade {
  const alpha = 1 - Math.exp(-3.4 * Math.max(0, Math.min(dt, 0.25)));
  return blendGrades(current, target, alpha);
}
