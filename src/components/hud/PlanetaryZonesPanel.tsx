import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Building2,
  Compass,
  Globe2,
  MapPin,
  Rocket,
  Sparkles,
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
  selectedNpcIdAtom,
  worldViewModeAtom,
  zonesRuntimeMapAtom,
} from '../../stores/worldStore';
import { PLANETARY_ZONES, PlanetaryZoneDefinition } from '../../config/planetaryZones';
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
 * Interactive Planetary Atlas Panel showing the 6 Plateau Zones distributed across the 3D Planet Globe.
 * Visible automatically in 3D Planet Globe mode or when toggled from the HUD.
 * Clicking a zone focuses it on the 3D globe or lands directly on its 3D Arrival Zone!
 */
export const PlanetaryZonesPanel: React.FC<PlanetaryZonesPanelProps> = ({
  onTriggerShuttleLanding,
}) => {
  const [worldViewMode, setWorldViewMode] = useAtom(worldViewModeAtom);
  const [isDrawerOpen, setIsDrawerOpen] = useAtom(isZonesDrawerOpenAtom);
  const [activeZoneId, setActiveZoneId] = useAtom(activeZoneIdAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const zonesMap = useAtomValue(zonesRuntimeMapAtom);

  const setPresetId = useSetAtom(activePresetIdAtom);
  const setReliefScale = useSetAtom(reliefScaleAtom);
  const setCameraMode = useSetAtom(cameraModeAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);

  const isPlanet3D = worldViewMode === view_MODE_PLANET_3D;
  if (!isPlanet3D && !isDrawerOpen) return null;

  const handleSelectZoneOnGlobe = (zone: PlanetaryZoneDefinition) => {
    setActiveZoneId(zone.id);
    setPresetId(zone.presetId);
    setReliefScale(zone.reliefScale);
  };

  const handleLandOnPlateauZone = (zone: PlanetaryZoneDefinition) => {
    setActiveZoneId(zone.id);
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

  return (
    <aside className="fixed top-20 left-3 sm:left-5 z-30 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[calc(100dvh-11rem)] flex flex-col pointer-events-auto">
      <GlassPanel className="p-4 sm:p-5 flex flex-col max-h-full overflow-hidden border-sky-300/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-sky-300 shrink-0" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-amber-50">
                Zones Plateau de la Planète 3D
              </h2>
              <p className="text-[11px] text-slate-400">
                Cliquez sur un marqueur 3D du globe ou choisissez une région
              </p>
            </div>
          </div>
          {!isPlanet3D && (
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
            <span>Atterrir sur la Zone d’Arrivée (Plateau 3D)</span>
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
