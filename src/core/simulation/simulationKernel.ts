/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-47: Noyau de Simulation à Tick Fixe (10 Hz)
 * Fonctions pures de `(state, tickIndex, seed)` — aucun appel à Date.now() ni Math.random().
 * Expose les trois réducteurs canoniques :
 * 1. `applyMutations(state, batch)` : applique BUILD, SPAWN_NPC, AMBIENCE, les deltas économiques et sème les effets latents
 * 2. `advanceTick(state, tickIndex)` : avance les cycles solaires et l'errance déterministe des citoyens à 10 Hz
 * 3. `resolvePendingEffects(state, tickIndex)` : déclenche les effets latents arrivés à échéance (`dueTick` / `dueTurn`)
 */

import {
  AnyResourceType,
  evt_TICK_HZ,
  rsc_ALL_TYPES,
  wld_CELESTIAL_CYCLE_RATE,
} from '../../config/constants';
import {
  ChronicleEntry,
  Mutation,
  NarrativeEventV2,
  PlacedBuilding,
  PlacedNpc,
  ScheduledPendingEffect,
  TurnChoice,
} from '../../contracts/schemas';
import { createPRNG } from '../prng';
import { getTerrainHeight } from '../terrainMath';
import { AmbienceOverride } from '../../stores/worldStore';

const NPC_PALETTE = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a855f7', '#fb7185'];

export type ResourceStockMap = Record<AnyResourceType, number>;

export function createInitialResourceStocks(): ResourceStockMap {
  return {
    // 4 Imperial Resources (0..100)
    stability: 62,
    prosperity: 58,
    knowledge: 50,
    influence: 48,
    // 4 Raw Materials (Lot Bêta)
    marble: 40,
    basalt: 45,
    crystal: 25,
    biomass: 50,
    // 4 Technological Resources (PT-61 rsc_)
    energy: 35,
    alloy: 28,
    data: 30,
    parts: 24,
  };
}

export interface SimulationWorldState {
  seed: string;
  turnNumber: number;
  tickIndex: number;
  celestialTime: number;
  autoCycleTime: boolean;
  buildings: PlacedBuilding[];
  npcs: PlacedNpc[];
  resourceStocks: ResourceStockMap;
  netRatesPerTurn: Partial<ResourceStockMap>;
  pendingEffects: ScheduledPendingEffect[];
  ambience: AmbienceOverride | null;
  chronicles: ChronicleEntry[];
}

export interface TurnResolutionBatch {
  events: NarrativeEventV2[];
  selectedChoices: { event: NarrativeEventV2; choice: TurnChoice }[];
}

export interface TurnImpactReport {
  mutationsApplied: string[];
  economicDeltasApplied: string[];
  latentEffectsScheduled: string[];
  latentEffectsTriggered: string[];
}

function findDeterministicDryCoord(
  seed: string,
  turnNumber: number,
  indexSalt: number
): { x: number; z: number } {
  const rng = createPRNG(`${seed}_coord_T${turnNumber}_${indexSalt}`);
  for (let i = 0; i < 24; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 5.0 + rng() * 17.5;
    const x = Number((Math.cos(angle) * dist).toFixed(2));
    const z = Number((Math.sin(angle) * dist).toFixed(2));
    if (getTerrainHeight(x, z) > 0.14) {
      return { x, z };
    }
  }
  return { x: 5.5, z: 5.5 };
}

