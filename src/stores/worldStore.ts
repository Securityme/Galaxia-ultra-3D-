/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Reactive World Store (Jotai)
 * Central state for:
 * - 3D Boot, Mandatory Google Firebase Authentication & Imperial Main Menu
 * - Plateau vs 3D Planet Globe views & 6 Planetary Plateau Zones
 * - Persistent 3-Family Economy (Imperial, Material, Technological rsc_), Latent Effects & Deterministic Turn Ledger (PT-47..PT-61, PT-78, PT-81)
 * - RPG Catalogs, Noble Houses, Architect Visualizer & Blueprint Modal
 */

import { atom, SetStateAction } from 'jotai';
import {
  BuildingType,
  CameraMode,
  cam_MODE_ORBIT,
  WorldViewMode,
  view_MODE_PLATEAU,
  WeatherType,
  rsc_ALL_TYPES,
  wtr_CALM,
} from '../config/constants';
import {
  computeDemographicGauges,
  computeSandboxMilestones,
  DemographicGauges,
  SandboxMilestone,
} from '../core/sandbox/sandboxProgression';
import {
  PlacedBuilding,
  PlacedNpc,
  ChronicleEntry,
  TurnBatch,
  WorldPreset,
  ScheduledPendingEffect,
  TurnLedgerRecord,
} from '../contracts/schemas';
import { getPresetById } from '../config/presets';
import {
  DEFAULT_GAME_CONFIG,
  INITIAL_CHRONICLES,
} from '../config/gameDefaults';
import {
  PLANETARY_ZONES,
  PlanetaryZoneDefinition,
  PlanetaryZoneRuntimeState,
  buildInitialZonesRuntimeMap,
  getPlanetaryZoneById,
} from '../config/planetaryZones';
import {
  CustomNpcAssignment,
  ExtendedResourceKey,
  ResourceKey,
  ResourceLedgerBreakdown,
  SOLAR_CODEX_DECREES,
  computeExtendedResourceLedger,
} from '../config/rpgCatalogs';
import {
  ResourceStockMap,
  createInitialResourceStocks,
} from '../core/simulation/simulationKernel';
import { configureTerrain } from '../core/terrainMath';
import { CommanderAuthUser } from '../services/firebaseService';

/* ==========================================================================
   Boot, Firebase Authentication & Main Menu Atoms
   ========================================================================== */

export const isBootScreenOpenAtom = atom<boolean>(true);
export const commanderAuthUserAtom = atom<CommanderAuthUser | null>(null);

/* ==========================================================================
   Core World, Multi-Zone & Game Configuration Atoms
   ========================================================================== */

export const worldNameAtom = atom<string>(DEFAULT_GAME_CONFIG.worldName);
export const worldSeedAtom = atom<string>(DEFAULT_GAME_CONFIG.seed);

// Active Planetary Plateau Zone ID (6 distinct zones across the 3D globe)
export const activeZoneIdAtom = atom<string>(PLANETARY_ZONES[0].id);

export const activeZoneDefAtom = atom<PlanetaryZoneDefinition>((get) => {
  const id = get(activeZoneIdAtom);
  return getPlanetaryZoneById(id);
});

const ZONES_RUNTIME_STORAGE_KEY = 'galaxia_zones_runtime_v2';

