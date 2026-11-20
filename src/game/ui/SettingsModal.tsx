import { X, Trophy, AlertTriangle, RotateCcw } from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import type { GraphicsPreset } from '../save/SaveManager';
import type { WeatherCondition } from '../weather/WeatherManager';

export function SettingsModal() {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const weather = useGameStore((s) => s.weather);
  const setWeather = useGameStore((s) => s.setWeather);
  const engine = useGameStore((s) => s.engine);
  const setOverlay = useGameStore((s) => s.setOverlay);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040914]/82 p-4">
      <div className="hud-panel rounded-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/25">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-amber-400">
              SYSTEM CONFIGURATION
            </div>
            <h2 className="font-display text-xl font-extrabold uppercase text-slate-50">
              Graphics, Audio & Accessibility
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOverlay(null)}
            aria-label="Close Settings"
            className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Global Weather Condition */}
          <div>
            <div className="font-display uppercase tracking-wider text-slate-300 mb-1.5">
              Solara Bay Weather (Atmosphere, Lighting &amp; Wet PBR Surfaces)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['clear', 'hazy', 'rain'] as WeatherCondition[]).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setWeather(cond)}
                  className={`py-2 rounded font-display uppercase font-bold tracking-wider border cursor-pointer ${
                    weather === cond
                      ? 'bg-cyan-500 text-[#070e1a] border-cyan-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400/50'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Time of Day Presets (drives SkyDome, Lighting & Post-Processing Color Grade) */}
          <div>
            <div className="font-display uppercase tracking-wider text-slate-300 mb-1.5">
              Time of Day (Dynamic Bloom &amp; Filmic Color Grading)
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['Dawn', 6.5],
                  ['Noon', 12.5],
                  ['Golden', 17.25],
                  ['Night', 22.5],
                ] as Array<[string, number]>
              ).map(([label, hrs]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => engine.setTimeOfDayHours?.(hrs)}
                  className="py-1.5 rounded font-display uppercase font-bold tracking-wider border bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality */}
          <div>
            <div className="font-display uppercase tracking-wider text-slate-300 mb-1.5">
              Graphics Quality (Shadows, Pixel Ratio & Traffic Density)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as GraphicsPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateSettings({ graphicsPreset: preset })}
                  className={`py-2 rounded font-display uppercase font-bold tracking-wider border cursor-pointer ${
                    settings.graphicsPreset === preset
                      ? 'bg-amber-500 text-[#070e1a] border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300">
              <span>Building Brightness &amp; Interior Lighting</span>
              <span className="font-mono text-amber-300">
                {Math.round((settings.buildingBrightness ?? 1.12) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.75}
              max={1.45}
              step={0.05}
              value={settings.buildingBrightness ?? 1.12}
              onChange={(e) => updateSettings({ buildingBrightness: Number(e.target.value) })}
              className="accent-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300">
              <span>Render Resolution Scale</span>
              <span className="font-mono text-cyan-300">{Math.round(settings.resolutionScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.0}
              step={0.05}
              value={settings.resolutionScale}
              onChange={(e) => updateSettings({ resolutionScale: Number(e.target.value) })}
              className="accent-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300">
              <span>Master Volume</span>
              <span className="font-mono text-cyan-300">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => updateSettings({ masterVolume: Number(e.target.value) })}
              className="accent-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300">
              <span>Camera Orbit Sensitivity</span>
              <span className="font-mono text-cyan-300">{settings.mouseSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.0}
              step={0.1}
              value={settings.mouseSensitivity}
              onChange={(e) => updateSettings({ mouseSensitivity: Number(e.target.value) })}
              className="accent-cyan-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300">
              <span>Day/Night Cycle Speed</span>
              <span className="font-mono text-amber-300">{settings.daySpeedMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              step={0.5}
              value={settings.daySpeedMultiplier}
              onChange={(e) => updateSettings({ daySpeedMultiplier: Number(e.target.value) })}
              className="accent-amber-400"
            />
          </label>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => updateSettings({ minimapRotate: !settings.minimapRotate })}
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">Minimap Mode</span>
              <span className="font-mono text-cyan-300">{settings.minimapRotate ? 'Rotate' : 'North-Up'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  touchControls:
                    settings.touchControls === 'auto'
                      ? 'on'
                      : settings.touchControls === 'on'
                        ? 'off'
                        : 'auto',
                })
              }
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">Touch UI</span>
              <span className="font-mono text-amber-300 uppercase">{settings.touchControls}</span>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ reducedCameraShake: !settings.reducedCameraShake })}
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">Reduced Shake</span>
              <span className="font-mono text-emerald-300">{settings.reducedCameraShake ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateSettings({ fontScale: settings.fontScale === 'normal' ? 'large' : 'normal' })
              }
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">HUD Font Size</span>
              <span className="font-mono text-cyan-300 uppercase">{settings.fontScale}</span>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ postProcessing: !settings.postProcessing })}
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">Post-FX Shaders</span>
              <span className="font-mono text-amber-300">{settings.postProcessing ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ autoWeatherCycle: !settings.autoWeatherCycle })}
              className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-200">Auto Weather</span>
              <span className="font-mono text-cyan-300">{settings.autoWeatherCycle ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlsModal() {
  const setOverlay = useGameStore((s) => s.setOverlay);

  const bindings: Array<[string, string]> = [
    ['W A S D / Arrows', 'Walk, Run, or Drive & Steer'],
    ['Shift', 'Sprint (consumes stamina)'],
    ['Space', 'Jump (On Foot) · Handbrake Drift (Driving)'],
    ['E', 'Enter / Exit Vehicle or Interact with Shops & NPCs'],
    ['Mouse Drag + Wheel', 'Orbit 3rd-Person Camera & Zoom'],
    ['C', 'Cycle Camera Distance (Standard / Close / Cinematic)'],
    ['Q', 'Quick-Switch Protagonist (Marco Vega ↔ Lena Park)'],
    ['V', 'Cycle Global Weather (Clear ↔ Hazy ↔ Rain)'],
    ['T', 'Advance Time of Day (+4 Hours: Dawn / Noon / Golden / Night)'],
    ['M', 'Open Full Solara Bay World Map & A* Waypoints'],
    ['Tab', 'Open Solara Phone (Missions M01–M05, Crew, Messages)'],
    ['Esc / P', 'Pause Game / Close Overlay'],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040914]/82 p-4">
      <div className="hud-panel-cyan rounded-xl w-full max-w-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-cyan-500/25 pb-3">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-cyan-400">
              KEYBOARD, MOUSE, TOUCH & GAMEPAD
            </div>
            <h2 className="font-display text-xl font-extrabold uppercase text-slate-50">
              Controls Reference
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOverlay(null)}
            aria-label="Close Controls"
            className="w-8 h-8 rounded bg-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {bindings.map(([k, desc]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs"
            >
              <span className="font-mono font-bold text-amber-400 shrink-0">{k}</span>
              <span className="text-slate-200 text-right">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OutcomeModal() {
  const outcome = useGameStore((s) => s.outcome);
  const setOutcome = useGameStore((s) => s.setOutcome);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const launchMission = useGameStore((s) => s.launchMission);

  if (!outcome) return null;
  const isWin = outcome.kind === 'mission_complete';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040914]/80 p-4">
      <div
        className={`rounded-xl w-full max-w-md p-6 flex flex-col items-center text-center gap-4 ${
          isWin ? 'hud-panel border-amber-400' : 'hud-panel border-rose-500'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isWin ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {isWin ? <Trophy size={28} /> : <AlertTriangle size={28} />}
        </div>

        <div>
          <div className="font-display text-xs uppercase tracking-widest text-cyan-400">
            SOLARA BAY DISPATCH
          </div>
          <h2 className="font-display text-3xl font-extrabold uppercase text-slate-50 mt-0.5">
            {outcome.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{outcome.subtitle}</p>
        </div>

        {isWin && outcome.reward > 0 && (
          <div className="px-5 py-2 rounded bg-emerald-950/70 border border-emerald-500/45 hud-num font-display text-2xl font-extrabold text-emerald-300">
            +${outcome.reward.toLocaleString()} EARNED
          </div>
        )}

        <div className="flex gap-2.5 w-full pt-2">
          {!isWin && outcome.missionId && (
            <button
              type="button"
              onClick={() => launchMission(outcome.missionId!)}
              className="flex-1 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-[#070e1a] font-display text-sm uppercase font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={15} /> Retry Mission
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOutcome(null);
              setOverlay(isWin ? 'phone' : null);
            }}
            className="flex-1 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070e1a] font-display text-sm uppercase font-extrabold cursor-pointer"
          >
            {isWin ? 'Next Mission (Phone)' : 'Continue Free Roam'}
          </button>
        </div>
      </div>
    </div>
  );
}
