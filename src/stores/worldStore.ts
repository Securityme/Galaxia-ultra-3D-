/**
 * PAX HISTORIA 3D • Reactive World Store (Jotai)
 * Central state for:
 * - 3D Boot, Mandatory Google Firebase Authentication & Imperial Main Menu
 * - Plateau vs 3D Planet Globe views & 6 Planetary Plateau Zones
 * - Minimalist retractable header & collapsible bottom dock drawers ('views' | 'play' | 'catalogs')
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
} from '../config/constants';
import {
  PlacedBuilding,
  PlacedNpc,
  ChronicleEntry,
  TurnBatch,
  WorldPreset,
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

export const zonesRuntimeMapAtom = atom<Record<string, PlanetaryZoneRuntimeState>>(
  buildInitialZonesRuntimeMap()
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

export const turnNumberAtom = atom<number>(1);

export interface CivilizationStats {
  stability: number;
  prosperity: number;
  knowledge: number;
  influence: number;
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

  const activeBlds = get(buildingsAtom).length;
  const activePop = get(npcsAtom).length;
  const turn = get(turnNumberAtom);
  const epochIndex = Math.min(EPOCH_NAMES.length - 1, Math.floor((turn - 1) / 3));
  const seasonName = SEASON_NAMES[(turn - 1) % SEASON_NAMES.length];

  return {
    stability: Math.min(100, 76 + activeBlds * 3 + Math.floor(totalBlds * 0.5)),
    prosperity: Math.min(100, 62 + activePop * 4 + totalBlds * 2),
    knowledge: Math.min(100, 48 + activeBlds * 6 + turn * 3),
    influence: Math.min(100, 42 + totalPop * 2 + turn * 4),
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

export const isGeneratingEventAtom = atom<boolean>(false);
export const currentTurnEventAtom = atom<TurnBatch | null>(null);

// Minimalist Header retractable resources state
export const isHeaderResourcesOpenAtom = atom<boolean>(false);

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

// Optional Architect Visualizer mode (for previewing/spawning from catalog)
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
