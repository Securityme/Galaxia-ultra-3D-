import React, { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  activePresetAtom,
  activeZoneDefAtom,
  buildingCountAtom,
  buildingsAtom,
  cameraZoomStepSignalAtom,
  chroniclesAtom,
  civilizationStatsAtom,
  currentTurnEventAtom,
  isGeneratingEventAtom,
  npcAssignmentsMapAtom,
  npcsAtom,
  pendingEffectsQueueAtom,
  populationCountAtom,
  turnLedgerAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
} from './stores/worldStore';
import { assembleHierarchicalWorldBrief } from './core/events/turnOrchestrator';
import { requestNextHistoricalTurn } from './services/aiTurnService';
import { SceneDirector } from './three/director';
import { TerrariumMount } from './components/canvas/TerrariumMount';
import { BootSequenceScreen } from './components/boot/BootSequenceScreen';
import { TopTelemetryBar } from './components/hud/TopTelemetryBar';
import { PlanetaryZonesPanel } from './components/hud/PlanetaryZonesPanel';
import { BottomControlDock } from './components/hud/BottomControlDock';
import { EventDialog } from './components/modals/EventDialog';
import { EventJournalModal } from './components/modals/EventJournalModal';
import { SectorPresetsModal } from './components/modals/SectorPresetsModal';
import { WorldSettingsModal } from './components/modals/WorldSettingsModal';
import { SaveManagerModal } from './components/modals/SaveManagerModal';
import { GameConfigModal } from './components/modals/GameConfigModal';
import { RpgCatalogsAndArchitectModal } from './components/modals/RpgCatalogsAndArchitectModal';
import { BlueprintArchitectureModal } from './components/modals/BlueprintArchitectureModal';
import { ResourceLedgerModal } from './components/modals/ResourceLedgerModal';
import { ColonistAssignmentModal } from './components/modals/ColonistAssignmentModal';
import { NpcInspectorModal } from './components/inspectors/NpcInspectorModal';
import { BuildingInspectorModal } from './components/inspectors/BuildingInspectorModal';
import { ArrivalZoneInspectorModal } from './components/inspectors/ArrivalZoneInspectorModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function MainApp() {
  const directorRef = useRef<SceneDirector | null>(null);

  const worldName = useAtomValue(worldNameAtom);
  const turnNumber = useAtomValue(turnNumberAtom);
  const seed = useAtomValue(worldSeedAtom);
  const buildingCount = useAtomValue(buildingCountAtom);
  const population = useAtomValue(populationCountAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const activePreset = useAtomValue(activePresetAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const customAssignments = useAtomValue(npcAssignmentsMapAtom);
  const civStats = useAtomValue(civilizationStatsAtom);
  const chronicles = useAtomValue(chroniclesAtom);
  const pendingQueue = useAtomValue(pendingEffectsQueueAtom);
  const turnLedger = useAtomValue(turnLedgerAtom);
  const zoomSignal = useAtomValue(cameraZoomStepSignalAtom);

  const setIsGeneratingEvent = useSetAtom(isGeneratingEventAtom);
  const setCurrentTurnEvent = useSetAtom(currentTurnEventAtom);
  const rqClient = useQueryClient();

  // R-PT-59: Listen to WCAG accessibility zoom step signals from WorldSettingsModal
  useEffect(() => {
    if (zoomSignal.seq > 0) {
      directorRef.current?.zoomCamera(zoomSignal.delta);
    }
  }, [zoomSignal]);

  const turnMutation = useMutation({
    mutationFn: async () => {
      const worldBrief = assembleHierarchicalWorldBrief({
        turnNumber: turnNumber + 1,
        seed: `${seed}_${activeZone.id}`,
        empireName: worldName,
        epochName: civStats.epochName,
        imperialYear: civStats.imperialYear,
        activeZone: {
          id: activeZone.id,
          name: activeZone.name,
          biome: activePreset.name,
          subBiomes: activePreset.subBiomes.map((sb) => sb.name),
        },
        resourceStocks: civStats.stocks,
        netRatesPerTurn: civStats.netRatesAll,
        buildings,
        npcs,
        customAssignments,
        chronicles,
        pendingEffects: pendingQueue,
        ledgerRecords: turnLedger,
      });

      return await requestNextHistoricalTurn({
        turnNumber: turnNumber + 1,
        seed: `${seed}_${activeZone.id}`,
        buildingCount,
        population,
        sectorName: activeZone.name,
        empireName: worldName,
        biomeName: activePreset.name,
        climateEffectLabel: activePreset.climateEffectLabel,
        subBiomeNames: activePreset.subBiomes.map((sb) => sb.name),
        resourceRates: {
          stability: civStats.stability,
          prosperity: civStats.prosperity,
          knowledge: civStats.knowledge,
          influence: civStats.influence,
          netStabilityPerTurn: civStats.economy.ledgers.stability.netRatePerTurn,
          netProsperityPerTurn: civStats.economy.ledgers.prosperity.netRatePerTurn,
          netKnowledgePerTurn: civStats.economy.ledgers.knowledge.netRatePerTurn,
          netInfluencePerTurn: civStats.economy.ledgers.influence.netRatePerTurn,
        },
        worldBrief,
      });
    },
    onMutate: () => {
      setIsGeneratingEvent(true);
    },
    onSuccess: (batch) => {
      setCurrentTurnEvent(batch);
      rqClient.invalidateQueries({ queryKey: ['turnLedger'] });
    },
    onError: (err) => {
      console.error('[TurnMutation] Failed to generate historical turn:', err);
    },
    onSettled: () => {
      setIsGeneratingEvent(false);
    },
  });

  const handleTriggerTurnEvent = () => {
    turnMutation.mutate();
  };

  const handleTriggerShuttleLanding = () => {
    directorRef.current?.triggerArrivalShuttleLanding();
  };

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#070d19] text-slate-100 select-none">
      {/* 3D WebGL Scene */}
      <TerrariumMount directorRef={directorRef} />

      {/* Minimalist Top Header with Non-Floating Docked Resources */}
      <TopTelemetryBar />

      {/* 3D Globe Direct-Click Zone Entry Window & Optional Atlas Drawer */}
      <PlanetaryZonesPanel onTriggerShuttleLanding={handleTriggerShuttleLanding} />

      {/* Entity & Arrival Port Inspectors */}
      <NpcInspectorModal />
      <BuildingInspectorModal />
      <ArrivalZoneInspectorModal onTriggerShuttleLanding={handleTriggerShuttleLanding} />

      {/* Collapsible Bottom Control Dock */}
      <BottomControlDock onTriggerTurnEvent={handleTriggerTurnEvent} />

      {/* Modals & Dialogs */}
      <EventDialog />
      <EventJournalModal />
      <ResourceLedgerModal />
      <ColonistAssignmentModal />
      <SectorPresetsModal />
      <WorldSettingsModal />
      <SaveManagerModal />
      <GameConfigModal />
      <RpgCatalogsAndArchitectModal />
      <BlueprintArchitectureModal />

      {/* 3-Stage Cinematic 3D Boot -> Mandatory Google Firebase Auth -> Imperial Main Menu */}
      <BootSequenceScreen />

      {/* TanStack Query Devtools */}
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
    </main>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
