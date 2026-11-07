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
  isArrivalZoneSelectedAtom,
  isBootScreenOpenAtom,
  npcsAtom,
  reliefScaleAtom,
  selectedBuildingIdAtom,
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
  const selectedNpcId = useAtomValue(selectedNpcIdAtom);
  const selectedBuildingId = useAtomValue(selectedBuildingIdAtom);
  const isArrivalZoneSelected = useAtomValue(isArrivalZoneSelectedAtom);

  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);
  const setActiveZoneId = useSetAtom(activeZoneIdAtom);
  const setPresetId = useSetAtom(activePresetIdAtom);
  const setReliefScale = useSetAtom(reliefScaleAtom);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const director = new SceneDirector(el, {
      onSelectNpc: (id) => setSelectedNpcId(id),
      onSelectBuilding: (id) => setSelectedBuildingId(id),
      onSelectArrivalZone: (selected) => setIsArrivalZoneSelected(selected),
      onSelectPlanetZone: (zoneId) => {
        const zone = getPlanetaryZoneById(zoneId);
        setActiveZoneId(zone.id);
        setPresetId(zone.presetId);
        setReliefScale(zone.reliefScale);
      },
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
    setIsArrivalZoneSelected,
    setPresetId,
    setReliefScale,
    setSelectedBuildingId,
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
      selectedNpcId,
      selectedBuildingId,
      isArrivalZoneSelected,
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
    selectedNpcId,
    selectedBuildingId,
    isArrivalZoneSelected,
  ]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none touch-none z-0"
      aria-label="Pax Historia 3D World Canvas"
    />
  );
};