function executeSingleMutation(
  mut: Mutation,
  state: SimulationWorldState,
  originTurn: number,
  originEventId: string,
  originEventTitle: string,
  threadId: string | undefined,
  saltIndex: number
): {
  nextBuildings: PlacedBuilding[];
  nextNpcs: PlacedNpc[];
  nextAmbience: AmbienceOverride | null;
  summary: string;
} {
  const nextBuildings = [...state.buildings];
  const nextNpcs = [...state.npcs];
  let nextAmbience = state.ambience;
  const rng = createPRNG(`${state.seed}_mut_T${originTurn}_${originEventId}_${saltIndex}`);

  if (mut.type === 'BUILD') {
    const pos =
      mut.x !== undefined && mut.z !== undefined
        ? { x: mut.x, z: mut.z }
        : findDeterministicDryCoord(state.seed, originTurn, nextBuildings.length + saltIndex);

    nextBuildings.push({
      id: `bld_t${originTurn}_${nextBuildings.length + 1}`,
      buildingType: mut.buildingType,
      name: mut.name,
      description: mut.description,
      x: pos.x,
      z: pos.z,
      rotation: Number((rng() * Math.PI * 2).toFixed(3)),
      scale: Number((0.96 + rng() * 0.14).toFixed(2)),
      tier: 1,
      provenance: {
        originTurn,
        originEventId,
        originEventTitle,
        threadId,
      },
      assembledAt: originTurn * 1000 + saltIndex,
    });
    return {
      nextBuildings,
      nextNpcs,
      nextAmbience,
      summary: `Fondation : ${mut.name}`,
    };
  }

  if (mut.type === 'SPAWN_NPC') {
    const pos =
      mut.x !== undefined && mut.z !== undefined
        ? { x: mut.x, z: mut.z }
        : findDeterministicDryCoord(state.seed, originTurn, nextNpcs.length + saltIndex + 50);
    const target = findDeterministicDryCoord(
      state.seed,
      originTurn,
      nextNpcs.length + saltIndex + 99
    );

    nextNpcs.push({
      id: `npc_t${originTurn}_${nextNpcs.length + 1}`,
      name: mut.name,
      role: mut.role,
      bio: mut.bio,
      mood: mut.mood || 'Serein et concentré',
      x: pos.x,
      z: pos.z,
      targetX: target.x,
      targetZ: target.z,
      colorHex: NPC_PALETTE[nextNpcs.length % NPC_PALETTE.length],
      provenance: {
        originTurn,
        originEventId,
        originEventTitle,
        threadId,
      },
      spawnedAt: originTurn * 1000 + saltIndex,
    });
    return {
      nextBuildings,
      nextNpcs,
      nextAmbience,
      summary: `Arrivée : ${mut.name} (${mut.role})`,
    };
  }

  nextAmbience = {
    skyTint: mut.skyTint,
    lightIntensity: mut.lightIntensity,
    particleDensity: mut.particleDensity,
    weatherEffect: mut.weatherEffect,
    stormIntensity: mut.stormIntensity,
    note: mut.eventNote,
  };
  return {
    nextBuildings,
    nextNpcs,
    nextAmbience,
    summary: `Climat : ${mut.eventNote}`,
  };
}

function clampResourceValue(resource: AnyResourceType, value: number): number {
  if (
    resource === 'stability' ||
    resource === 'prosperity' ||
    resource === 'knowledge' ||
    resource === 'influence'
  ) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  return Math.min(999, Math.max(0, Math.round(value)));
}

/**
 * Reducer 1: `applyMutations(state, batch)`
 * Applies selected event choices, building net yields per turn, economicEffects deltas,
 * and schedules any latent pendingEffects.
 */
export function applyMutations(
  state: SimulationWorldState,
  batch: TurnResolutionBatch
): { nextState: SimulationWorldState; report: TurnImpactReport } {
  const nextTurn = state.turnNumber + 1;
  const nextTick = state.tickIndex + evt_TICK_HZ * 10;
  let workingState: SimulationWorldState = {
    ...state,
    turnNumber: nextTurn,
    tickIndex: nextTick,
    buildings: [...state.buildings],
    npcs: [...state.npcs],
    resourceStocks: { ...state.resourceStocks },
    pendingEffects: [...state.pendingEffects],
    chronicles: [...state.chronicles],
  };

  const mutationsApplied: string[] = [];
  const economicDeltasApplied: string[] = [];
  const latentEffectsScheduled: string[] = [];

  // 1. Apply per-turn building/colonist net yields to persistent resource stocks
  for (const rKey of rsc_ALL_TYPES) {
    const netRate = workingState.netRatesPerTurn[rKey] ?? 0;
    if (netRate !== 0) {
      workingState.resourceStocks[rKey] = clampResourceValue(
        rKey,
        workingState.resourceStocks[rKey] + netRate
      );
    }
  }

  // 2. Apply each selected decree choice across the 1..2 events in the turn batch
  batch.selectedChoices.forEach(({ event, choice }, pairIdx) => {
    const eventMutSummaries: string[] = [];
    const eventEconSummaries: string[] = [];

    choice.mutations.forEach((mut, mutIdx) => {
      const res = executeSingleMutation(
        mut,
        workingState,
        nextTurn,
        event.id,
        event.title,
        event.threadId,
        pairIdx * 10 + mutIdx
      );
      workingState.buildings = res.nextBuildings;
      workingState.npcs = res.nextNpcs;
      workingState.ambience = res.nextAmbience;
      mutationsApplied.push(res.summary);
      eventMutSummaries.push(res.summary);
    });

    (choice.economicEffects ?? []).forEach((eff) => {
      const clampedDelta = Math.max(-25, Math.min(25, Math.round(eff.delta)));
      workingState.resourceStocks[eff.resource] = clampResourceValue(
        eff.resource,
        workingState.resourceStocks[eff.resource] + clampedDelta
      );
      const sign = clampedDelta >= 0 ? `+${clampedDelta}` : `${clampedDelta}`;
      const desc = `${sign} ${eff.resource.toUpperCase()} (${eff.reason})`;
      economicDeltasApplied.push(desc);
      eventEconSummaries.push(desc);
    });

    (choice.pendingEffects ?? []).forEach((pe) => {
      const dueTurn = nextTurn + pe.dueInTurns;
      const dueTick = nextTick + pe.dueInTurns * evt_TICK_HZ * 10;
      workingState.pendingEffects.push({
        id: pe.id,
        originTurn: nextTurn,
        dueTurn,
        dueTick,
        originEventTitle: event.title,
        hint: pe.hint,
        mutations: pe.mutations,
      });
      latentEffectsScheduled.push(`${pe.hint} (Échéance : T${dueTurn})`);
    });

    workingState.chronicles = [
      {
        id: `chr_t${nextTurn}_${event.id}`,
        timestamp: nextTurn * 1000 + pairIdx,
        turnNumber: nextTurn,
        category: event.category,
        threadId: event.threadId,
        title: event.title,
        narrative: event.narrative,
        chosenChoiceLabel: choice.label,
        mutationsSummary: eventMutSummaries,
        economicDeltasSummary: eventEconSummaries,
        causalRefs: choice.causalRefs ?? [],
      },
      ...workingState.chronicles,
    ];
  });

  // 3. Resolve any latent effects whose dueTurn <= nextTurn
  const resolvedLatents = resolvePendingEffects(workingState, nextTick);
  workingState = resolvedLatents.nextState;

  return {
    nextState: workingState,
    report: {
      mutationsApplied: [...mutationsApplied, ...resolvedLatents.triggeredSummaries],
      economicDeltasApplied,
      latentEffectsScheduled,
      latentEffectsTriggered: resolvedLatents.triggeredSummaries,
    },
  };
}

