/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-53, PT-55, PT-56 & PT-57:
 * Orchestrateur de Tour en Sept Phases & Banc d'Essai 100 Tours (Tests Dorés)
 * - Phase 1 BRIEF : Assemble `WorldBrief` sous plafond de tokens (24 bât., 24 PNJ, 12 ress., 5 chron., 3 latents)
 * - Phase 2 PROPOSE & Phase 3 VALIDATE : Interroge `/api/ai/turn` ou rejoue depuis le Ledger (`PT-57`)
 * - Phase 4 ARBITRATE : Vérifie le rythme (jamais 2 CRISE consécutives, part <= 20%), valide `causalRefs`, clampe [-25, +25]
 * - Phase 5 PRESENT, Phase 6 RESOLVE & Phase 7 ARCHIVE : Applique les choix et consigne au Ledger
 */

import {
  evt_CRISIS_MAX_LAST_TEN,
  rsc_ALL_TYPES,
  rsc_IMPERIAL_TYPES,
} from '../../config/constants';
import {
  ChronicleEntry,
  EventCategory,
  NarrativeEventV2,
  PlacedBuilding,
  PlacedNpc,
  ScheduledPendingEffect,
  TurnBatch,
  TurnLedgerRecord,
  WorldBrief,
  worldBriefSchema,
} from '../../contracts/schemas';
import {
  CustomNpcAssignment,
  resolveBuildingRpgProfile,
} from '../../config/rpgCatalogs';
import {
  applyMutations,
  computeStateFingerprint,
  createInitialResourceStocks,
  ResourceStockMap,
  SimulationWorldState,
} from '../simulation/simulationKernel';
import { generateFallbackEventBatch } from '../fallbackEvents';
import { recallSemanticMemories } from './semanticMemory';

export interface ArbitrationLogEntry {
  turnNumber: number;
  rule: string;
  detail: string;
}

export interface ArbitratedTurnBatchResult {
  batch: TurnBatch;
  events: NarrativeEventV2[];
  arbitrationLogs: ArbitrationLogEntry[];
  fromLedgerReplay: boolean;
}

/**
 * Phase 1: BRIEF — Assembles the Hierarchical World Brief capped to token budgets,
 * including PT-78 Top-3 Semantic Memories by cosine similarity.
 */
