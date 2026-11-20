import { useGameStore } from '../state/useGameStore';
import { audioManager } from '../audio/AudioManager';
import { Play, Save, FolderOpen, Settings as SettingsIcon, Keyboard, Home } from 'lucide-react';

export function PauseMenu() {
  const money = useGameStore((s) => s.money);
  const completedMissions = useGameStore((s) => s.completedMissions);
  const districtName = useGameStore((s) => s.telemetry.districtName);
  const hasSaveFile = useGameStore((s) => s.hasSaveFile);
  const setScreen = useGameStore((s) => s.setScreen);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);

  const resume = () => {
    audioManager.setPaused(false);
    setScreen('playing');
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040914]/75 p-4">
      <div className="hud-panel rounded-lg w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-amber-500/25 pb-3">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-amber-400">
              SOLARA BAY · PAUSED
            </div>
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wider text-slate-50">
              PROJECT: COASTLINE
            </h2>
          </div>
          <span className="font-mono text-xs text-cyan-300">{districtName}</span>
        </div>

        {/* Snapshot Stats */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded bg-slate-900/90 border border-slate-700/70 py-2 px-2">
            <div className="text-[10px] font-display uppercase text-slate-400">Cash</div>
            <div className="hud-num font-display text-lg font-bold text-amber-400">
              ${money.toLocaleString()}
            </div>
          </div>
          <div className="rounded bg-slate-900/90 border border-slate-700/70 py-2 px-2">
            <div className="text-[10px] font-display uppercase text-slate-400">Missions</div>
            <div className="hud-num font-display text-lg font-bold text-cyan-300">
              {completedMissions.length}/5
            </div>
          </div>
          <div className="rounded bg-slate-900/90 border border-slate-700/70 py-2 px-2">
            <div className="text-[10px] font-display uppercase text-slate-400">City Slice</div>
            <div className="hud-num font-display text-lg font-bold text-emerald-400">Core</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={resume}
            className="w-full py-3 px-4 rounded bg-amber-500 hover:bg-amber-400 text-[#070e1a] font-display font-extrabold text-base uppercase tracking-wider flex items-center justify-between cursor-pointer"
          >
            <span>Resume Game</span>
            <Play size={17} className="fill-current" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => saveCurrentGame(false)}
              className="py-2.5 px-3.5 rounded bg-slate-900/90 border border-emerald-500/45 hover:bg-emerald-950/60 text-emerald-200 font-display text-sm uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={15} />
              <span>Save Game</span>
            </button>
            <button
              type="button"
              disabled={!hasSaveFile}
              onClick={() => continueSavedGame()}
              className={`py-2.5 px-3.5 rounded font-display text-sm uppercase font-bold flex items-center justify-center gap-2 border ${
                hasSaveFile
                  ? 'bg-slate-900/90 border-cyan-500/45 hover:bg-cyan-950/60 text-cyan-200 cursor-pointer'
                  : 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <FolderOpen size={15} />
              <span>Load Save</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setOverlay('settings')}
              className="py-2.5 px-3.5 rounded bg-slate-900/90 border border-slate-700 hover:border-amber-400/60 text-slate-200 font-display text-sm uppercase font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <SettingsIcon size={15} className="text-amber-400" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setOverlay('controls')}
              className="py-2.5 px-3.5 rounded bg-slate-900/90 border border-slate-700 hover:border-cyan-400/60 text-slate-200 font-display text-sm uppercase font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Keyboard size={15} className="text-cyan-400" />
              <span>Controls</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.setPaused(false);
              setScreen('title');
            }}
            className="w-full py-2.5 px-4 rounded bg-slate-900/80 border border-rose-500/35 hover:bg-rose-950/50 text-rose-200 font-display text-sm uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={15} />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
