import { useRef, useState } from 'react';
import type { InputManager } from '../input/InputManager';
import { useGameStore } from '../state/useGameStore';

interface TouchControlsProps {
  input: InputManager | null;
}

export function TouchControls({ input }: TouchControlsProps) {
  const inVehicle = useGameStore((s) => s.telemetry.inVehicle);
  const nearbyPrompt = useGameStore((s) => s.telemetry.nearbyPrompt);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number; id: number } | null>(null);

  const onJoyStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t || !input) return;
    joyOrigin.current = { x: t.clientX, y: t.clientY, id: t.identifier };
  };

  const onJoyMove = (e: React.TouchEvent) => {
    if (!joyOrigin.current || !input) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyOrigin.current.id) {
        const dx = t.clientX - joyOrigin.current.x;
        const dy = t.clientY - joyOrigin.current.y;
        const maxR = 42;
        const dist = Math.hypot(dx, dy);
        const clamped = dist > maxR ? maxR / dist : 1;
        const kx = dx * clamped;
        const ky = dy * clamped;
        setKnob({ x: kx, y: ky });
        input.touch.moveX = kx / maxR;
        input.touch.moveY = -ky / maxR;
      }
    }
  };

  const onJoyEnd = () => {
    joyOrigin.current = null;
    setKnob({ x: 0, y: 0 });
    if (input) {
      input.touch.moveX = 0;
      input.touch.moveY = 0;
    }
  };

  const onLookStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    lookLast.current = { x: t.clientX, y: t.clientY, id: t.identifier };
  };

  const onLookMove = (e: React.TouchEvent) => {
    if (!lookLast.current || !input) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookLast.current.id) {
        input.touch.lookDeltaX += (t.clientX - lookLast.current.x) * 1.4;
        input.touch.lookDeltaY += (t.clientY - lookLast.current.y) * 1.2;
        lookLast.current.x = t.clientX;
        lookLast.current.y = t.clientY;
      }
    }
  };

  const onLookEnd = () => {
    lookLast.current = null;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* Right half swipe-to-look zone */}
      <div
        className="pointer-events-auto fixed top-16 right-0 bottom-36 left-1/2 touch-none"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        aria-label="Touch camera look pad"
      />

      {/* Left Virtual Joystick — cleanly above mobile Minimap */}
      <div
        className="pointer-events-auto fixed bottom-44 left-4 w-24 h-24 rounded-full bg-[#08101e]/75 border-2 border-amber-500/45 flex items-center justify-center touch-none"
        onTouchStart={onJoyStart}
        onTouchMove={onJoyMove}
        onTouchEnd={onJoyEnd}
        onTouchCancel={onJoyEnd}
      >
        <div
          className="w-10 h-10 rounded-full bg-amber-500/80 border-2 border-amber-200 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Right Action Buttons — cleanly above bottom vitals */}
      <div className="pointer-events-auto fixed bottom-28 right-3 flex flex-col gap-2 items-end">
        {(nearbyPrompt || inVehicle) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => input?.triggerAction('KeyE')}
            className="w-12 h-12 rounded-full bg-amber-500 text-[#070e1a] font-display font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95"
            aria-label={inVehicle ? 'Exit vehicle' : 'Interact'}
          >
            {inVehicle ? 'EXIT' : 'USE'}
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            tabIndex={-1}
            onTouchStart={() => {
              if (input) input.touch.sprint = true;
            }}
            onTouchEnd={() => {
              if (input) input.touch.sprint = false;
            }}
            className="w-12 h-12 rounded-full bg-[#08101e]/90 border border-cyan-400/60 text-cyan-300 font-display font-bold text-[11px] uppercase active:bg-cyan-500/30"
            aria-label="Sprint"
          >
            {inVehicle ? 'BOOST' : 'RUN'}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onTouchStart={() => {
              if (inVehicle && input) input.touch.handbrake = true;
              else input?.triggerAction('Space');
            }}
            onTouchEnd={() => {
              if (input) input.touch.handbrake = false;
            }}
            onClick={() => {
              if (!inVehicle) input?.triggerAction('Space');
            }}
            className="w-12 h-12 rounded-full bg-[#08101e]/90 border border-amber-400/60 text-amber-300 font-display font-bold text-[11px] uppercase active:bg-amber-500/30"
            aria-label={inVehicle ? 'Handbrake' : 'Jump'}
          >
            {inVehicle ? 'BRAKE' : 'JUMP'}
          </button>
        </div>
      </div>
    </div>
  );
}
