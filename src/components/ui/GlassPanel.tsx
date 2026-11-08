import React, { useEffect, useRef, useState } from 'react';
import { Lock, Move, RotateCcw, Unlock } from 'lucide-react';

export interface WindowLayoutState {
  x: number;
  y: number;
  width: number | null;
  height: number | null;
}

const STORAGE_KEY = 'galaxia_window_layouts_v1';
const LONG_PRESS_MS = 400;

function loadAllWindowLayouts(): Record<string, WindowLayoutState> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WindowLayoutState>;
  } catch {
    return {};
  }
}

function saveWindowLayout(id: string, layout: WindowLayoutState): void {
  try {
    if (typeof window === 'undefined') return;
    const all = loadAllWindowLayouts();
    all[id] = layout;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota errors
  }
}

function clearWindowLayout(id: string): void {
  try {
    if (typeof window === 'undefined') return;
    const all = loadAllWindowLayouts();
    delete all[id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}

function deriveStableWindowId(className: string): string {
  const clean = className
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return `win_${clean || 'default'}`;
}

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  windowId?: string;
  disableWindowControls?: boolean;
}

type InteractionMode =
  | 'idle'
  | 'dragging'
  | 'resizing-br'
  | 'resizing-bl'
  | 'resizing-r'
  | 'resizing-b';

/**
 * Interactive Tactile Glass Window:
 * - Long-press (~400ms) anywhere on the window (outside buttons/inputs) activates tactile Move & Resize mode
 *   and immediately begins dragging or locks/auto-saves the layout in localStorage.
 * - Top handle bar & corner/edge grips allow moving and resizing via touch or mouse at any time.
 * - Two-finger pinch on the window when unlocked scales width & height tactilely.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  onClick,
  windowId,
  disableWindowControls = false,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const resolvedId = windowId || deriveStableWindowId(className);

  // Automatically disable heavy window chrome on tiny inline header pills unless windowId is explicitly given
  const isCompactPill =
    disableWindowControls ||
    (!windowId &&
      (className.includes('py-1.5') || className.includes('py-1')) &&
      !className.includes('max-w-'));

  const [layout, setLayout] = useState<WindowLayoutState>(() => {
    const saved = loadAllWindowLayouts()[resolvedId];
    return saved ?? { x: 0, y: 0, width: null, height: null };
  });

  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [mode, setMode] = useState<InteractionMode>('idle');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startLayoutRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 320, height: 240 });
  const pinchStartRef = useRef<{
    dist: number;
    width: number;
    height: number;
  } | null>(null);
  const layoutRef = useRef<WindowLayoutState>(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const saved = loadAllWindowLayouts()[resolvedId];
    if (saved) {
      setLayout(saved);
    }
  }, [resolvedId]);

  const triggerSaveFeedback = (msg = 'Emplacement & taille enregistrés') => {
    setSaveToast(msg);
    window.setTimeout(() => {
      setSaveToast((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        'button, input, select, textarea, a, label, [role="button"], [data-no-drag="true"]'
      )
    );
  };

  const captureCurrentDimensions = () => {
    const el = panelRef.current;
    const rect = el?.getBoundingClientRect();
    return {
      x: layoutRef.current.x,
      y: layoutRef.current.y,
      width: layoutRef.current.width ?? (rect ? Math.round(rect.width) : 360),
      height: layoutRef.current.height ?? (rect ? Math.round(rect.height) : 260),
    };
  };

  const beginMode = (
    nextMode: InteractionMode,
    clientX: number,
    clientY: number
  ) => {
    startPointerRef.current = { x: clientX, y: clientY };
    startLayoutRef.current = captureCurrentDimensions();
    setMode(nextMode);
  };

  // Global pointer move / up listeners when dragging or resizing
  useEffect(() => {
    if (mode === 'idle') return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - startPointerRef.current.x;
      const dy = clientY - startPointerRef.current.y;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (mode === 'dragging') {
        const maxOffsetX = Math.max(120, vw * 0.46);
        const maxOffsetY = Math.max(120, vh * 0.46);
        const nextX = Math.round(
          Math.max(-maxOffsetX, Math.min(maxOffsetX, startLayoutRef.current.x + dx))
        );
        const nextY = Math.round(
          Math.max(-maxOffsetY, Math.min(maxOffsetY, startLayoutRef.current.y + dy))
        );
        setLayout((prev) => ({ ...prev, x: nextX, y: nextY }));
      } else if (mode === 'resizing-br') {
        const nextW = Math.round(
          Math.max(250, Math.min(vw - 16, startLayoutRef.current.width + dx))
        );
        const nextH = Math.round(
          Math.max(150, Math.min(vh - 24, startLayoutRef.current.height + dy))
        );
        setLayout((prev) => ({ ...prev, width: nextW, height: nextH }));
      } else if (mode === 'resizing-bl') {
        const nextW = Math.round(
          Math.max(250, Math.min(vw - 16, startLayoutRef.current.width - dx))
        );
        const nextH = Math.round(
          Math.max(150, Math.min(vh - 24, startLayoutRef.current.height + dy))
        );
        setLayout((prev) => ({
          ...prev,
          x: Math.round(startLayoutRef.current.x + dx * 0.5),
          width: nextW,
          height: nextH,
        }));
      } else if (mode === 'resizing-r') {
        const nextW = Math.round(
          Math.max(250, Math.min(vw - 16, startLayoutRef.current.width + dx))
        );
        setLayout((prev) => ({ ...prev, width: nextW }));
      } else if (mode === 'resizing-b') {
        const nextH = Math.round(
          Math.max(150, Math.min(vh - 24, startLayoutRef.current.height + dy))
        );
        setLayout((prev) => ({ ...prev, height: nextH }));
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setMode('idle');
      saveWindowLayout(resolvedId, layoutRef.current);
      triggerSaveFeedback('Emplacement & taille auto-enregistrés');
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [mode, resolvedId]);

  if (isCompactPill) {
    return (
      <div
        onClick={onClick}
        className={`bg-[#0b1322]/85 backdrop-blur-xl border border-amber-200/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] rounded-2xl text-slate-100 ${className}`}
      >
        {children}
      </div>
    );
  }

  const handlePanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInteractiveTarget(e.target)) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    startPointerRef.current = { x: clientX, y: clientY };

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
      setIsEditUnlocked(true);
      beginMode('dragging', clientX, clientY);
      saveWindowLayout(resolvedId, layoutRef.current);
      triggerSaveFeedback('Mode Tactile actif • Glissez ou redimensionnez');
    }, LONG_PRESS_MS);
  };

  const handlePanelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current !== null) {
      const dist = Math.hypot(
        e.clientX - startPointerRef.current.x,
        e.clientY - startPointerRef.current.y
      );
      if (dist > 10) {
        clearLongPressTimer();
      }
    }
  };

  const handlePanelPointerUp = () => {
    clearLongPressTimer();
  };

  // Two-finger pinch to resize tactilely
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      clearLongPressTimer();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const dims = captureCurrentDimensions();
      pinchStartRef.current = {
        dist: Math.max(40, dist),
        width: dims.width,
        height: dims.height,
      };
      setIsEditUnlocked(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.stopPropagation();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const scale = dist / pinchStartRef.current.dist;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nextW = Math.round(
        Math.max(250, Math.min(vw - 12, pinchStartRef.current.width * scale))
      );
      const nextH = Math.round(
        Math.max(150, Math.min(vh - 20, pinchStartRef.current.height * scale))
      );
      setLayout((prev) => ({ ...prev, width: nextW, height: nextH }));
    }
  };

  const handleTouchEnd = () => {
    if (pinchStartRef.current) {
      pinchStartRef.current = null;
      saveWindowLayout(resolvedId, layoutRef.current);
      triggerSaveFeedback('Taille tactile mémorisée');
    }
  };

  const handleResetWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fresh: WindowLayoutState = { x: 0, y: 0, width: null, height: null };
    setLayout(fresh);
    clearWindowLayout(resolvedId);
    setIsEditUnlocked(false);
    triggerSaveFeedback('Position & taille réinitialisées');
  };

  const hasCustomLayout =
    layout.x !== 0 ||
    layout.y !== 0 ||
    layout.width !== null ||
    layout.height !== null;

  const dynamicStyle: React.CSSProperties = {
    transform:
      layout.x !== 0 || layout.y !== 0
        ? `translate3d(${layout.x}px, ${layout.y}px, 0)`
        : undefined,
    width: layout.width !== null ? `${layout.width}px` : undefined,
    height: layout.height !== null ? `${layout.height}px` : undefined,
    maxWidth: layout.width !== null ? '98vw' : undefined,
    maxHeight: layout.height !== null ? '94dvh' : undefined,
    touchAction: mode !== 'idle' ? 'none' : undefined,
  };

  return (
    <div
      ref={panelRef}
      onClick={onClick}
      onPointerDown={handlePanelPointerDown}
      onPointerMove={handlePanelPointerMove}
      onPointerUp={handlePanelPointerUp}
      onPointerCancel={handlePanelPointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={dynamicStyle}
      className={`relative bg-[#0b1322]/88 backdrop-blur-xl border transition-shadow rounded-2xl text-slate-100 ${
        isEditUnlocked || mode !== 'idle'
          ? 'border-amber-300/65 shadow-[0_0_35px_rgba(251,191,36,0.22),0_20px_50px_rgba(0,0,0,0.85)]'
          : 'border-amber-200/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
      } ${className}`}
    >
      {/* Top Tactile Drag Handle Bar & Long-Press Status Controls */}
      <div
        data-no-drag="true"
        className="flex items-center justify-between gap-2 px-2 py-1 -mt-1 mb-1 border-b border-white/5 text-[10px] font-mono text-slate-400 select-none"
      >
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            beginMode('dragging', e.clientX, e.clientY);
          }}
          title="Glisser pour déplacer la fenêtre (ou appui long n'importe où sur la fenêtre)"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/10 active:bg-amber-400/20 text-slate-300 hover:text-amber-200 cursor-grab active:cursor-grabbing transition touch-none"
        >
          <Move className="w-3 h-3 text-amber-300/90" />
          <span className="w-7 h-1 rounded-full bg-amber-200/35 inline-block" />
          <span className="hidden sm:inline text-[9px] text-slate-400">
            Appui long / Glisser
          </span>
        </div>

        {saveToast ? (
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-md truncate">
            ✓ {saveToast}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            {hasCustomLayout && (
              <button
                type="button"
                onClick={handleResetWindow}
                title="Réinitialiser la position et la taille de la fenêtre"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-300" />
                <span className="text-[9px]">Centrer</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const next = !isEditUnlocked;
                setIsEditUnlocked(next);
                if (!next) {
                  saveWindowLayout(resolvedId, layoutRef.current);
                  triggerSaveFeedback('Emplacement verrouillé & sauvegardé');
                } else {
                  triggerSaveFeedback('Mode redimensionnement tactile actif');
                }
              }}
              title={
                isEditUnlocked
                  ? 'Verrouiller et sauvegarder la taille/position'
                  : 'Déverrouiller les poignées de taille tactiles'
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                isEditUnlocked
                  ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEditUnlocked ? (
                <>
                  <Unlock className="w-2.5 h-2.5 text-amber-300" />
                  <span className="text-[9px]">Taille libre</span>
                </>
              ) : (
                <Lock className="w-2.5 h-2.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {children}

      {/* Tactile Resize Grips (Always available at bottom-right; enlarged on all edges when unlocked) */}
      {/* Bottom-Right Corner Resize Handle */}
      <div
        data-no-drag="true"
        onPointerDown={(e) => {
          e.stopPropagation();
          beginMode('resizing-br', e.clientX, e.clientY);
        }}
        title="Glisser pour redimensionner la fenêtre"
        className={`absolute bottom-0 right-0 z-30 flex items-end justify-end p-1.5 cursor-nwse-resize touch-none transition ${
          isEditUnlocked
            ? 'w-8 h-8 text-amber-300 bg-amber-400/15 rounded-tl-xl rounded-br-2xl border-t border-l border-amber-300/40'
            : 'w-6 h-6 text-slate-400/70 hover:text-amber-300'
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <path
            d="M14 6V14H6M14 10V14H10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Bottom-Left Corner Resize Handle (visible when unlocked or on touch) */}
      <div
        data-no-drag="true"
        onPointerDown={(e) => {
          e.stopPropagation();
          beginMode('resizing-bl', e.clientX, e.clientY);
        }}
        title="Redimensionner depuis le coin inférieur gauche"
        className={`absolute bottom-0 left-0 z-30 flex items-end justify-start p-1.5 cursor-nesw-resize touch-none transition ${
          isEditUnlocked
            ? 'w-8 h-8 text-amber-300 bg-amber-400/15 rounded-tr-xl rounded-bl-2xl border-t border-r border-amber-300/40 opacity-100'
            : 'w-5 h-5 text-slate-500/40 hover:text-amber-300 opacity-60 hover:opacity-100'
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 6V14H10M2 10V14H6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