function loadInitialZonesRuntimeMap(): Record<string, PlanetaryZoneRuntimeState> {
  const fallback = buildInitialZonesRuntimeMap();
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(ZONES_RUNTIME_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, PlanetaryZoneRuntimeState>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

const baseZonesRuntimeMapAtom = atom<Record<string, PlanetaryZoneRuntimeState>>(
  loadInitialZonesRuntimeMap()
);

export const zonesRuntimeMapAtom = atom(
  (get) => get(baseZonesRuntimeMapAtom),
  (get, set, update: SetStateAction<Record<string, PlanetaryZoneRuntimeState>>) => {
    const current = get(baseZonesRuntimeMapAtom);
    const next = typeof update === 'function' ? update(current) : update;
    set(baseZonesRuntimeMapAtom, next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ZONES_RUNTIME_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Ignore storage quota errors
    }
  }
);

export const activePresetIdAtom = atom<string>(DEFAULT_GAME_CONFIG.presetId);

export const activePresetAtom = atom<WorldPreset>((get) => {
  const id = get(activePresetIdAtom);
  return getPresetById(id);
});

export const reliefScaleAtom = atom<number>(DEFAULT_GAME_CONFIG.reliefScale);

export const worldViewModeAtom = atom<WorldViewMode>(view_MODE_PLATEAU);
export const cameraModeAtom = atom<CameraMode>(cam_MODE_ORBIT);

export const celestialTimeAtom = atom<number>(0.32);
export const celestialAutoCycleAtom = atom<boolean>(DEFAULT_GAME_CONFIG.autoCycleTime);
export const activeWeatherTypeAtom = atom<WeatherType>(wtr_CALM);

// Fixed-tick simulation counter (PT-47: 10 Hz)
export const simulationTickAtom = atom<number>(0);

// WCAG Accessibility Zoom step command from WorldSettingsModal (R-PT-59)
export const cameraZoomStepSignalAtom = atom<{ seq: number; delta: number }>({
  seq: 0,
  delta: 0,
});

// Direct 3D Globe Plateau Click Signal (for instant plateau selection/resumption in Main Menu)
export const globeZoneClickSignalAtom = atom<{ seq: number; zoneId: string | null }>({
  seq: 0,
  zoneId: null,
});

/* ==========================================================================
   Persistent Resource Stocks, Latent Pending Effects & Deterministic Ledger (PT-52, PT-57, PT-61)
   ========================================================================== */

export const resourceStocksAtom = atom<ResourceStockMap>(createInitialResourceStocks());
export const pendingEffectsQueueAtom = atom<ScheduledPendingEffect[]>([]);
export const turnLedgerAtom = atom<TurnLedgerRecord[]>([]);

export const enactSolarCodexDecreeAtom = atom(
  null,
  (get, set, decreeId: string) => {
    const decree = SOLAR_CODEX_DECREES.find((d) => d.id === decreeId);
    if (!decree) return false;

    const stocks = { ...get(resourceStocksAtom) };
    // Verify costs
    for (const [k, costVal] of Object.entries(decree.costs)) {
      const rKey = k as ExtendedResourceKey;
      if ((stocks[rKey] ?? 0) < (costVal ?? 0)) {
        return false;
      }
    }

    // Deduct costs
    for (const [k, costVal] of Object.entries(decree.costs)) {
      const rKey = k as ExtendedResourceKey;
      stocks[rKey] = Math.max(0, (stocks[rKey] ?? 0) - (costVal ?? 0));
    }

    // Apply bonuses
    for (const [k, bonusVal] of Object.entries(decree.bonuses)) {
      const rKey = k as ExtendedResourceKey;
      const cap =
        rKey === 'stability' ||
        rKey === 'prosperity' ||
        rKey === 'knowledge' ||
        rKey === 'influence'
          ? 100
          : 999;
      stocks[rKey] = Math.min(cap, Math.max(0, (stocks[rKey] ?? 0) + (bonusVal ?? 0)));
    }

    set(resourceStocksAtom, stocks);

    // Optional Tier IV Monument elevation
    if (decree.upgradeTargetBuildingTier4) {
      const currentBlds = get(buildingsAtom);
      if (currentBlds.length > 0) {
        const targetId = get(selectedBuildingIdAtom) ?? currentBlds[0].id;
        set(
          buildingsAtom,
          currentBlds.map((b) =>
            b.id === targetId ? { ...b, tier: 4 } : b
          )
        );
      }
    }

    // Record chronicle entry for the decree
    const turn = get(turnNumberAtom);
    const prevChronicles = get(chroniclesAtom);
    set(chroniclesAtom, [
      {
        id: `chr_codex_${decree.id}_${turn}_${prevChronicles.length}`,
        timestamp: turn * 1000 + prevChronicles.length,
        turnNumber: turn,
        category: 'CEREMONIE',
        title: `Codex Solaire [${decree.code}] : ${decree.title}`,
        narrative: decree.description,
        chosenChoiceLabel: 'Ratification Technologique Hélios',
        mutationsSummary: decree.upgradeTargetBuildingTier4
          ? ['Élévation Monumentale Palier IV']
          : ['Activation du Codex Solaire'],
        economicDeltasSummary: Object.entries(decree.bonuses).map(
          ([k, v]) => `+${v} ${k.toUpperCase()}`
        ),
        causalRefs: [],
      },
      ...prevChronicles,
    ]);

    return true;
  }
);

/* ==========================================================================
   Custom Colonist Building Assignments (Work & Home) & Building Upgrades
   ========================================================================== */

export const npcAssignmentsMapAtom = atom<Record<string, CustomNpcAssignment>>({});

export const assignNpcToBuildingAtom = atom(
  null,
  (
    get,
    set,
    payload: { npcId: string; workBuildingId?: string; homeBuildingId?: string }
  ) => {
    const prev = get(npcAssignmentsMapAtom);
    const current = prev[payload.npcId] ?? {};
    set(npcAssignmentsMapAtom, {
      ...prev,
      [payload.npcId]: {
        workBuildingId: payload.workBuildingId ?? current.workBuildingId,
        homeBuildingId: payload.homeBuildingId ?? current.homeBuildingId,
      },
    });
  }
);

export const upgradeBuildingTierAtom = atom(null, (get, set, buildingId: string) => {
  const currentBlds = get(buildingsAtom);
  set(
    buildingsAtom,
    currentBlds.map((b) =>
      b.id === buildingId
        ? { ...b, tier: Math.min(4, (b.tier ?? 1) + 1) }
        : b
    )
  );
});

export const setBuildingMaterialPresetAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      buildingId: string;
      materialPreset:
        | 'carrara_gold'
        | 'obsidian_bronze'
        | 'porphyry_imperial'
        | 'celestial_azure'
        | 'emerald_travertine';
    }
  ) => {
    const currentBlds = get(buildingsAtom);
    set(
      buildingsAtom,
      currentBlds.map((b) =>
        b.id === payload.buildingId
          ? { ...b, materialPreset: payload.materialPreset }
          : b
      )
    );
  }
);

