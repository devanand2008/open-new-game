import { useEffect, useRef, useState } from 'react';
import { CoastlineEngine } from './game/engine/CoastlineEngine';
import { useGameStore } from './game/state/useGameStore';
import { TitleScreen } from './game/ui/TitleScreen';
import { HUD } from './game/ui/HUD';
import { PauseMenu } from './game/ui/PauseMenu';
import { MapScreen } from './game/ui/MapScreen';
import { PhoneModal } from './game/ui/PhoneModal';
import { SignalPuzzleModal } from './game/ui/SignalPuzzleModal';
import { InteractionModal } from './game/ui/InteractionModal';
import { ControlsModal, OutcomeModal, SettingsModal } from './game/ui/SettingsModal';
import type { InputManager } from './game/input/InputManager';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CoastlineEngine | null>(null);
  const [inputRefState, setInputRefState] = useState<InputManager | null>(null);

  const screen = useGameStore((s) => s.screen);
  const overlay = useGameStore((s) => s.overlay);
  const loadingStage = useGameStore((s) => s.loadingStage);
  const loadingPercent = useGameStore((s) => s.loadingPercent);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CoastlineEngine(mount);
    engineRef.current = engine;
    setInputRefState(engine.input);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070e1a]">
      {/* Isolated Full-Bleed WebGL Canvas Container (never re-rendered by HUD state) */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-container"
        className="fixed inset-0 w-full h-full"
      />

      {/* True Stage-Based Loading Screen */}
      {loadingStage !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070e1a] p-6">
          <div className="w-full max-w-md flex flex-col gap-3">
            <div className="font-display text-xs uppercase tracking-widest text-amber-400">
              PROJECT: COASTLINE · SOLARA BAY
            </div>
            <div className="font-display text-2xl font-extrabold uppercase text-slate-100">
              {loadingStage}
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${loadingPercent}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-xs text-cyan-300 hud-num">
              <span>Building 3D Procedural Metropolis</span>
              <span>{loadingPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Game Shell State Screens */}
      {loadingStage === null && screen === 'title' && <TitleScreen />}
      {loadingStage === null && screen === 'playing' && <HUD input={inputRefState} />}
      {loadingStage === null && screen === 'paused' && <PauseMenu />}

      {/* Interactive Modals / Overlays */}
      {overlay === 'map' && <MapScreen />}
      {overlay === 'phone' && <PhoneModal />}
      {overlay === 'puzzle' && <SignalPuzzleModal />}
      {overlay === 'interact' && <InteractionModal />}
      {overlay === 'settings' && <SettingsModal />}
      {overlay === 'controls' && <ControlsModal />}
      {overlay === 'outcome' && <OutcomeModal />}
    </main>
  );
}
