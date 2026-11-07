import React, { useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeZoneDefAtom,
  buildingCountAtom,
  currentTurnEventAtom,
  isGeneratingEventAtom,
  populationCountAtom,
  turnNumberAtom,
  worldSeedAtom,
} from './stores/worldStore';
import { requestNextHistoricalTurn } from './services/aiTurnService';
import { SceneDirector } from './three/director';
import { TerrariumMount } from './components/canvas/TerrariumMount';
import { BootSequenceScreen } from './components/boot/BootSequenceScreen';
import { TopTelemetryBar } from './components/hud/TopTelemetryBar';
import { PlanetaryZonesPanel } from './components/hud/PlanetaryZonesPanel';
import { TouchNavigationPad } from './components/hud/TouchNavigationPad';
import { BottomControlDock } from './components/hud/BottomControlDock';
import { EventDialog } from './components/modals/EventDialog';
import { EventJournalModal } from './components/modals/EventJournalModal';
import { SectorPresetsModal } from './components/modals/SectorPresetsModal';
import { WorldSettingsModal } from './components/modals/WorldSettingsModal';
import { SaveManagerModal } from './components/modals/SaveManagerModal';
import { GameConfigModal } from './components/modals/GameConfigModal';
import { RpgCatalogsAndArchitectModal } from './components/modals/RpgCatalogsAndArchitectModal';
import { BlueprintArchitectureModal } from './components/modals/BlueprintArchitectureModal';
import { NpcInspectorModal } from './components/inspectors/NpcInspectorModal';
import { BuildingInspectorModal } from './components/inspectors/BuildingInspectorModal';
import { ArrivalZoneInspectorModal } from './components/inspectors/ArrivalZoneInspectorModal';

export default function App() {
  const directorRef = useRef<SceneDirector | null>(null);

  const turnNumber = useAtomValue(turnNumberAtom);
  const seed = useAtomValue(worldSeedAtom);
  const buildingCount = useAtomValue(buildingCountAtom);
  const population = useAtomValue(populationCountAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);

  const setIsGeneratingEvent = useSetAtom(isGeneratingEventAtom);
  const setCurrentTurnEvent = useSetAtom(currentTurnEventAtom);

  const handleTriggerTurnEvent = async () => {
    setIsGeneratingEvent(true);
    try {
      const batch = await requestNextHistoricalTurn({
        turnNumber: turnNumber + 1,
        seed: `${seed}_${activeZone.id}`,
        buildingCount,
        population,
        sectorName: activeZone.name,
      });
      setCurrentTurnEvent(batch);
    } finally {
      setIsGeneratingEvent(false);
    }
  };

  const handleZoomDelta = (dZoom: number) => {
    directorRef.current?.zoomCamera(dZoom);
  };

  const handleMoveDelta = (dRight: number, dForward: number) => {
    directorRef.current?.panCamera(dRight, dForward);
  };

  const handleRotateDelta = (dAzimuth: number, dPolar: number) => {
    directorRef.current?.rotateCamera(dAzimuth, dPolar);
  };

  const handleTriggerShuttleLanding = () => {
    directorRef.current?.triggerArrivalShuttleLanding();
  };

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#070d19] text-slate-100 select-none">
      {/* 3D WebGL Scene (Cinematic Orbital Planet + Flagship, Curved Plateau, Beaches, Mountains, Urban Districts & GLTF/RPG NPCs) */}
      <TerrariumMount directorRef={directorRef} />

      {/* Minimalist Top Header with Retractable Resources */}
      <TopTelemetryBar />

      {/* Interactive Atlas of the 6 Planetary Plateau Zones */}
      <PlanetaryZonesPanel onTriggerShuttleLanding={handleTriggerShuttleLanding} />

      {/* Entity & Arrival Port Inspectors (Docked cleanly ABOVE the footer, never overlapping header or footer) */}
      <NpcInspectorModal />
      <BuildingInspectorModal />
      <ArrivalZoneInspectorModal onTriggerShuttleLanding={handleTriggerShuttleLanding} />

      {/* On-Screen Gesture & Direction Pad */}
      <TouchNavigationPad
        onMoveDelta={handleMoveDelta}
        onRotateDelta={handleRotateDelta}
      />

      {/* Collapsible Bottom Control Dock with Contextual "Vue" & "Play" Drawers */}
      <BottomControlDock
        onTriggerTurnEvent={handleTriggerTurnEvent}
        onZoomDelta={handleZoomDelta}
      />

      {/* Modals, RPG Catalogs, Cloud Saves & Blueprint */}
      <EventDialog />
      <EventJournalModal />
      <SectorPresetsModal />
      <WorldSettingsModal />
      <SaveManagerModal />
      <GameConfigModal />
      <RpgCatalogsAndArchitectModal />
      <BlueprintArchitectureModal />

      {/* 3-Stage Cinematic 3D Boot -> Mandatory Google Firebase Auth -> Imperial Main Menu */}
      <BootSequenceScreen />
    </main>
  );
}