/* ==========================================================================
   Entities & Chronicles Atoms (Scoped to Active Plateau Zone)
   ========================================================================== */

export const buildingsAtom = atom(
  (get) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    return map[zoneId]?.buildings ?? [];
  },
  (get, set, update: SetStateAction<PlacedBuilding[]>) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    const current = map[zoneId]?.buildings ?? [];
    const next = typeof update === 'function' ? update(current) : update;
    set(zonesRuntimeMapAtom, {
      ...map,
      [zoneId]: {
        ...(map[zoneId] ?? { zoneId, npcs: [], convoysReceived: 1 }),
        buildings: next,
      },
    });
  }
);

export const npcsAtom = atom(
  (get) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    return map[zoneId]?.npcs ?? [];
  },
  (get, set, update: SetStateAction<PlacedNpc[]>) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    const current = map[zoneId]?.npcs ?? [];
    const next = typeof update === 'function' ? update(current) : update;
    set(zonesRuntimeMapAtom, {
      ...map,
      [zoneId]: {
        ...(map[zoneId] ?? { zoneId, buildings: [], convoysReceived: 1 }),
        npcs: next,
      },
    });
  }
);

export const activeZoneConvoysAtom = atom(
  (get) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    return map[zoneId]?.convoysReceived ?? 1;
  },
  (get, set, delta: number) => {
    const zoneId = get(activeZoneIdAtom);
    const map = get(zonesRuntimeMapAtom);
    const current = map[zoneId];
    if (!current) return;
    set(zonesRuntimeMapAtom, {
      ...map,
      [zoneId]: {
        ...current,
        convoysReceived: current.convoysReceived + delta,
      },
    });
  }
);

