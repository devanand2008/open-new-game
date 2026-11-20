import { useState } from 'react';
import { X, Cpu, RotateCw, CheckCircle2 } from 'lucide-react';
import {
  createSignalPuzzleGrid,
  evaluateSignalPuzzle,
  getTileOpenSides,
  rotatePuzzleTile,
  type CircuitTile,
} from '../missions/MissionEngine';
import { useGameStore } from '../state/useGameStore';
import { audioManager } from '../audio/AudioManager';

function TileSvg({ tile, powered }: { tile: CircuitTile; powered: boolean }) {
  const open = getTileOpenSides(tile);
  const stroke = powered ? '#22d3ee' : '#475569';
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      {/* Center hub */}
      <circle cx="30" cy="30" r="6" fill={stroke} />
      {open.includes(0) && <line x1="30" y1="0" x2="30" y2="30" stroke={stroke} strokeWidth="7" strokeLinecap="round" />}
      {open.includes(1) && <line x1="60" y1="30" x2="30" y2="30" stroke={stroke} strokeWidth="7" strokeLinecap="round" />}
      {open.includes(2) && <line x1="30" y1="60" x2="30" y2="30" stroke={stroke} strokeWidth="7" strokeLinecap="round" />}
      {open.includes(3) && <line x1="0" y1="30" x2="30" y2="30" stroke={stroke} strokeWidth="7" strokeLinecap="round" />}
    </svg>
  );
}

export function SignalPuzzleModal() {
  const [grid, setGrid] = useState<CircuitTile[][]>(() => createSignalPuzzleGrid());
  const setOverlay = useGameStore((s) => s.setOverlay);
  const engine = useGameStore((s) => s.engine);

  const { powered, solved } = evaluateSignalPuzzle(grid);

  const handleRotate = (r: number, c: number) => {
    if (solved) return;
    audioManager.playClick();
    const next = rotatePuzzleTile(grid, r, c);
    setGrid(next);
    const check = evaluateSignalPuzzle(next);
    if (check.solved) {
      setTimeout(() => {
        setOverlay(null);
        engine.solvePuzzleSuccess?.();
      }, 450);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040914]/84 p-4">
      <div className="hud-panel-cyan rounded-xl w-full max-w-md p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-cyan-500/25 pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu size={20} className="text-fuchsia-400" />
            <div>
              <div className="font-display text-xs uppercase tracking-widest text-fuchsia-400">
                M04 · SIGNAL BREAK RELAY
              </div>
              <h2 className="font-display text-lg font-extrabold uppercase text-slate-50">
                Network Conduit Override
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOverlay(null)}
            aria-label="Close Signal Puzzle"
            className="w-8 h-8 rounded bg-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Click any relay node to rotate it 90°. Connect the incoming <strong className="text-cyan-300">IN</strong> feed at top-left to the <strong className="text-amber-300">OUT</strong> lock at bottom-right.
        </p>

        <div className="relative flex items-center justify-center py-2">
          <div className="flex flex-col items-center">
            <div className="w-full flex justify-between text-[11px] font-mono mb-1.5 px-1">
              <span className="text-cyan-300 font-bold">IN ▶ (0,0)</span>
              <span className="text-amber-300 font-bold">(3,3) ▶ OUT</span>
            </div>
            <div className="grid grid-cols-4 gap-2 bg-[#060d19] p-3 rounded-lg border border-slate-700">
              {grid.map((row, r) =>
                row.map((tile, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleRotate(r, c)}
                    aria-label={`Rotate conduit row ${r + 1} col ${c + 1}`}
                    className={`w-16 h-16 rounded border transition-colors cursor-pointer ${
                      powered[r][c]
                        ? 'bg-cyan-950/60 border-cyan-400/70'
                        : 'bg-slate-900 border-slate-700 hover:border-amber-400/60'
                    }`}
                  >
                    <TileSvg tile={tile} powered={powered[r][c]} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setGrid(createSignalPuzzleGrid())}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-display uppercase font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw size={13} /> Reset Grid
          </button>
          {solved ? (
            <span className="text-xs font-display uppercase font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Relay Unlocked!
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-400">Signal Pending…</span>
          )}
        </div>
      </div>
    </div>
  );
}
