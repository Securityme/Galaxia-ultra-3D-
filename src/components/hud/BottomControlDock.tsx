import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  FileCode2,
  FolderOpen,
  Globe2,
  Layers,
  Map,
  MapPin,
  Play,
  Rocket,
  ScrollText,
  Settings2,
  Sliders,
} from 'lucide-react';
import {
  activeBottomSubMenuAtom,
  BottomSubMenuId,
  cameraModeAtom,
  chroniclesAtom,
  civilizationStatsAtom,
  isArrivalZoneSelectedAtom,
  isBlueprintModalOpenAtom,
  isBottomDockOpenAtom,
  isCatalogModalOpenAtom,
  isGameConfigModalOpenAtom,
  isGeneratingEventAtom,
  isJournalOpenAtom,
  isPresetsOpenAtom,
  isSaveModalOpenAtom,
  isSettingsOpenAtom,
  isZonesDrawerOpenAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  turnNumberAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import {
  cam_MODE_ARRIVAL,
  cam_MODE_ORBIT,
  cam_MODE_PLATEAU,
  view_MODE_PLANET_3D,
  view_MODE_PLATEAU,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

export interface BottomControlDockProps {
  onTriggerTurnEvent: () => void;
  onZoomDelta?: (dZoom: number) => void;
}

/**
 * Mobile-Ergonomic Bottom Command Dock:
 * - Includes direct 1-Tap "Tour Suivant (IA)" button on the main bar for seamless gameloop progression
 * - Contextual sub-drawers for 3D Camera Views ("Vue") and Imperial Chronicles ("Calendrier")
 * - Tactile draggable & resizable via GlassPanel
 */
export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  onTriggerTurnEvent,
}) => {
  const [isDockOpen, setIsDockOpen] = useAtom(isBottomDockOpenAtom);
  const [activeSubMenu, setActiveSubMenu] = useAtom(activeBottomSubMenuAtom);

  const [worldViewMode, setWorldViewMode] = useAtom(worldViewModeAtom);
  const [cameraMode, setCameraMode] = useAtom(cameraModeAtom);
  const [isZonesDrawerOpen, setIsZonesDrawerOpen] = useAtom(isZonesDrawerOpenAtom);

  const turnNumber = useAtomValue(turnNumberAtom);
  const civStats = useAtomValue(civilizationStatsAtom);
  const isGeneratingTurn = useAtomValue(isGeneratingEventAtom);
  const chronicles = useAtomValue(chroniclesAtom);

  const setIsJournalOpen = useSetAtom(isJournalOpenAtom);
  const setIsPresetsOpen = useSetAtom(isPresetsOpenAtom);
  const setIsSettingsOpen = useSetAtom(isSettingsOpenAtom);
  const setIsSaveOpen = useSetAtom(isSaveModalOpenAtom);
  const setIsGameConfigOpen = useSetAtom(isGameConfigModalOpenAtom);
  const setIsCatalogOpen = useSetAtom(isCatalogModalOpenAtom);
  const setIsBlueprintOpen = useSetAtom(isBlueprintModalOpenAtom);

  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);

  const isPlanet3D = worldViewMode === view_MODE_PLANET_3D;

  const toggleSubMenu = (menu: BottomSubMenuId) => {
    setActiveSubMenu((prev) => (prev === menu ? 'none' : menu));
  };

  const handleSelectPlateauView = (
    subCameraMode: typeof cam_MODE_ORBIT | typeof cam_MODE_PLATEAU | typeof cam_MODE_ARRIVAL
  ) => {
    setWorldViewMode(view_MODE_PLATEAU);
    setCameraMode(subCameraMode);
    if (subCameraMode === cam_MODE_ARRIVAL) {
      setSelectedNpcId(null);
      setSelectedBuildingId(null);
      setIsArrivalZoneSelected(true);
    } else {
      setIsArrivalZoneSelected(false);
    }
  };

  const handleSelectPlanet3DView = () => {
    setIsArrivalZoneSelected(false);
    setWorldViewMode(view_MODE_PLANET_3D);
  };

  // Closed state: Minimal floating pill at bottom center
  if (!isDockOpen) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none pb-2.5 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setIsDockOpen(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/35 bg-[#081020]/90 backdrop-blur-xl px-4 py-2 text-xs font-semibold text-amber-100 shadow-lg hover:bg-[#0d1830] transition cursor-pointer"
        >
          <ChevronUp className="w-4 h-4 text-amber-300" />
          <span>Dock Impérial (Tour {turnNumber})</span>
        </button>

        <button
          type="button"
          disabled={isGeneratingTurn}
          onClick={onTriggerTurnEvent}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>{isGeneratingTurn ? 'IA...' : 'Tour Suivant'}</span>
        </button>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none px-2.5 pb-2 sm:px-5 sm:pb-3 flex flex-col items-center gap-2">
      {/* CONTEXTUAL SUB-DRAWER 1: VIEW SELECTION ("Vue") */}
      {activeSubMenu === 'views' && (
        <GlassPanel
          windowId="bottom-dock-views-drawer"
          className="pointer-events-auto w-full max-w-2xl px-3.5 py-2.5 border-sky-300/30 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Point de Vue 3D
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPlateauView(cam_MODE_ORBIT)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  !isPlanet3D && cameraMode === cam_MODE_ORBIT
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Plateau Orbite</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlateauView(cam_MODE_ARRIVAL)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  !isPlanet3D && cameraMode === cam_MODE_ARRIVAL
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Porte Céleste</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlateauView(cam_MODE_PLATEAU)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  !isPlanet3D && cameraMode === cam_MODE_PLATEAU
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Surface</span>
              </button>

              <button
                type="button"
                onClick={handleSelectPlanet3DView}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isPlanet3D
                    ? 'bg-sky-400 text-slate-950 font-semibold'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Planète 3D</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZonesDrawerOpen(!isZonesDrawerOpen)}
                className="flex items-center gap-1 rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-400/20 transition cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Atlas 6 Zones</span>
              </button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* CONTEXTUAL SUB-DRAWER 2: PLAY, CALENDAR, TURNS & CHRONICLES */}
      {activeSubMenu === 'play' && (
        <GlassPanel
          windowId="bottom-dock-play-drawer"
          className="pointer-events-auto w-full max-w-2xl px-4 py-3 border-amber-300/35 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-300/35 flex items-center justify-center text-amber-300">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-sm text-amber-50">
                    An Impérial {civStats.imperialYear} · {civStats.seasonName}
                  </span>
                  <span className="rounded-md bg-amber-400/20 border border-amber-300/35 px-2 py-0.5 text-[10px] font-mono text-amber-200">
                    Tour #{turnNumber}
                  </span>
                </div>
                <span className="text-xs text-slate-300 block">
                  Époque : {civStats.epochName} · Chroniqueur Gemini IA
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsJournalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-medium text-slate-100 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span>Annales ({chronicles.length})</span>
              </button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* MAIN BOTTOM DOCK BAR */}
      <GlassPanel
        windowId="bottom-dock-main-bar"
        className="pointer-events-auto w-full max-w-3xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2"
      >
        {/* Left Primary Triggers: VUE, CALENDRIER & DIRECT NEXT TURN CTA */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => toggleSubMenu('views')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs font-semibold transition cursor-pointer ${
              activeSubMenu === 'views'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'border border-sky-300/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20'
            }`}
            title="Sélecteur de Vue 3D (Plateau / Globe)"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>{isPlanet3D ? 'Globe 3D' : 'Vue 3D'}</span>
          </button>

          {/* Direct 1-Tap Gameloop Action: Next Turn */}
          <button
            type="button"
            disabled={isGeneratingTurn}
            onClick={onTriggerTurnEvent}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
            title="Générer le prochain événement narratif Gemini IA et passer au tour suivant"
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isGeneratingTurn ? 'Chronique IA...' : `Tour Suivant (#${turnNumber + 1})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => toggleSubMenu('play')}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
              activeSubMenu === 'play'
                ? 'bg-amber-400/25 border border-amber-300 text-amber-100'
                : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
            title="Calendrier Impérial & Annales"
          >
            <Play className="w-3 h-3 text-amber-300" />
            <span className="hidden md:inline">Annales</span>
          </button>
        </div>

        {/* Right: Quick Modals */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-purple-300/30 bg-purple-400/15 hover:bg-purple-400/25 px-2.5 py-2 text-xs font-medium text-purple-100 transition cursor-pointer"
            title="Catalogues RPG & Architecte"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Catalogues</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPresetsOpen(true)}
            className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-2 text-xs text-slate-200 transition cursor-pointer"
            title="Biomes Planétaires"
          >
            <Map className="w-3.5 h-3.5 text-emerald-300" />
            <span>Biomes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaveOpen(true)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer"
            title="Sauvegardes Cloud & Locales"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-300" />
          </button>

          <button
            type="button"
            onClick={() => setIsGameConfigOpen(true)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer"
            title="Nouvelle Partie & Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-300" />
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer"
            title="Paramètres Graphiques, Météo & Graines"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-300" />
          </button>

          <button
            type="button"
            onClick={() => setIsBlueprintOpen(true)}
            className="hidden sm:flex p-2 rounded-xl border border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/20 text-sky-200 transition cursor-pointer"
            title="Blueprint v4.0"
          >
            <FileCode2 className="w-3.5 h-3.5 text-sky-300" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubMenu('none');
              setIsDockOpen(false);
            }}
            className="p-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer"
            title="Réduire le dock"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </GlassPanel>
    </footer>
  );
};