export const chroniclesAtom = atom<ChronicleEntry[]>(INITIAL_CHRONICLES);
export const eventJournalAtom = chroniclesAtom;

export const turnNumberAtom = atom<number>(1);

export interface CivilizationStats {
  stability: number;
  prosperity: number;
  knowledge: number;
  influence: number;
  stabilityNet: number;
  prosperityNet: number;
  knowledgeNet: number;
  influenceNet: number;
  stocks: ResourceStockMap;
  netRatesAll: Record<ExtendedResourceKey, number>;
  economy: {
    ledgers: Record<ResourceKey, ResourceLedgerBreakdown>;
    allLedgers: Record<ExtendedResourceKey, ResourceLedgerBreakdown>;
  };
  demographics: DemographicGauges;
  milestones: SandboxMilestone[];
  currentMilestone: SandboxMilestone;
  happiness: number;
  education: number;
  ecologyHealth: number;
  employmentRate: number;
  epochName: string;
  seasonName: string;
  imperialYear: number;
  totalPlanetaryBuildings: number;
  totalPlanetaryPopulation: number;
}

const EPOCH_NAMES = [
  'Âge des Fondations',
  'Renaissance Cartographique',
  'Siècle des Phares Énergétiques',
  'Pax Continentalis',
  'Apogée Astrale',
];

const SEASON_NAMES = [
  'Solstice d’Or',
  'Zénith Émeraude',
  'Équinoxe d’Ambre',
  'Veille Stellaire',
];

export const civilizationStatsAtom = atom<CivilizationStats>((get) => {
  const map = get(zonesRuntimeMapAtom);
  let totalBlds = 0;
  let totalPop = 0;
  Object.values(map).forEach((z) => {
    totalBlds += z.buildings.length;
    totalPop += z.npcs.length;
  });

  const activeBlds = get(buildingsAtom);
  const activePop = get(npcsAtom);
  const assignments = get(npcAssignmentsMapAtom);
  const turn = get(turnNumberAtom);
  const stocks = get(resourceStocksAtom);

  const allLedgers = {} as Record<ExtendedResourceKey, ResourceLedgerBreakdown>;
  const netRatesAll = {} as Record<ExtendedResourceKey, number>;

  for (const rKey of rsc_ALL_TYPES) {
    const ledger = computeExtendedResourceLedger(rKey, activeBlds, activePop, assignments);
    allLedgers[rKey] = ledger;
    netRatesAll[rKey] = ledger.netRatePerTurn;
  }

  const stabLedger = allLedgers.stability;
  const prospLedger = allLedgers.prosperity;
  const knowLedger = allLedgers.knowledge;
  const inflLedger = allLedgers.influence;

  const demographics = computeDemographicGauges(stocks, activeBlds, activePop, assignments);
  const milestones = computeSandboxMilestones(
    stocks,
    activeBlds,
    activePop,
    demographics,
    totalBlds,
    totalPop
  );
  const currentMilestone =
    milestones.find((m) => !m.isUnlocked) ?? milestones[milestones.length - 1];

  const epochIndex = Math.min(EPOCH_NAMES.length - 1, Math.floor((turn - 1) / 3));
  const seasonName = SEASON_NAMES[(turn - 1) % SEASON_NAMES.length];

  return {
    stability: Math.min(100, Math.max(0, stocks.stability)),
    prosperity: Math.min(100, Math.max(0, stocks.prosperity)),
    knowledge: Math.min(100, Math.max(0, stocks.knowledge)),
    influence: Math.min(100, Math.max(0, stocks.influence)),
    stabilityNet: stabLedger.netRatePerTurn,
    prosperityNet: prospLedger.netRatePerTurn,
    knowledgeNet: knowLedger.netRatePerTurn,
    influenceNet: inflLedger.netRatePerTurn,
    stocks,
    netRatesAll,
    economy: {
      ledgers: {
        stability: stabLedger,
        prosperity: prospLedger,
        knowledge: knowLedger,
        influence: inflLedger,
      },
      allLedgers,
    },
    demographics,
    milestones,
    currentMilestone,
    happiness: demographics.happiness,
    education: demographics.education,
    ecologyHealth: demographics.ecologyHealth,
    employmentRate: demographics.employmentRate,
    epochName: EPOCH_NAMES[epochIndex],
    seasonName,
    imperialYear: 1200 + turn * 12,
    totalPlanetaryBuildings: totalBlds,
    totalPlanetaryPopulation: totalPop,
  };
});

