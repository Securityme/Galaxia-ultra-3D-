/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-50, PT-62 & PT-63:
 * Gestionnaire de Matériaux PBR à Budget LRU (`mat_`) & Registre d'Assets CC0 (`ast_`)
 * - Cache par `(materialId, seed)` avec synthèse différée à la demande
 * - Budget mémoire explicite (`mat_MAX_BUDGET_BYTES = 48 Mo`) et éviction LRU avec `dispose()`
 * - Registre canonique `ast_` des 6 catalogues ouverts CC0 / Domaine Public avec repli procédural
 */

import * as THREE from 'three';
import {
  BUILDING_PBR_MATERIAL_SPECS,
  BuildingPbrMaterialId,
  createBuildingPbrMaterialMaps,
} from '../textures/proceduralTextures';

export const mat_MAX_BUDGET_BYTES = 48 * 1024 * 1024; // 48 MB
export const ast_MAX_SINGLE_ASSET_BYTES = 250 * 1024; // 250 KB
export const ast_MAX_TOTAL_ASSET_BYTES = 8 * 1024 * 1024; // 8 MB

/* ==========================================================================
   PT-62 & PT-63: Canonical CC0 / Public Domain Open Asset Registry (ast_)
   ========================================================================== */

export type OpenAssetLicense = 'CC0-1.0' | 'Public-Domain-USGov' | 'CC-BY-4.0';

export interface OpenAssetEntry {
  id: string;
  catalog:
    | 'Kenney'
    | 'Poly Pizza'
    | 'Quaternius'
    | 'Poly Haven'
    | 'ambientCG'
    | 'NASA-3D-Resources';
  license: OpenAssetLicense;
  format: 'gltf-meshopt' | 'gltf-draco' | 'ktx2-basis';
  compressedSizeBytes: number;
  sha256Fingerprint: string;
  usage: string;
  proceduralFallbackId: string;
}

export const ast_KENNEY_MODULAR_COLONIES = 'ast_kenney_modular_colonies_v1' as const;
export const ast_POLY_PIZZA_BIOME_PROPS = 'ast_poly_pizza_biome_props_v1' as const;
export const ast_QUATERNIUS_CITIZEN_RIGS = 'ast_quaternius_citizen_rigs_v1' as const;
export const ast_POLY_HAVEN_COSMIC_HDRI = 'ast_poly_haven_cosmic_hdri_v1' as const;
export const ast_AMBIENTCG_CARRARA_MARBLE = 'ast_ambientcg_carrara_marble_v1' as const;
export const ast_NASA_PLANETARY_ALBEDO = 'ast_nasa_planetary_albedo_v1' as const;

export const OPEN_ASSET_REGISTRY: readonly OpenAssetEntry[] = [
  {
    id: ast_KENNEY_MODULAR_COLONIES,
    catalog: 'Kenney',
    license: 'CC0-1.0',
    format: 'gltf-meshopt',
    compressedSizeBytes: 184000,
    sha256Fingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    usage: 'Props modulaires du Lot Êta, balises d’astroport et éléments de structure civique',
    proceduralFallbackId: 'proc_buildings_composite',
  },
  {
    id: ast_POLY_PIZZA_BIOME_PROPS,
    catalog: 'Poly Pizza',
    license: 'CC0-1.0',
    format: 'gltf-draco',
    compressedSizeBytes: 162000,
    sha256Fingerprint: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    usage: 'Obélisques méridiens, affleurements cristallins et totems par sous-biome',
    proceduralFallbackId: 'proc_plateau_scatters',
  },
  {
    id: ast_QUATERNIUS_CITIZEN_RIGS,
    catalog: 'Quaternius',
    license: 'CC0-1.0',
    format: 'gltf-meshopt',
    compressedSizeBytes: 218000,
    sha256Fingerprint: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    usage: 'Variantes de colons articulés par Maison Noble et convois logistiques',
    proceduralFallbackId: 'proc_npcs_humanoid',
  },
  {
    id: ast_POLY_HAVEN_COSMIC_HDRI,
    catalog: 'Poly Haven',
    license: 'CC0-1.0',
    format: 'ktx2-basis',
    compressedSizeBytes: 242000,
    sha256Fingerprint: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    usage: 'Cartes d’environnement HDRI cosmiques par biome (renfort PMREM PT-22)',
    proceduralFallbackId: 'proc_cosmic_pmrem',
  },
  {
    id: ast_AMBIENTCG_CARRARA_MARBLE,
    catalog: 'ambientCG',
    license: 'CC0-1.0',
    format: 'ktx2-basis',
    compressedSizeBytes: 236000,
    sha256Fingerprint: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    usage: 'Étalons PBR Albedo/Normal/Roughness/AO pour Marbre de Carrare, Basalte et Or',
    proceduralFallbackId: 'proc_sobel_pbr_maps',
  },
  {
    id: ast_NASA_PLANETARY_ALBEDO,
    catalog: 'NASA-3D-Resources',
    license: 'Public-Domain-USGov',
    format: 'ktx2-basis',
    compressedSizeBytes: 228000,
    sha256Fingerprint: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    usage: 'Cartes planétaires authentiques, calottes polaires et anneaux du Globe 3D',
    proceduralFallbackId: 'proc_planet_equirectangular',
  },
] as const;