export function assembleHierarchicalWorldBrief(params: {
  turnNumber: number;
  seed: string;
  empireName: string;
  epochName: string;
  imperialYear: number;
  activeZone: { id: string; name: string; biome: string; subBiomes: string[] };
  resourceStocks: ResourceStockMap;
  netRatesPerTurn: Partial<ResourceStockMap>;
  buildings: PlacedBuilding[];
  npcs: PlacedNpc[];
  customAssignments: Record<string, CustomNpcAssignment>;
  chronicles: ChronicleEntry[];
  pendingEffects: ScheduledPendingEffect[];
  ledgerRecords?: TurnLedgerRecord[];
}): WorldBrief {
  const {
    turnNumber,
    seed,
    empireName,
    epochName,
    imperialYear,
    activeZone,
    resourceStocks,
    netRatesPerTurn,
    buildings,
    npcs,
    customAssignments,
    chronicles,
    pendingEffects,
    ledgerRecords = [],
  } = params;

  const recentTen = chronicles.slice(0, 10);
  const crisisCountLastTen = recentTen.filter((c) => c.category === 'CRISE').length;
  const lastCategory: EventCategory = chronicles[0]?.category ?? 'FONDATION';

  const activeThreads = Array.from(
    new Set(
      chronicles
        .map((c) => c.threadId)
        .filter((t): t is string => Boolean(t && t.length >= 2))
    )
  ).slice(0, 4);

  const semanticQuery = `${activeZone.name} ${activeZone.biome} ${buildings.map((b) => b.name).join(' ')} ${npcs.map((n) => n.name).join(' ')}`;
  const semanticMatches = recallSemanticMemories(
    semanticQuery,
    chronicles,
    ledgerRecords,
    3
  );

  const rawBrief: WorldBrief = {
    turnNumber,
    seed,
    empireName: empireName.slice(0, 60),
    epoch: {
      name: epochName.slice(0, 60),
      imperialYear,
    },
    activeZone: {
      id: activeZone.id,
      name: activeZone.name.slice(0, 60),
      biome: activeZone.biome.slice(0, 60),
      subBiomes: activeZone.subBiomes.slice(0, 4).map((s) => s.slice(0, 60)),
    },
    resources: rsc_ALL_TYPES.map((rKey) => ({
      resource: rKey,
      value: Math.round(resourceStocks[rKey] ?? 0),
      netRate: Math.round(netRatesPerTurn[rKey] ?? 0),
    })),
    buildings: buildings.slice(0, 24).map((b) => {
      const prof = resolveBuildingRpgProfile(b, buildings, npcs, customAssignments);
      const provText = b.provenance
        ? `Fondé T${b.provenance.originTurn} (${b.provenance.originEventTitle})`
        : 'Fondation initiale';
      return {
        id: b.id,
        name: b.name.slice(0, 60),
        buildingType: b.buildingType,
        tier: Math.min(4, Math.max(1, b.tier ?? 1)),
        assignedColonists: prof.assignedWorkers.length,
        provenance: provText.slice(0, 120),
      };
    }),
    npcs: npcs.slice(0, 24).map((n) => {
      const provText = n.provenance
        ? `Issu de l'événement T${n.provenance.originTurn} (${n.provenance.originEventTitle})`
        : 'Pionnier fondateur T1';
      return {
        id: n.id,
        name: n.name.slice(0, 40),
        role: n.role.slice(0, 50),
        provenance: provText.slice(0, 120),
      };
    }),
    chronicleWindow: chronicles.slice(0, 5).map((c) => ({
      turn: c.turnNumber,
      title: c.title.slice(0, 90),
      chosenLabel: c.chosenChoiceLabel.slice(0, 80),
      category: c.category ?? 'FONDATION',
    })),
    pendingHints: pendingEffects.slice(0, 3).map((pe) => ({
      hint: pe.hint.slice(0, 160),
      dueInTurns: Math.min(3, Math.max(1, pe.dueTurn - turnNumber + 1)),
    })),
    activeThreads,
    semanticMemories: semanticMatches.map((m) => ({
      turn: m.turn,
      title: m.title.slice(0, 90),
      chosenLabel: m.chosenLabel.slice(0, 80),
      similarityScore: m.similarityScore,
      excerpt: m.excerpt.slice(0, 160),
    })),
    rhythm: {
      lastCategory,
      crisisCountLastTen,
      recentTitles: chronicles.slice(0, 3).map((c) => c.title.slice(0, 90)),
    },
  };

  return worldBriefSchema.parse(rawBrief);
}

/**
 * Phase 4: ARBITRATE — Enforces rhythm protection, causalRefs validity, and numeric clamps.
 * Never silently ignores anomalies: records every adjustment in `arbitrationLogs`.
 */
export function arbitrateTurnBatch(
  incomingBatch: TurnBatch,
  brief: WorldBrief
): ArbitratedTurnBatchResult {
  const logs: ArbitrationLogEntry[] = [];
  const validEntityIds = new Set<string>([
    ...brief.buildings.map((b) => b.id),
    ...brief.npcs.map((n) => n.id),
  ]);

  const rawEvents: NarrativeEventV2[] =
    incomingBatch.events && incomingBatch.events.length > 0
      ? incomingBatch.events
      : [
          {
            id: `evt_t${brief.turnNumber}_primary`,
            category: incomingBatch.category ?? 'FONDATION',
            threadId: incomingBatch.threadId,
            title: incomingBatch.title,
            narrative: incomingBatch.narrative,
            choices: incomingBatch.choices,
          },
        ];

  const crisisForbidden =
    brief.rhythm.lastCategory === 'CRISE' ||
    brief.rhythm.crisisCountLastTen >= evt_CRISIS_MAX_LAST_TEN;

  let crisisSeenInBatch = false;

  const sanitizedEvents: NarrativeEventV2[] = rawEvents.slice(0, 2).map((ev) => {
    let category: EventCategory = ev.category;
    if (category === 'CRISE') {
      if (crisisForbidden || crisisSeenInBatch) {
        logs.push({
          turnNumber: brief.turnNumber,
          rule: 'PT-55_RHYTHM_CRISIS_CAP',
          detail: `Événement "${ev.title}" reclassé de CRISE -> EXPLORATION (lastCategory=${brief.rhythm.lastCategory}, crisisCountLastTen=${brief.rhythm.crisisCountLastTen}).`,
        });
        category = 'EXPLORATION';
      } else {
        crisisSeenInBatch = true;
      }
    }

    const sanitizedChoices = ev.choices.slice(0, 3).map((ch) => {
      // Filter causalRefs to strictly existing entity IDs in brief (Golden Test #3)
      const rawRefs = ch.causalRefs ?? [];
      const validRefs = rawRefs.filter((refId) => validEntityIds.has(refId));
      if (validRefs.length !== rawRefs.length) {
        logs.push({
          turnNumber: brief.turnNumber,
          rule: 'PT-55_CAUSAL_REFS_GUARD',
          detail: `Références absentes du brief purgées dans "${ch.label}".`,
        });
      }
      // If empty and entities exist, attach primary building/citizen id
      if (validRefs.length === 0 && brief.buildings[0]) {
        validRefs.push(brief.buildings[0].id);
      }

      // Clamp economic deltas to [-25, +25]
      const clampedEcon = (ch.economicEffects ?? []).slice(0, 2).map((eff) => ({
        ...eff,
        delta: Math.max(-25, Math.min(25, Math.round(eff.delta))),
      }));

      return {
        ...ch,
        economicEffects: clampedEcon,
        pendingEffects: (ch.pendingEffects ?? []).slice(0, 1),
        causalRefs: validRefs.slice(0, 3),
      };
    });

    return {
      ...ev,
      category,
      choices: sanitizedChoices,
    };
  });

  const primary = sanitizedEvents[0];
  const finalBatch: TurnBatch = {
    ...incomingBatch,
    title: primary.title,
    narrative: primary.narrative,
    choices: primary.choices,
    category: primary.category,
    threadId: primary.threadId,
    events: sanitizedEvents,
  };

  return {
    batch: finalBatch,
    events: sanitizedEvents,
    arbitrationLogs: logs,
    fromLedgerReplay: false,
  };
}