/* ==========================================================================
   Selection, HUD Drawers & Modal Atoms
   ========================================================================== */

export const selectedNpcIdAtom = atom<string | null>(null);
export const selectedBuildingIdAtom = atom<string | null>(null);
export const isArrivalZoneSelectedAtom = atom<boolean>(false);
export const selectedGlobeZoneIdAtom = atom<string | null>(null);

export const isGeneratingEventAtom = atom<boolean>(false);
export const currentTurnEventAtom = atom<TurnBatch | null>(null);

// Minimalist Header retractable resources state & clicked Resource Ledger (default collapsed/retracted as requested)
export const isHeaderResourcesOpenAtom = atom<boolean>(false);
export const selectedResourceLedgerKeyAtom = atom<ExtendedResourceKey | null>(null);
export const isColonistAssignmentOpenAtom = atom<boolean>(false);

// Blender-Grade Rendering Quality Preset & Discipline (PT-31 & PT-32)
export type GraphicsQualityMode = 'cinema' | 'balanced' | 'performance';
export const graphicsQualityPresetAtom = atom<GraphicsQualityMode>('cinema');
export const reducedMotionAtom = atom<boolean>(
  typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);
export const isPerfHudOpenAtom = atom<boolean>(false);

export interface RenderPerfMetrics {
  frameTimeMs: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

export const renderPerfMetricsAtom = atom<RenderPerfMetrics>({
  frameTimeMs: 8.2,
  fps: 60,
  drawCalls: 42,
  triangles: 48500,
  textures: 14,
  geometries: 38,
});

// Bottom Control Dock open/closed & contextual sub-menu state ('views' | 'play' | 'none')
export const isBottomDockOpenAtom = atom<boolean>(true);
export type BottomSubMenuId = 'none' | 'views' | 'play';
export const activeBottomSubMenuAtom = atom<BottomSubMenuId>('none');

// Modals & Encyclopedic Catalogs
export const isJournalOpenAtom = atom<boolean>(false);
export const isPresetsOpenAtom = atom<boolean>(false);
export const isSettingsOpenAtom = atom<boolean>(false);
export const isSaveModalOpenAtom = atom<boolean>(false);
export const isGameConfigModalOpenAtom = atom<boolean>(false);
export const isZonesDrawerOpenAtom = atom<boolean>(false);
export const isCatalogModalOpenAtom = atom<boolean>(false);
export const isBlueprintModalOpenAtom = atom<boolean>(false);

// Optional Architect Visualizer mode
export const architectSandboxTypeAtom = atom<BuildingType | null>(null);

export interface AmbienceOverride {
  skyTint?: string;
  lightIntensity?: number;
  particleDensity?: number;
  weatherEffect?: WeatherType;
  stormIntensity?: number;
  note?: string;
}

export const ambienceOverrideAtom = atom<AmbienceOverride | null>(null);

/* ==========================================================================
   Derived Selectors
   ========================================================================== */

export const populationCountAtom = atom<number>((get) => get(npcsAtom).length);
export const buildingCountAtom = atom<number>((get) => get(buildingsAtom).length);

export const selectedNpcAtom = atom<PlacedNpc | null>((get) => {
  const id = get(selectedNpcIdAtom);
  if (!id) return null;
  return get(npcsAtom).find((n) => n.id === id) ?? null;
});

export const selectedBuildingAtom = atom<PlacedBuilding | null>((get) => {
  const id = get(selectedBuildingIdAtom);
  if (!id) return null;
  return get(buildingsAtom).find((b) => b.id === id) ?? null;
});

configureTerrain(DEFAULT_GAME_CONFIG.seed, DEFAULT_GAME_CONFIG.reliefScale);