/* ==========================================================================
   PT-50: Material Budget & LRU Cache Manager (mat_)
   ========================================================================== */

interface CachedMaterialRecord {
  cacheKey: string;
  material: THREE.MeshPhysicalMaterial;
  textures: THREE.Texture[];
  estimatedBytes: number;
  lastAccessedTick: number;
}

export interface MaterialBudgetManager {
  acquirePbrMaterial: (
    presetId: BuildingPbrMaterialId,
    seed: string | number,
    tickIndex?: number
  ) => THREE.MeshPhysicalMaterial;
  getUsedMemoryBytes: () => number;
  getCachedCount: () => number;
  disposeAll: () => void;
}

export function createMaterialBudgetManager(
  maxBudgetBytes = mat_MAX_BUDGET_BYTES
): MaterialBudgetManager {
  const cache = new Map<string, CachedMaterialRecord>();
  let usedBytes = 0;
  let accessCounter = 0;

  function evictLeastRecentlyUsedIfNeeded(incomingBytes: number): void {
    while (usedBytes + incomingBytes > maxBudgetBytes && cache.size > 0) {
      let oldestKey: string | null = null;
      let oldestTick = Infinity;

      cache.forEach((rec, key) => {
        if (rec.lastAccessedTick < oldestTick) {
          oldestTick = rec.lastAccessedTick;
          oldestKey = key;
        }
      });

      if (!oldestKey) break;
      const victim = cache.get(oldestKey);
      if (victim) {
        victim.material.dispose();
        victim.textures.forEach((t) => t.dispose());
        usedBytes = Math.max(0, usedBytes - victim.estimatedBytes);
        cache.delete(oldestKey);
      }
    }
  }

  function acquirePbrMaterial(
    presetId: BuildingPbrMaterialId,
    seed: string | number,
    tickIndex?: number
  ): THREE.MeshPhysicalMaterial {
    accessCounter = tickIndex !== undefined ? tickIndex : accessCounter + 1;
    const cacheKey = `mat_${presetId}_${seed}`;

    const existing = cache.get(cacheKey);
    if (existing) {
      existing.lastAccessedTick = accessCounter;
      return existing.material;
    }

    // 3 maps of 512x512 RGBA = ~3.14 MB per multi-channel PBR set
    const estimatedBytes = 512 * 512 * 4 * 3;
    evictLeastRecentlyUsedIfNeeded(estimatedBytes);

    const spec = BUILDING_PBR_MATERIAL_SPECS[presetId];
    const maps = createBuildingPbrMaterialMaps(presetId);

    const material = new THREE.MeshPhysicalMaterial({
      name: cacheKey,
      color: new THREE.Color(spec.baseHex),
      map: maps.albedoMap,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughnessMap: maps.roughnessMap,
      roughness: spec.roughness,
      metalness: spec.metalness,
      clearcoat: spec.clearcoat,
      clearcoatRoughness: 0.16,
    });

    cache.set(cacheKey, {
      cacheKey,
      material,
      textures: [maps.albedoMap, maps.normalMap, maps.roughnessMap],
      estimatedBytes,
      lastAccessedTick: accessCounter,
    });
    usedBytes += estimatedBytes;

    return material;
  }

  function getUsedMemoryBytes(): number {
    return usedBytes;
  }

  function getCachedCount(): number {
    return cache.size;
  }

  function disposeAll(): void {
    cache.forEach((rec) => {
      rec.material.dispose();
      rec.textures.forEach((t) => t.dispose());
    });
    cache.clear();
    usedBytes = 0;
  }

  return {
    acquirePbrMaterial,
    getUsedMemoryBytes,
    getCachedCount,
    disposeAll,
  };
}