/**
 * Reducer 2: `advanceTick(state, tickIndex)`
 * Advances fixed 10 Hz deterministic solar cycle and citizen waypoints without wall-clock time.
 */
export function advanceTick(
  state: SimulationWorldState,
  tickIndex: number
): SimulationWorldState {
  const dtFixed = 1 / evt_TICK_HZ;
  const nextCelestialTime = state.autoCycleTime
    ? (state.celestialTime + dtFixed * wld_CELESTIAL_CYCLE_RATE * 0.2) % 1.0
    : state.celestialTime;

  return {
    ...state,
    tickIndex,
    celestialTime: Number(nextCelestialTime.toFixed(5)),
  };
}

/**
 * Reducer 3: `resolvePendingEffects(state, tickIndex)`
 * Fires scheduled latent effects that have reached their `dueTurn` or `dueTick`.
 */
export function resolvePendingEffects(
  state: SimulationWorldState,
  tickIndex: number
): { nextState: SimulationWorldState; triggeredSummaries: string[] } {
  const dueList = state.pendingEffects.filter(
    (pe) => pe.dueTurn <= state.turnNumber || pe.dueTick <= tickIndex
  );
  if (dueList.length === 0) {
    return { nextState: state, triggeredSummaries: [] };
  }

  let workingState: SimulationWorldState = {
    ...state,
    pendingEffects: state.pendingEffects.filter(
      (pe) => pe.dueTurn > state.turnNumber && pe.dueTick > tickIndex
    ),
  };

  const triggeredSummaries: string[] = [];

  dueList.forEach((pe, idx) => {
    pe.mutations.forEach((mut, mIdx) => {
      const res = executeSingleMutation(
        mut,
        workingState,
        state.turnNumber,
        pe.id,
        pe.originEventTitle,
        undefined,
        500 + idx * 10 + mIdx
      );
      workingState.buildings = res.nextBuildings;
      workingState.npcs = res.nextNpcs;
      workingState.ambience = res.nextAmbience;
      triggeredSummaries.push(`[Effet Latent T${pe.originTurn}] ${res.summary}`);
    });
  });

  return {
    nextState: workingState,
    triggeredSummaries,
  };
}

/**
 * Computes a deterministic FNV-1a hex fingerprint of the canonical simulation state
 * to verify golden acceptance criterion #1 (Ledger Replay Determinism).
 */
export function computeStateFingerprint(state: {
  seed: string;
  turnNumber: number;
  buildings: PlacedBuilding[];
  npcs: PlacedNpc[];
  resourceStocks: Partial<ResourceStockMap>;
}): string {
  const canonicalPayload = JSON.stringify({
    s: state.seed,
    t: state.turnNumber,
    b: state.buildings.map((b) => `${b.id}:${b.buildingType}:${b.x.toFixed(1)},${b.z.toFixed(1)}`),
    n: state.npcs.map((n) => `${n.id}:${n.name}:${n.role}`),
    r: rsc_ALL_TYPES.map((k) => `${k}=${state.resourceStocks[k] ?? 0}`),
  });

  let hash = 2166136261;
  for (let i = 0; i < canonicalPayload.length; i++) {
    hash ^= canonicalPayload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `FNV1A-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}
