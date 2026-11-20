import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherManager, nextWeatherCondition } from './WeatherManager';

test('WeatherManager cycles clear -> hazy -> rain -> clear cleanly', () => {
  assert.equal(nextWeatherCondition('clear'), 'hazy');
  assert.equal(nextWeatherCondition('hazy'), 'rain');
  assert.equal(nextWeatherCondition('rain'), 'clear');

  const wm = new WeatherManager('clear');
  assert.equal(wm.cycleCondition(true), 'hazy');
  assert.equal(wm.cycleCondition(true), 'rain');
  assert.equal(wm.cycleCondition(true), 'clear');
});

test('WeatherManager updates fog, lighting, and wet road PBR properties per condition', () => {
  const wm = new WeatherManager('clear');
  const clearParams = wm.computeRenderParams(16.75);

  wm.snapTo('hazy');
  const hazyParams = wm.computeRenderParams(16.75);

  wm.snapTo('rain');
  const rainParams = wm.computeRenderParams(16.75);

  // Fog narrows progressively from clear -> hazy -> rain
  assert.ok(hazyParams.fogFar < clearParams.fogFar, 'hazy fogFar should be shorter than clear');
  assert.ok(rainParams.fogFar < hazyParams.fogFar, 'rain fogFar should be shorter than hazy');

  // Sun intensity dims in haze & rain while night/storm emissive glow boosts
  assert.ok(hazyParams.sunIntensity < clearParams.sunIntensity);
  assert.ok(rainParams.sunIntensity < hazyParams.sunIntensity);
  assert.ok(rainParams.emissiveBoost > clearParams.emissiveBoost);

  // Surface material properties react strongly to rain wetness
  assert.ok(clearParams.roadRoughness > 0.75, 'clear road should be dry/matte');
  assert.ok(rainParams.roadRoughness < 0.25, 'rain road should be glossy/wet');
  assert.ok(rainParams.roadMetalness > clearParams.roadMetalness + 0.25);
  assert.ok(rainParams.roadTint < 0.75, 'wet asphalt should darken');
  assert.ok(rainParams.sidewalkRoughness < clearParams.sidewalkRoughness - 0.4);
  assert.ok(rainParams.waveAmplitude > clearParams.waveAmplitude);
});

test('WeatherManager transitions smoothly over time toward target condition', () => {
  const wm = new WeatherManager('clear');
  wm.setCondition('rain', false);

  const mid = wm.update(0.25, 14.0);
  assert.ok(mid.rainIntensity > 0.1 && mid.rainIntensity < 0.9, 'rain should ramp smoothly, not snap');
  assert.ok(mid.wetness > 0.05 && mid.wetness < 0.9);

  let final = mid;
  for (let i = 0; i < 40; i++) {
    final = wm.update(0.2, 14.0);
  }
  assert.ok(final.rainIntensity > 0.98);
  assert.ok(final.wetness > 0.98);
});
