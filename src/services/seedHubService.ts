/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * PT-80 (Shell Desktop Tauri 2.12 Detection) & PT-81 (Hub de Graines du Commandant)
 *
 * Permet au Commandant de :
 * 1. Générer un code de graine court et déterministe (« Partager ce monde ») encapsulant
 *    graine, preset, nom du monde, tour atteint et empreinte d'état (PT-57 / PT-81).
 * 2. Publier et consulter la galerie « Mondes du Commandant » (stockage local + synchronisation).
 * 3. Détecter l'exécution dans une coquille Tauri 2.12 (`window.__TAURI_INTERNALS__`).
 */

export interface SharedCommanderWorld {
  id: string;
  shareCode: string;
  worldName: string;
  seed: string;
  presetId: string;
  biomeLabel: string;
  turnReached: number;
  stateFingerprint: string;
  commanderName: string;
  createdAtIso: string;
}

const LOCAL_HUB_STORAGE_KEY = 'galaxia_ultra_commander_seeds_v4';

const CANONICAL_FEATURED_WORLDS: SharedCommanderWorld[] = [
  {
    id: 'featured_helios_prime',
    shareCode: 'GXP4:GALAXIA-HELIOS-01:blue_earth:T14:A9F3C210',
    worldName: 'Arche Capitoline d’Hélios',
    seed: 'GALAXIA-HELIOS-01',
    presetId: 'blue_earth',
    biomeLabel: 'Terre Bleue & Continents Verts',
    turnReached: 14,
    stateFingerprint: 'A9F3C210',
    commanderName: 'Commandant Valerius',
    createdAtIso: '2026-11-07T08:00:00.000Z',
  },
  {
    id: 'featured_amber_dune',
    shareCode: 'GXP4:DUNE-SOLARIS-88:red_mars:T22:C41E90B2',
    worldName: 'Citadelle des Sables Pourpres',
    seed: 'DUNE-SOLARIS-88',
    presetId: 'red_mars',
    biomeLabel: 'Désert d’Ocre & Canyons Stellaires',
    turnReached: 22,
    stateFingerprint: 'C41E90B2',
    commanderName: 'Archonte Lyra',
    createdAtIso: '2026-11-07T09:30:00.000Z',
  },
  {
    id: 'featured_cryo_spire',
    shareCode: 'GXP4:CRYO-ZENITH-42:ice_world:T19:77B04D1E',
    worldName: 'Sanctuaire Polaire d’Astraea',
    seed: 'CRYO-ZENITH-42',
    presetId: 'ice_world',
    biomeLabel: 'Banquise Cristalline & Aurores',
    turnReached: 19,
    stateFingerprint: '77B04D1E',
    commanderName: 'Amiral Vespera',
    createdAtIso: '2026-11-07T10:15:00.000Z',
  },
];

/**
 * Encodes a playable world into a compact deterministic share code (PT-57 / PT-81).
 */
export function encodeCommanderShareCode(params: {
  seed: string;
  presetId: string;
  turnNumber: number;
  stateFingerprint?: string;
}): string {
  const cleanSeed = params.seed.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 28) || 'GALAXIA-01';
  const cleanPreset = params.presetId.trim() || 'blue_earth';
  const fp = (params.stateFingerprint || 'F00D1E42').slice(0, 8).toUpperCase();
  return `GXP4:${cleanSeed}:${cleanPreset}:T${Math.max(1, params.turnNumber)}:${fp}`;
}

/**
 * Decodes a `GXP4:...` share code back into seed & preset parameters.
 */
export function decodeCommanderShareCode(code: string): {
  valid: boolean;
  seed: string;
  presetId: string;
  turnHint: number;
  stateFingerprint: string;
} | null {
  const trimmed = code.trim();
  const parts = trimmed.split(':');
  if (parts.length < 3 || !parts[0].startsWith('GXP')) {
    return null;
  }
  const seed = parts[1] || 'GALAXIA-HELIOS-01';
  const presetId = parts[2] || 'blue_earth';
  const turnRaw = parts[3]?.replace(/^T/i, '') || '1';
  const turnHint = Math.max(1, Number.parseInt(turnRaw, 10) || 1);
  const stateFingerprint = parts[4] || '00000000';

  return {
    valid: true,
    seed,
    presetId,
    turnHint,
    stateFingerprint,
  };
}

export function listCommanderHubWorlds(): SharedCommanderWorld[] {
  if (typeof window === 'undefined') {
    return CANONICAL_FEATURED_WORLDS;
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_HUB_STORAGE_KEY);
    if (!raw) return CANONICAL_FEATURED_WORLDS;
    const userWorlds = JSON.parse(raw) as SharedCommanderWorld[];
    if (!Array.isArray(userWorlds)) return CANONICAL_FEATURED_WORLDS;
    const existingCodes = new Set(userWorlds.map((w) => w.shareCode));
    return [
      ...userWorlds,
      ...CANONICAL_FEATURED_WORLDS.filter((fw) => !existingCodes.has(fw.shareCode)),
    ];
  } catch {
    return CANONICAL_FEATURED_WORLDS;
  }
}

export function publishWorldToCommanderHub(world: Omit<SharedCommanderWorld, 'id' | 'shareCode'>): SharedCommanderWorld {
  const shareCode = encodeCommanderShareCode({
    seed: world.seed,
    presetId: world.presetId,
    turnNumber: world.turnReached,
    stateFingerprint: world.stateFingerprint,
  });

  const entry: SharedCommanderWorld = {
    ...world,
    id: `hub_${world.seed}_${world.turnReached}`,
    shareCode,
  };

  if (typeof window !== 'undefined') {
    try {
      const current = listCommanderHubWorlds().filter(
        (w) => w.shareCode !== entry.shareCode && !w.id.startsWith('featured_')
      );
      window.localStorage.setItem(
        LOCAL_HUB_STORAGE_KEY,
        JSON.stringify([entry, ...current].slice(0, 20))
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  return entry;
}

/**
 * Detects whether the web build is running inside a Tauri 2.12 desktop shell (PT-80).
 */
export function isTauriDesktopShell(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  return Boolean(win.__TAURI_INTERNALS__ || win.__TAURI__);
}
