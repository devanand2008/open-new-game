import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherManager } from '../weather/WeatherManager';
import { computePostProcessGrade, stepPostProcessGrade } from './PostProcessGrade';

describe('PostProcessGrade', () => {
  it('increases bloom and shifts to cool neon-night grading after sunset', () => {
    const wm = new WeatherManager('clear');
    const clearParams = wm.computeRenderParams(12.0);
    const noonGrade = computePostProcessGrade(12.0, clearParams);
    const goldenGrade = computePostProcessGrade(17.5, clearParams);
    const nightGrade = computePostProcessGrade(22.5, clearParams);

    assert.ok(goldenGrade.bloomStrength > noonGrade.bloomStrength, 'Golden hour bloom should exceed noon');
    assert.ok(nightGrade.bloomStrength > goldenGrade.bloomStrength, 'Night bloom should exceed golden hour');
    assert.ok(nightGrade.bloomThreshold < noonGrade.bloomThreshold, 'Night bloom threshold should be lower for neon');
    assert.ok(goldenGrade.temperature > noonGrade.temperature, 'Golden hour should be warmer than noon');
    assert.ok(nightGrade.temperature < 0, 'Night temperature should lean cool');
    assert.ok(nightGrade.contrast > noonGrade.contrast, 'Night should have higher contrast');
  });

  it('softens contrast and warms color grade during Hazy weather', () => {
    const clearWm = new WeatherManager('clear');
    const hazyWm = new WeatherManager('hazy');

    const clearGrade = computePostProcessGrade(13.0, clearWm.computeRenderParams(13.0));
    const hazyGrade = computePostProcessGrade(13.0, hazyWm.computeRenderParams(13.0));

    assert.ok(hazyGrade.contrast < clearGrade.contrast, 'Hazy weather should reduce contrast');
    assert.ok(hazyGrade.temperature > clearGrade.temperature, 'Hazy weather should warm the grade');
    assert.ok(hazyGrade.bloomRadius > clearGrade.bloomRadius, 'Hazy mist should widen bloom halation radius');
  });

  it('boosts storm contrast, wet-street bloom, and cools color grading during Rain', () => {
    const clearWm = new WeatherManager('clear');
    const rainWm = new WeatherManager('rain');

    const clearGrade = computePostProcessGrade(16.75, clearWm.computeRenderParams(16.75));
    const rainGrade = computePostProcessGrade(16.75, rainWm.computeRenderParams(16.75));

    assert.ok(rainGrade.bloomStrength > clearGrade.bloomStrength, 'Rain should boost neon/wet-surface bloom');
    assert.ok(rainGrade.temperature < clearGrade.temperature, 'Rain should cool color temperature');
    assert.ok(rainGrade.saturation < clearGrade.saturation, 'Rain should slightly desaturate ambient tones');
    assert.ok(rainGrade.vignetteIntensity > clearGrade.vignetteIntensity, 'Rain should deepen atmospheric vignette');
    assert.ok(rainGrade.shadowTint.b > rainGrade.shadowTint.r, 'Rain shadow tint should lean cool blue');
  });

  it('smoothly interpolates grade over time via stepPostProcessGrade', () => {
    const clearWm = new WeatherManager('clear');
    const rainWm = new WeatherManager('rain');
    const start = computePostProcessGrade(12.0, clearWm.computeRenderParams(12.0));
    const target = computePostProcessGrade(22.0, rainWm.computeRenderParams(22.0));

    const mid = stepPostProcessGrade(start, target, 0.2);
    assert.ok(mid.bloomStrength > start.bloomStrength && mid.bloomStrength < target.bloomStrength);
    assert.ok(mid.temperature < start.temperature && mid.temperature > target.temperature);
  });
});
