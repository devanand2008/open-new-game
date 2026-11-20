import { useEffect, useState } from 'react';
import {
  Camera,
  CloudFog,
  CloudRain,
  Map as MapIcon,
  Pause,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  UserRoundCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';
import type { InputManager } from '../input/InputManager';

function formatClock(hours: number): string {
  const totalMin = Math.floor(hours * 60) % (24 * 60);
  const h24 = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

interface HUDProps {
  input: InputManager | null;
}

export function HUD({ input }: HUDProps) {
  const telemetry = useGameStore((s) => s.telemetry);
  const money = useGameStore((s) => s.money);
  const character = useGameStore((s) => s.character);
  const mission = useGameStore((s) => s.mission);
  const settings = useGameStore((s) => s.settings);
  const toast = useGameStore((s) => s.toast);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const setPhoneTab = useGameStore((s) => s.setPhoneTab);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const switchCharacter = useGameStore((s) => s.switchCharacter);
  const weather = useGameStore((s) => s.weather);
  const cycleWeather = useGameStore((s) => s.cycleWeather);
  const engine = useGameStore((s) => s.engine);

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const small = window.innerWidth <= 768;
      setIsTouchDevice(coarse || small);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showTouch =
    settings.touchControls === 'on' || (settings.touchControls === 'auto' && isTouchDevice);
  const textScale = settings.fontScale === 'large' ? 'text-sm' : 'text-xs';

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* TOP BAR: Mission Objective (Left) & Compact Utility Buttons (Right) */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Active Mission & Wanted Stars */}
        <div className="flex flex-col gap-2 max-w-[300px] sm:max-w-[350px]">
          <div className="hud-panel rounded-md px-3.5 py-2.5 border-l-4 border-l-amber-400">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-display text-[11px] font-bold uppercase tracking-widest text-amber-400">
                {mission.missionId ? `MISSION ${mission.missionId}` : 'SOLARA BAY FREE ROAM'}
              </span>
              {mission.timeRemaining !== null && (
                <span className="hud-num font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40">
                  {Math.ceil(mission.timeRemaining)}s
                </span>
              )}
            </div>
            <p className={`text-slate-100 leading-snug font-medium ${textScale}`}>
              {mission.objectiveText}
            </p>
            {mission.totalLaps > 0 && mission.stepIndex > 0 && (
              <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono text-cyan-300 hud-num">
                <span>LAP {mission.lap}/{mission.totalLaps}</span>
                <span>CP {mission.checkpointIndex}/{mission.totalCheckpoints}</span>
              </div>
            )}
          </div>

          {/* Police Wanted Stars (only rendered when wanted > 0) */}
          {telemetry.wantedLevel > 0 && (
            <div className="hud-panel rounded-md px-3 py-1.5 flex items-center gap-2 border-l-4 border-l-rose-500 self-start">
              <div className="flex items-center gap-1" aria-label={`Wanted level ${telemetry.wantedLevel}`}>
                {[1, 2, 3].map((lvl) => (
                  <Star
                    key={lvl}
                    size={15}
                    className={
                      lvl <= telemetry.wantedLevel
                        ? 'fill-amber-400 text-amber-300'
                        : 'text-slate-600'
                    }
                  />
                ))}
              </div>
              <span className="font-display text-[11px] uppercase tracking-wider font-bold text-rose-300">
                {telemetry.wantedEvading ? 'EVADING SBPD' : 'SBPD PURSUIT'}
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Compact Utility Icon Buttons (Map, Phone, Switch Char, Cam, Mute, Pause) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setOverlay('map');
            }}
            title="World Map (M)"
            aria-label="Open World Map"
            className="hud-panel-cyan w-9 h-9 rounded flex items-center justify-center text-cyan-300 hover:bg-cyan-950/80 transition-colors cursor-pointer"
          >
            <MapIcon size={17} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setPhoneTab('missions');
              setOverlay('phone');
            }}
            title="Solara Phone & Missions (Tab)"
            aria-label="Open Solara Phone"
            className="hud-panel w-9 h-9 rounded flex items-center justify-center text-amber-300 hover:bg-amber-950/70 transition-colors cursor-pointer"
          >
            <Smartphone size={17} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-social-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setPhoneTab('social');
              setOverlay('phone');
            }}
            title="SolaraPulse Social Feed & 3D Camera"
            aria-label="Open SolaraPulse Social Feed"
            className="hud-panel px-2.5 h-9 rounded flex items-center gap-1.5 text-fuchsia-300 hover:bg-fuchsia-950/70 transition-colors cursor-pointer"
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline font-display text-xs uppercase font-bold tracking-wider">
              Pulse
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-weather-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              cycleWeather();
            }}
            title={`Weather: ${weather.toUpperCase()} — Press [V] to cycle`}
            aria-label="Cycle Weather"
            className="hud-panel px-2.5 h-9 rounded flex items-center gap-1.5 text-slate-100 hover:bg-slate-800/90 transition-colors cursor-pointer"
          >
            {weather === 'clear' ? (
              <Sun size={15} className="text-amber-400" />
            ) : weather === 'hazy' ? (
              <CloudFog size={15} className="text-amber-200" />
            ) : (
              <CloudRain size={15} className="text-cyan-400" />
            )}
            <span className="hidden sm:inline font-display text-xs uppercase font-bold tracking-wider">
              {weather}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              switchCharacter(character === 'marco' ? 'lena' : 'marco');
            }}
            title="Switch Protagonist: Marco / Lena (Q)"
            aria-label="Switch Protagonist"
            className="hud-panel px-2.5 h-9 rounded flex items-center gap-1.5 text-slate-100 hover:bg-slate-800/90 transition-colors cursor-pointer"
          >
            <UserRoundCheck size={15} className={character === 'lena' ? 'text-fuchsia-400' : 'text-amber-400'} />
            <span className="hidden sm:inline font-display text-xs uppercase font-bold tracking-wider">
              {character === 'marco' ? 'Marco' : 'Lena'}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              engine.cycleCamera?.();
            }}
            title={`Camera: ${telemetry.cameraModeName} (C)`}
            aria-label="Cycle Camera View"
            className="hud-panel w-9 h-9 rounded flex items-center justify-center text-slate-200 hover:bg-slate-800/90 transition-colors cursor-pointer"
          >
            <Camera size={16} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              toggleMute();
            }}
            title={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            className="hud-panel w-9 h-9 rounded flex items-center justify-center text-slate-200 hover:bg-slate-800/90 transition-colors cursor-pointer"
          >
            {settings.muted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setScreen('paused');
            }}
            title="Pause Game (Esc)"
            aria-label="Pause Game"
            className="hud-panel w-9 h-9 rounded flex items-center justify-center text-amber-300 hover:bg-amber-950/70 transition-colors cursor-pointer"
          >
            <Pause size={16} />
          </button>
        </div>
      </div>

      {/* CENTER-TOP TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div
            className={`px-4 py-1.5 rounded bg-[#08101e]/95 border text-xs font-display uppercase tracking-wider font-semibold shadow-xl ${
              toast.accent === 'cyan'
                ? 'border-cyan-400/60 text-cyan-200'
                : toast.accent === 'emerald'
                  ? 'border-emerald-400/60 text-emerald-200'
                  : toast.accent === 'magenta'
                    ? 'border-fuchsia-400/60 text-fuchsia-200'
                    : 'border-amber-400/60 text-amber-200'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* CONTEXTUAL ACTION PROMPT (Center-Lower, unobstructed center playfield) */}
      {telemetry.nearbyPrompt && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              engine.triggerInteract?.();
            }}
            className="hud-panel rounded-md px-4 py-2 flex items-center gap-3 hover:border-amber-400 transition-colors cursor-pointer"
          >
            <span className="w-7 h-7 rounded bg-amber-400 text-[#070e1a] font-display font-extrabold text-sm flex items-center justify-center">
              E
            </span>
            <div className="text-left">
              <div className="font-display text-sm font-bold uppercase tracking-wide text-slate-100 leading-tight">
                {telemetry.nearbyPrompt.label}
              </div>
              <div className="text-[11px] text-amber-300/90 leading-tight">
                {telemetry.nearbyPrompt.sublabel}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* BOTTOM ROW: Minimap (Left), Vitals & Cash (Center), Vehicle Speedometer (Right) */}
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {/* Bottom-Left: Circular 2D Live Minimap */}
        <Minimap />

        {/* Bottom-Center: Compact Vitals, Money, Clock */}
        <div className="hud-panel rounded-md px-2.5 sm:px-3.5 py-2 flex items-center gap-2.5 sm:gap-4 shrink min-w-0">
          <div className="flex flex-col gap-1 min-w-[78px] sm:min-w-[116px]">
            <div className="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-slate-300">
              <span>HP</span>
              <span className="hud-num font-mono text-emerald-300">{telemetry.health}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${telemetry.health}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-slate-300 mt-0.5">
              <span>STM</span>
              <span className="hud-num font-mono text-cyan-300">{telemetry.stamina}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-100"
                style={{ width: `${telemetry.stamina}%` }}
              />
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700/70 shrink-0" />

          <div className="flex flex-col items-end shrink-0">
            <div
              data-testid="hud-money"
              className="hud-num font-display text-lg sm:text-xl font-extrabold text-amber-400 leading-none"
            >
              ${money.toLocaleString()}
            </div>
            <div className="hud-num font-mono text-[10px] sm:text-[11px] text-slate-300 mt-1 whitespace-nowrap">
              {formatClock(telemetry.timeOfDayHours)}
            </div>
          </div>
        </div>

        {/* Bottom-Right: Vehicle Speedometer & Gear (or compact controls hint when on foot) */}
        <div className="hidden sm:flex min-w-[148px] justify-end">
          {telemetry.inVehicle ? (
            <div
              data-testid="vehicle-speedometer"
              className="hud-panel-cyan rounded-md px-4 py-2.5 flex items-end gap-3.5"
            >
              <div className="text-right">
                <div className="font-display text-[10px] uppercase tracking-widest text-cyan-300">
                  {telemetry.vehicleName}
                </div>
                <div className="flex items-baseline justify-end gap-1 mt-0.5">
                  <span className="hud-num font-display text-3xl font-extrabold text-slate-50 leading-none">
                    {telemetry.speedKmh}
                  </span>
                  <span className="font-display text-[11px] uppercase text-slate-400">KM/H</span>
                </div>
                <div className="mt-1.5 h-1.5 w-28 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${telemetry.vehicleHealth > 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${telemetry.vehicleHealth}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-display text-[10px] uppercase text-slate-400">GEAR</span>
                <span className="hud-num font-display text-2xl font-extrabold text-amber-400 leading-none mt-0.5">
                  {telemetry.gear}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex hud-panel rounded px-3 py-1.5 text-[11px] text-slate-300 font-mono gap-2">
              <span className="text-amber-400">WASD</span> Move
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">E</span> Car/Use
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400">V</span> Weather
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400">M</span> Map
            </div>
          )}
        </div>
      </div>

      {showTouch && <TouchControls input={input} />}
    </div>
  );
}
