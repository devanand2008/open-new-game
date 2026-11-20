import { useGameStore } from '../state/useGameStore';
import { Play, RotateCcw, Settings as SettingsIcon, Keyboard } from 'lucide-react';

export function TitleScreen() {
  const hasSaveFile = useGameStore((s) => s.hasSaveFile);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);
  const setOverlay = useGameStore((s) => s.setOverlay);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-12 pointer-events-none">
      {/* Subtle left-side scrim for crisp typography over the live 3D Solara Bay panorama */}
      <div
        className="fixed inset-y-0 left-0 w-full sm:w-[46%] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(7, 14, 26, 0.88) 0%, rgba(7, 14, 26, 0.62) 65%, rgba(7, 14, 26, 0) 100%)',
        }}
      />

      {/* Main Left-Third Title Lockup & Menu */}
      <div className="relative z-10 my-auto max-w-md pointer-events-auto flex flex-col items-start gap-7">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="w-full">
          <svg
            viewBox="0 0 420 132"
            className="w-full max-w-[390px] h-auto"
            role="img"
            aria-label="PROJECT: COASTLINE — Solara Bay"
          >
            {/* Geometric Sunset Horizon & Coastal Wave Emblem */}
            <rect x="2" y="10" width="54" height="4" fill="#f59e0b" />
            <rect x="64" y="10" width="18" height="4" fill="#22d3ee" />
            <rect x="88" y="10" width="10" height="4" fill="#e879f9" />

            <text
              x="2"
              y="40"
              fill="#fbbf24"
              fontSize="16"
              fontWeight="800"
              letterSpacing="7"
              fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
            >
              PROJECT:
            </text>

            <text
              x="0"
              y="92"
              fill="#f8fafc"
              stroke="#070e1a"
              strokeWidth="4"
              paintOrder="stroke fill"
              fontSize="60"
              fontWeight="900"
              letterSpacing="3"
              fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
            >
              COASTLINE
            </text>

            {/* Stylized coastal wave underline */}
            <path
              d="M2 106 L160 106 L174 114 L256 114 L268 106 L396 106"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
            />
            <text
              x="2"
              y="126"
              fill="#94a3b8"
              fontSize="13"
              fontWeight="700"
              letterSpacing="6"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              SOLARA BAY · OPEN WORLD
            </text>
          </svg>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              startNewGame();
            }}
            className="w-full py-3.5 px-5 rounded bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#070e1a] font-display font-extrabold text-lg uppercase tracking-wider flex items-center justify-between shadow-lg transition-all cursor-pointer"
          >
            <span>New Game</span>
            <Play size={18} className="fill-current" />
          </button>

          <button
            type="button"
            disabled={!hasSaveFile}
            onClick={(e) => {
              e.currentTarget.blur();
              continueSavedGame();
            }}
            className={`w-full py-3 px-5 rounded font-display font-bold text-base uppercase tracking-wider flex items-center justify-between border transition-colors ${
              hasSaveFile
                ? 'bg-[#08101e]/90 border-cyan-400/50 text-cyan-200 hover:bg-cyan-950/80 cursor-pointer'
                : 'bg-[#08101e]/55 border-slate-700/60 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <RotateCcw size={16} />
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setOverlay('settings')}
              className="py-2.5 px-3.5 rounded bg-[#08101e]/90 border border-slate-700/80 hover:border-amber-400/60 text-slate-200 font-display text-sm uppercase tracking-wider font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <SettingsIcon size={15} className="text-amber-400" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setOverlay('controls')}
              className="py-2.5 px-3.5 rounded bg-[#08101e]/90 border border-slate-700/80 hover:border-cyan-400/60 text-slate-200 font-display text-sm uppercase tracking-wider font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Keyboard size={15} className="text-cyan-400" />
              <span>Controls</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control-Hint Footer Line */}
      <div
        className="fixed inset-x-0 bottom-0 h-14 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(7, 14, 26, 0.82) 0%, rgba(7, 14, 26, 0) 100%)',
        }}
      />
      <div className="relative z-10 text-xs text-slate-200 font-mono tracking-wide">
        WASD Move / Drive · Shift Sprint · Space Jump / Handbrake · E Vehicle / Interact · M Map · Tab Phone · Esc Pause
      </div>
    </div>
  );
}