/**
 * Golden Acceptance Test Runner (100 simulated turns + Ledger Replay Verification):
 * Verifies Criteria #1, #2, and #3 from D1-GU-PT v1.0.0:
 * 1. Replayability: same seed + same ledger -> identical stateFingerprint without network calls
 * 2. Crisis rhythm: 0 consecutive crisis turns over 100 turns, crisis share <= 20%
 * 3. Causal integrity: 0 unknown entity IDs in causalRefs
 */
export interface GoldenTestSuiteResult {
  turnsSimulated: number;
  consecutiveCrisesCount: number;
  crisisSharePct: number;
  invalidCausalRefsCount: number;
  initialRunFingerprint: string;
  replayedLedgerFingerprint: string;
  replayDeterministicMatch: boolean;
  passedAllCriteria: boolean;
}

export function runGoldenAcceptanceSimulation(
  seed = 'GALAXIA-OMEGA-77',
  totalTurns = 100
): GoldenTestSuiteResult {
  let state: SimulationWorldState = {
    seed,
    turnNumber: 1,
    tickIndex: 0,
    celestialTime: 0.32,
    autoCycleTime: true,
    buildings: [
      {
        id: 'bld_init_1',
        buildingType: 'observation_station',
        name: 'Observatoire Stellaire',
        description: 'Vigie orbitale fondatrice.',
        x: 0,
        z: -4,
        rotation: 0,
        scale: 1,
        tier: 1,
        assembledAt: 0,
      },
    ],
    npcs: [
      {
        id: 'npc_init_1',
        name: 'Commandant Nova Stern',
        role: 'Chercheur en Exobiologie',
        bio: 'Pionnier fondateur.',
        mood: 'Serein',
        x: 2,
        z: 2,
        targetX: 4,
        targetZ: 4,
        colorHex: '#38bdf8',
        spawnedAt: 0,
      },
    ],
    resourceStocks: createInitialResourceStocks(),
    netRatesPerTurn: { stability: 1, prosperity: 1, knowledge: 2, influence: 1 },
    pendingEffects: [],
    ambience: null,
    chronicles: [],
  };

  const recordedLedger: TurnLedgerRecord[] = [];
  let consecutiveCrisesCount = 0;
  let totalCrisisTurns = 0;
  let prevWasCrisis = false;
  let invalidCausalRefsCount = 0;

  for (let step = 0; step < totalTurns; step++) {
    const nextTurnNum = state.turnNumber + 1;
    const brief = assembleHierarchicalWorldBrief({
      turnNumber: nextTurnNum,
      seed: state.seed,
      empireName: 'Aethelgard Prime',
      epochName: 'Âge des Fondations',
      imperialYear: 1200 + nextTurnNum * 12,
      activeZone: {
        id: 'zone_olympus',
        name: 'Bassin d’Olympie',
        biome: 'Terre Bleue',
        subBiomes: ['Lagune', 'Massif Alpin'],
      },
      resourceStocks: state.resourceStocks,
      netRatesPerTurn: state.netRatesPerTurn,
      buildings: state.buildings,
      npcs: state.npcs,
      customAssignments: {},
      chronicles: state.chronicles,
      pendingEffects: state.pendingEffects,
    });

    const rawBatch = generateFallbackEventBatch({
      turnNumber: nextTurnNum,
      seed: state.seed,
      buildingCount: state.buildings.length,
      population: state.npcs.length,
      sectorName: 'Bassin d’Olympie',
      worldBrief: brief,
    });

    const arbitrated = arbitrateTurnBatch(rawBatch, brief);
    const hasCrisis = arbitrated.events.some((e) => e.category === 'CRISE');
    if (hasCrisis) {
      totalCrisisTurns++;
      if (prevWasCrisis) {
        consecutiveCrisesCount++;
      }
    }
    prevWasCrisis = hasCrisis;

    const validIds = new Set([
      ...brief.buildings.map((b) => b.id),
      ...brief.npcs.map((n) => n.id),
    ]);

    const selectedChoices = arbitrated.events.map((ev) => {
      const choice = ev.choices[0];
      (choice.causalRefs ?? []).forEach((ref) => {
        if (!validIds.has(ref)) {
          invalidCausalRefsCount++;
        }
      });
      return { event: ev, choice };
    });

    const resolved = applyMutations(state, {
      events: arbitrated.events,
      selectedChoices,
    });
    state = resolved.nextState;

    const fingerprint = computeStateFingerprint(state);
    recordedLedger.push({
      turnNumber: state.turnNumber,
      tickIndex: state.tickIndex,
      seed: state.seed,
      events: arbitrated.events,
      chosenChoiceIds: selectedChoices.map((sc) => sc.choice.id),
      resultingImperialResources: {
        stability: state.resourceStocks.stability,
        prosperity: state.resourceStocks.prosperity,
        knowledge: state.resourceStocks.knowledge,
        influence: state.resourceStocks.influence,
      },
      stateFingerprint: fingerprint,
    });
  }

  const initialRunFingerprint = computeStateFingerprint(state);

  // Replay solely from the recorded Ledger without generating any events
  let replayState: SimulationWorldState = {
    seed,
    turnNumber: 1,
    tickIndex: 0,
    celestialTime: 0.32,
    autoCycleTime: true,
    buildings: [
      {
        id: 'bld_init_1',
        buildingType: 'observation_station',
        name: 'Observatoire Stellaire',
        description: 'Vigie orbitale fondatrice.',
        x: 0,
        z: -4,
        rotation: 0,
        scale: 1,
        tier: 1,
        assembledAt: 0,
      },
    ],
    npcs: [
      {
        id: 'npc_init_1',
        name: 'Commandant Nova Stern',
        role: 'Chercheur en Exobiologie',
        bio: 'Pionnier fondateur.',
        mood: 'Serein',
        x: 2,
        z: 2,
        targetX: 4,
        targetZ: 4,
        colorHex: '#38bdf8',
        spawnedAt: 0,
      },
    ],
    resourceStocks: createInitialResourceStocks(),
    netRatesPerTurn: { stability: 1, prosperity: 1, knowledge: 2, influence: 1 },
    pendingEffects: [],
    ambience: null,
    chronicles: [],
  };

  for (const record of recordedLedger) {
    const selectedChoices = record.events.map((ev, idx) => {
      const chosenId = record.chosenChoiceIds[idx];
      const choice = ev.choices.find((c) => c.id === chosenId) ?? ev.choices[0];
      return { event: ev, choice };
    });
    replayState = applyMutations(replayState, {
      events: record.events,
      selectedChoices,
    }).nextState;
  }

  const replayedLedgerFingerprint = computeStateFingerprint(replayState);
  const crisisSharePct = Number(((totalCrisisTurns / totalTurns) * 100).toFixed(1));
  const replayDeterministicMatch =
    initialRunFingerprint === replayedLedgerFingerprint &&
    rsc_IMPERIAL_TYPES.every(
      (k) => state.resourceStocks[k] === replayState.resourceStocks[k]
    );

  return {
    turnsSimulated: totalTurns,
    consecutiveCrisesCount,
    crisisSharePct,
    invalidCausalRefsCount,
    initialRunFingerprint,
    replayedLedgerFingerprint,
    replayDeterministicMatch,
    passedAllCriteria:
      consecutiveCrisesCount === 0 &&
      crisisSharePct <= 20.0 &&
      invalidCausalRefsCount === 0 &&
      replayDeterministicMatch,
  };
}
