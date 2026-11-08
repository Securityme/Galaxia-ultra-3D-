import React, { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activePresetAtom,
  activePresetIdAtom,
  activeZoneIdAtom,
  ambienceOverrideAtom,
  buildingsAtom,
  cameraModeAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  globeZoneClickSignalAtom,
  graphicsQualityPresetAtom,
  isArrivalZoneSelectedAtom,
  isBootScreenOpenAtom,
  npcAssignmentsMapAtom,
  npcsAtom,
  reducedMotionAtom,
  reliefScaleAtom,
  activeWeatherTypeAtom,
  architectSandboxTypeAtom,
  renderPerfMetricsAtom,
  selectedBuildingIdAtom,
  selectedGlobeZoneIdAtom,
  selectedNpcIdAtom,
  worldSeedAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import { getPlanetaryZoneById } from '../../config/planetaryZones';
import { SceneDirector } from '../../three/director';

export interface TerrariumMountProps {
  directorRef?: React.MutableRefObject<SceneDirector | null>;
}

/**
 * Isolated WebGL 3D canvas mount that reads from Jotai state and drives SceneDirector.
 */
export const TerrariumMount: React.FC<TerrariumMountProps> = ({ directorRef }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalDirectorRef = useRef<SceneDirector | null>(null);

  const isBootScreenOpen = useAtomValue(isBootScreenOpenAtom);
  const seed = useAtomValue(worldSeedAtom);
  const activeZoneId = useAtomValue(activeZoneIdAtom);
  const reliefScale = useAtomValue(reliefScaleAtom);
  const preset = useAtomValue(activePresetAtom);
  const worldViewMode = useAtomValue(worldViewModeAtom);
  const cameraMode = useAtomValue(cameraModeAtom);
  const celestialTime = useAtomValue(celestialTimeAtom);
  const autoCycleTime = useAtomValue(celestialAutoCycleAtom);
  const ambience = useAtomValue(ambienceOverrideAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const npcAssignments = useAtomValue(npcAssignmentsMapAtom);
  const selectedNpcId = useAtomValue(selectedNpcIdAtom);
  const selectedBuildingId = useAtomValue(selectedBuildingIdAtom);
  const isArrivalZoneSelected = useAtomValue(isArrivalZoneSelectedAtom);
  const architectSandboxType = useAtomValue(architectSandboxTypeAtom);
  const graphicsQualityPreset = useAtomValue(graphicsQualityPresetAtom);
  const reducedMotion = useAtomValue(reducedMotionAtom);

  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);
  const setSelectedGlobeZoneId = useSetAtom(selectedGlobeZoneIdAtom);
  const setGlobeZoneClickSignal = useSetAtom(globeZoneClickSignalAtom);
  const setActiveZoneId = useSetAtom(activeZoneIdAtom);
  const setPresetId = useSetAtom(activePresetIdAtom);
  const setReliefScale = useSetAtom(reliefScaleAtom);
  const setRenderPerfMetrics = useSetAtom(renderPerfMetricsAtom);
  const setActiveWeather = useSetAtom(activeWeatherTypeAtom);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const director = new SceneDirector(el, {
      onSelectNpc: (id) => setSelectedNpcId(id),
      onSelectBuilding: (id) => setSelectedBuildingId(id),
      onSelectArrivalZone: (selected) => setIsArrivalZoneSelected(selected),
      onSelectPlanetZone: (zoneId) => {
        if (!zoneId) {
          setSelectedGlobeZoneId(null);
          return;
        }
        const zone = getPlanetaryZoneById(zoneId);
        setActiveZoneId(zone.id);
        setPresetId(zone.presetId);
        setReliefScale(zone.reliefScale);
        setSelectedGlobeZoneId(zone.id);
        setGlobeZoneClickSignal((prev) => ({ seq: prev.seq + 1, zoneId: zone.id }));
      },
      onUpdatePerfMetrics: (metrics) => setRenderPerfMetrics(metrics),
      onUpdateWeather: (w) => setActiveWeather(w),
    });

    internalDirectorRef.current = director;
    if (directorRef) {
      directorRef.current = director;
    }

    return () => {
      director.dispose();
      internalDirectorRef.current = null;
      if (directorRef) {
        directorRef.current = null;
      }
    };
  }, [
    directorRef,
    setActiveZoneId,
    setGlobeZoneClickSignal,
    setIsArrivalZoneSelected,
    setPresetId,
    setReliefScale,
    setRenderPerfMetrics,
    setActiveWeather,
    setSelectedBuildingId,
    setSelectedGlobeZoneId,
    setSelectedNpcId,
  ]);

  useEffect(() => {
    const director = internalDirectorRef.current;
    if (!director) return;

    director.syncState({
      isBootScreenOpen,
      seed,
      activeZoneId,
      reliefScale,
      preset,
      worldViewMode,
      cameraMode,
      celestialTime,
      autoCycleTime,
      ambience,
      buildings,
      npcs,
      npcAssignments,
      selectedNpcId,
      selectedBuildingId,
      isArrivalZoneSelected,
      architectSandboxType,
      graphicsQualityPreset,
      reducedMotion,
    });
  }, [
    isBootScreenOpen,
    seed,
    activeZoneId,
    reliefScale,
    preset,
    worldViewMode,
    cameraMode,
    celestialTime,
    autoCycleTime,
    ambience,
    buildings,
    npcs,
    npcAssignments,
    selectedNpcId,
    selectedBuildingId,
    isArrivalZoneSelected,
    graphicsQualityPreset,
    reducedMotion,
  ]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none touch-none z-0"
      aria-label="Galaxia Ultra Bio-Dôme de Poche 3D Canvas"
    />
  );
};
