import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  Flame,
  MapPin,
  Rocket,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  activePresetAtom,
  activeZoneDefAtom,
  buildingsAtom,
  cameraModeAtom,
  civilizationStatsAtom,
  commanderAuthUserAtom,
  isArrivalZoneSelectedAtom,
  isBootScreenOpenAtom,
  isHeaderResourcesOpenAtom,
  isZonesDrawerOpenAtom,
  npcsAtom,
  worldNameAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import {
  cam_MODE_ARRIVAL,
  view_MODE_PLANET_3D,
  view_MODE_PLATEAU,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Minimalist Top Imperial Header with Retractable Resource Display.
 * Never overlapped by character or building cards.
 */
export const TopTelemetryBar: React.FC = () => {
  const worldName = useAtomValue(worldNameAtom);
  const preset = useAtomValue(activePresetAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const civStats = useAtomValue(civilizationStatsAtom);
  const authUser = useAtomValue(commanderAuthUserAtom);

  const [worldViewMode, setWorldViewMode] = useAtom(worldViewModeAtom);
  const [isZonesDrawerOpen, setIsZonesDrawerOpen] = useAtom(isZonesDrawerOpenAtom);
  const [isResourcesOpen, setIsResourcesOpen] = useAtom(isHeaderResourcesOpenAtom);

  const setIsBootScreenOpen = useSetAtom(isBootScreenOpenAtom);
  const setCameraMode = useSetAtom(cameraModeAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);

  const isPlanet3D = worldViewMode === view_MODE_PLANET_3D;

  const handleFocusArrivalPort = () => {
    setWorldViewMode(view_MODE_PLATEAU);
    setCameraMode(cam_MODE_ARRIVAL);
    setIsArrivalZoneSelected(true);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-3 pt-2.5 sm:px-5 sm:pt-3.5 flex flex-col items-center gap-1.5">
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-2">
        {/* Left: Minimalist Empire Crest & Active Plateau Zone */}
        <GlassPanel className="pointer-events-auto px-3 py-1.5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsBootScreenOpen(true)}
            title="Ouvrir le Menu Principal Impérial"
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-300/35 flex items-center justify-center text-amber-300 group-hover:bg-amber-400/25 transition">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-semibold text-xs sm:text-sm text-amber-50 tracking-tight">
                  {worldName}
                </span>
                <span className="hidden md:inline-block text-[10px] font-mono text-amber-300/90">
                  • {activeZone.name}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span className="text-sky-300">{preset.name}</span>
                {authUser && (
                  <span className="hidden sm:inline text-emerald-300/80">
                    • {authUser.displayName.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="h-4 w-px bg-white/10" />

          <button
            type="button"
            onClick={handleFocusArrivalPort}
            className="flex items-center gap-1 rounded-lg border border-amber-300/25 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-1 text-[10px] font-medium text-amber-200 transition cursor-pointer"
            title="Cadrer la Porte d'Arrivée 3D"
          >
            <Rocket className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">Astroport</span>
          </button>

          <button
            type="button"
            onClick={() => setIsZonesDrawerOpen(!isZonesDrawerOpen)}
            className="flex items-center gap-1 rounded-lg border border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/20 px-2 py-1 text-[10px] font-medium text-sky-200 transition cursor-pointer"
            title="Atlas des 6 Zones Planétaires"
          >
            <MapPin className="w-3 h-3 text-sky-300" />
            <span>{isPlanet3D ? 'Globe (6)' : '6 Zones'}</span>
          </button>
        </GlassPanel>

        {/* Right: Minimalist Retractable Resources Toggle Pill */}
        <GlassPanel className="pointer-events-auto px-2.5 py-1.5 flex items-center gap-2">
          {/* Compact summary when retracted */}
          {!isResourcesOpen && (
            <div className="flex items-center gap-2.5 text-[11px] font-mono px-1">
              <span className="text-emerald-300 flex items-center gap-1" title="Stabilité">
                <ShieldCheck className="w-3 h-3" />
                {civStats.stability}%
              </span>
              <span className="text-amber-300 flex items-center gap-1" title="Prospérité">
                <Flame className="w-3 h-3" />
                {civStats.prosperity}%
              </span>
              <span className="hidden sm:flex items-center gap-1 text-slate-300">
                <Users className="w-3 h-3 text-sky-300" />
                {npcs.length}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsResourcesOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
            title={
              isResourcesOpen
                ? 'Rétracter l’affichage des ressources'
                : 'Déployer les ressources de l’Empire'
            }
          >
            <span>Ressources</span>
            {isResourcesOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
            )}
          </button>
        </GlassPanel>
      </div>

      {/* Expandable Full Resource Drawer */}
      {isResourcesOpen && (
        <GlassPanel className="pointer-events-auto px-4 py-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5" title="Stabilité Politique & Sociale">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Stabilité</span>
            <span className="font-mono font-semibold text-emerald-300">{civStats.stability}%</span>
          </div>

          <div className="flex items-center gap-1.5" title="Prospérité Économique & Énergétique">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Prospérité</span>
            <span className="font-mono font-semibold text-amber-300">{civStats.prosperity}%</span>
          </div>

          <div className="flex items-center gap-1.5" title="Savoir Scientifique & Chroniques">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Savoir</span>
            <span className="font-mono font-semibold text-sky-300">{civStats.knowledge}%</span>
          </div>

          <div className="flex items-center gap-1.5" title="Rayonnement & Influence Impériale">
            <Scale className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Influence</span>
            <span className="font-mono font-semibold text-purple-300">{civStats.influence}%</span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1 text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              {buildings.length} édifices ({civStats.totalPlanetaryBuildings} global)
            </span>
            <span className="flex items-center gap-1 text-slate-200">
              <Users className="w-3.5 h-3.5 text-sky-300" />
              {npcs.length} citoyens ({civStats.totalPlanetaryPopulation} global)
            </span>
          </div>
        </GlassPanel>
      )}
    </header>
  );
};
