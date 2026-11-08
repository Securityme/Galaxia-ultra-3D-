import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Building2,
  Compass,
  Globe2,
  Layers,
  MapPin,
  Rocket,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  activePresetIdAtom,
  activeZoneDefAtom,
  activeZoneIdAtom,
  cameraModeAtom,
  isArrivalZoneSelectedAtom,
  isZonesDrawerOpenAtom,
  reliefScaleAtom,
  selectedBuildingIdAtom,
  selectedGlobeZoneIdAtom,
  selectedNpcIdAtom,
  worldViewModeAtom,
  zonesRuntimeMapAtom,
} from '../../stores/worldStore';
import {
  PLANETARY_ZONES,
  PlanetaryZoneDefinition,
  getPlanetaryZoneById,
} from '../../config/planetaryZones';
import { getPresetById } from '../../config/presets';
import {
  cam_MODE_ARRIVAL,
  view_MODE_PLANET_3D,
  view_MODE_PLATEAU,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

export interface PlanetaryZonesPanelProps {
  onTriggerShuttleLanding: () => void;
}

/**
 * Interactive 3D Globe Zone Inspector & Optional Atlas Drawer.
 * - In 3D Planet Globe mode: NO plateau list window is shown automatically.
 *   Instead, clicking directly on a 3D zone marker on the globe opens a dedicated
 *   entry window with the biome, internal sub-biomes, and "Entrer dans ce Plateau 3D".
 */
export const PlanetaryZonesPanel: React.FC<PlanetaryZonesPanelProps> = ({
  onTriggerShuttleLanding,
}) => {
  const [worldViewMode, setWorldViewMode] = useAtom(worldViewModeAtom);
  const [isDrawerOpen, setIsDrawerOpen] = useAtom(isZonesDrawerOpenAtom);
  const [activeZoneId, setActiveZoneId] = useAtom(activeZoneIdAtom);
  const [selectedGlobeZoneId, setSelectedGlobeZoneId] = useAtom(selectedGlobeZoneIdAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const zonesMap = useAtomValue(zonesRuntimeMapAtom);

  const setPresetId = useSetAtom(activePresetIdAtom);
  const setReliefScale = useSetAtom(reliefScaleAtom);
  const setCameraMode = useSetAtom(cameraModeAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);

  const isPlanet3D = worldViewMode === view_MODE_PLANET_3D;

  const handleSelectZoneOnGlobe = (zone: PlanetaryZoneDefinition) => {
    setActiveZoneId(zone.id);
    setSelectedGlobeZoneId(zone.id);
    setPresetId(zone.presetId);
    setReliefScale(zone.reliefScale);
  };

  const handleLandOnPlateauZone = (zone: PlanetaryZoneDefinition) => {
    setActiveZoneId(zone.id);
    setSelectedGlobeZoneId(null);
    setPresetId(zone.presetId);
    setReliefScale(zone.reliefScale);
    setSelectedNpcId(null);
    setSelectedBuildingId(null);
    setIsArrivalZoneSelected(true);
    setWorldViewMode(view_MODE_PLATEAU);
    setCameraMode(cam_MODE_ARRIVAL);
    setIsDrawerOpen(false);
    onTriggerShuttleLanding();
  };

  // 1. In 3D Globe View: Only show the direct-click Zone Entry Window when a zone on the 3D globe is clicked
  if (isPlanet3D && !isDrawerOpen) {
    if (!selectedGlobeZoneId) {
      return (
        <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="rounded-full border border-sky-300/30 bg-slate-950/75 backdrop-blur-md px-4 py-1.5 text-[11px] font-mono text-sky-200 shadow-lg flex items-center gap-2">
            <Globe2 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Cliquez directement sur une zone lumineuse du Globe 3D pour l’inspecter et y entrer</span>
          </div>
        </div>
      );
    }

    const clickedZone = getPlanetaryZoneById(selectedGlobeZoneId);
    const zonePreset = getPresetById(clickedZone.presetId);
    const runtime = zonesMap[clickedZone.id];
    const bldCount = runtime?.buildings.length ?? clickedZone.initialBuildings.length;
    const npcCount = runtime?.npcs.length ?? 3;

    return (
      <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,540px)] pointer-events-auto px-1 animate-in fade-in zoom-in-95 duration-150">
        <GlassPanel className="p-4 sm:p-5 border-amber-300/45 shadow-[0_22px_65px_rgba(0,0,0,0.85)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/25 shrink-0"
                style={{ backgroundColor: `${clickedZone.beaconColor}28` }}
              >
                <Globe2 className="w-5 h-5" style={{ color: clickedZone.beaconColor }} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  <span className="text-amber-300">{clickedZone.regionCode}</span>
                  <span className="text-slate-400">
                    • Lat {clickedZone.latDeg}° / Lon {clickedZone.lonDeg}°
                  </span>
                  <span className="rounded-md bg-sky-400/15 border border-sky-300/30 px-2 py-0.5 text-sky-200">
                    {zonePreset.name}
                  </span>
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-amber-50 mt-0.5">
                  {clickedZone.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedGlobeZoneId(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fermer la fenêtre de la zone"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2.5 text-xs text-slate-200 leading-relaxed">
            {clickedZone.description}
          </p>

          {/* Biome Climate & Internal Sub-Biomes */}
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-200 font-medium">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                {zonePreset.climateEffectLabel}
              </span>
              <span className="flex items-center gap-1 text-emerald-300 font-mono text-[10px]">
                <Sparkles className="w-3 h-3" />
                {clickedZone.strategicBonus}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-sky-300" />
                Sous-Biomes Internes du Plateau ({zonePreset.subBiomes.length})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {zonePreset.subBiomes.map((sb) => (
                  <div
                    key={sb.id}
                    className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/10 px-2 py-1 text-[10px]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: sb.colorHex }}
                    />
                    <div className="truncate">
                      <span className="text-slate-100 font-medium block truncate">
                        {sb.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono block truncate">
                        {sb.climateTag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats + Enter Plateau CTA */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1 text-amber-200">
                <Rocket className="w-3.5 h-3.5 text-amber-300" />
                {clickedZone.arrivalPortName}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                {bldCount} édifices
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-300" />
                {npcCount} colons
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleLandOnPlateauZone(clickedZone)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg hover:brightness-110 transition cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Entrer dans ce Plateau 3D</span>
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!isDrawerOpen) return null;

  return (
    <aside className="fixed top-20 left-3 sm:left-5 z-30 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[calc(100dvh-11rem)] flex flex-col pointer-events-auto">
      <GlassPanel className="p-4 sm:p-5 flex flex-col max-h-full overflow-hidden border-sky-300/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-sky-300 shrink-0" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-amber-50">
                Atlas des 6 Zones Planétaires
              </h2>
              <p className="text-[11px] text-slate-400">
                Sélectionnez un secteur ou entrez sur son plateau 3D
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Zone Details & Direct Plunge to Arrival Zone Button */}
        <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-400/10 p-3.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-300">
            <span>{activeZone.regionCode}</span>
            <span>
              Lat {activeZone.latDeg}° • Lon {activeZone.lonDeg}°
            </span>
          </div>
          <h3 className="mt-0.5 font-serif text-base font-semibold text-amber-50">
            {activeZone.name}
          </h3>
          <p className="mt-1 text-xs text-slate-200/90 leading-relaxed">
            {activeZone.description}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{activeZone.strategicBonus}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-amber-200/90 flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Arrivée : {activeZone.arrivalPortName}</span>
          </div>

          <button
            type="button"
            onClick={() => handleLandOnPlateauZone(activeZone)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:brightness-110 transition cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Entrer sur le Plateau 3D</span>
          </button>
        </div>

        {/* Scrollable List of the 6 Planetary Plateau Zones */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {PLANETARY_ZONES.map((zone) => {
            const isSelected = zone.id === activeZoneId;
            const runtime = zonesMap[zone.id];
            const bldCount = runtime?.buildings.length ?? zone.initialBuildings.length;
            const npcCount = runtime?.npcs.length ?? 3;

            return (
              <div
                key={zone.id}
                onClick={() => handleSelectZoneOnGlobe(zone)}
                className={`rounded-xl border p-2.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-sky-300 bg-sky-400/15'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: zone.beaconColor }}
                    />
                    <span className="font-serif font-semibold text-xs sm:text-sm text-slate-100">
                      {zone.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-300" />
                    {zone.latDeg}°, {zone.lonDeg}°
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="truncate max-w-[165px]">{zone.arrivalPortName}</span>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-amber-300" />
                      {bldCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-sky-300" />
                      {npcCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </aside>
  );
};
