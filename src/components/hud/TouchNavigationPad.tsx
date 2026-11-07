import React from 'react';
import { useAtomValue } from 'jotai';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { worldViewModeAtom } from '../../stores/worldStore';
import { view_MODE_PLANET_3D } from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

export interface TouchNavigationPadProps {
  onMoveDelta: (dRight: number, dForward: number) => void;
  onRotateDelta: (dAzimuth: number, dPolar: number) => void;
}

/**
 * Ergonomic on-screen tactile pad for moving Forward/Backward/Left/Right across the curved plateau
 * and rotating left/right, complementing native 1-finger swipe and 2-finger twist gestures.
 */
export const TouchNavigationPad: React.FC<TouchNavigationPadProps> = ({
  onMoveDelta,
  onRotateDelta,
}) => {
  const worldViewMode = useAtomValue(worldViewModeAtom);
  if (worldViewMode === view_MODE_PLANET_3D) return null;

  const step = 4.2;
  const rotStep = 0.28;

  return (
    <div className="fixed bottom-28 right-3 sm:right-5 z-20 pointer-events-auto">
      <GlassPanel className="p-2 flex flex-col items-center gap-1 border-amber-300/25">
        <span className="text-[9px] font-mono uppercase tracking-wider text-amber-200/80 px-1">
          Pad & Gestes
        </span>

        {/* Top Row: Rotate Left, Move Forward, Rotate Right */}
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => onRotateDelta(rotStep, 0)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-amber-400/20 border border-white/10 flex items-center justify-center text-amber-200 transition cursor-pointer"
            title="Tourner à gauche (ou 2 doigts en sens inverse)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDelta(0, step)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 border border-amber-300/30 flex items-center justify-center text-amber-100 transition cursor-pointer"
            title="Avancer sur le plateau (Swipe haut / Z)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRotateDelta(-rotStep, 0)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-amber-400/20 border border-white/10 flex items-center justify-center text-amber-200 transition cursor-pointer"
            title="Tourner à droite (ou 2 doigts en sens inverse)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Row: Move Left, Move Backward, Move Right */}
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => onMoveDelta(-step, 0)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 border border-amber-300/30 flex items-center justify-center text-amber-100 transition cursor-pointer"
            title="Aller à gauche (Swipe gauche / Q)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDelta(0, -step)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 border border-amber-300/30 flex items-center justify-center text-amber-100 transition cursor-pointer"
            title="Reculer sur le plateau (Swipe bas / S)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDelta(step, 0)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 border border-amber-300/30 flex items-center justify-center text-amber-100 transition cursor-pointer"
            title="Aller à droite (Swipe droite / D)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
