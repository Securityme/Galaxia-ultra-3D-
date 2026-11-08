/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Blender-Organized Procedural PBR Texture Atlas Engine
 * Synthesizes dedicated sRGB Albedo, Tangent-Space 3x3 Sobel Normal Maps, and Linear Roughness Maps
 * for EVERY 3D entity:
 * 1. Terrain & Internal Sub-Biomes (`createPlateauAlbedoTexture`, `createPlateauSobelNormalAndRoughnessMaps`)
 * 2. Multi-Channel Blender Principled BSDF Building Materials (`createBuildingPbrMaterialMaps`, `createRoofTilePbrMaps`, `createBronzeFiligreePbrMaps`, `createArchWindowPbrTexture`)
 * 3. Urban Roads & Forum Plazas (`createForumMosaicPlazaTexture`, `createImperialRoadCobbleTexture`)
 * 4. NPCs & Sovereign Regalia (`createNpcGarmentTexture`)
 * 5. Terrain Props, Trees, Rocks & Cliffs (`createTreeBarkTexture`, `createFoliageCanopyTexture`, `createCliffStrataTexture`)
 * 6. Planetary Globe & Clouds (`createPlanetWorldMapTexture`, `createPlanetCloudTexture`)
 */

import * as THREE from 'three';
import { WorldPreset } from '../../contracts/schemas';
import {
  getLocalReliefElevation,
  getPlanetSphereElevation,
  getPlateauMicroClimateZone,
} from '../../core/terrainMath';
import { createNoise2D } from '../../core/noise';
import { wld_PLATEAU_WIDTH, wld_PLATEAU_LENGTH } from '../../config/constants';

const textureCache = new Map<string, THREE.CanvasTexture>();

export type BuildingPbrMaterialId =
  | 'carrara_gold'
  | 'obsidian_bronze'
  | 'porphyry_imperial'
  | 'celestial_azure'
  | 'emerald_travertine';

export interface BuildingPbrMaterialSpec {
  id: BuildingPbrMaterialId;
  name: string;
  subtitle: string;
  baseHex: string;
  veinHex: string;
  mortarHex: string;
  trimHex: string;
  roofHex: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  normalScale: number;
}

export const BUILDING_PBR_MATERIAL_SPECS: Record<
  BuildingPbrMaterialId,
  BuildingPbrMaterialSpec
> = {
  carrara_gold: {
    id: 'carrara_gold',
    name: 'Marbre de Carrare & Or Solaire',
    subtitle: 'Pierre de taille veinée, joints biseautés Sobel & filigranes dorés',
    baseHex: '#f5efe4',
    veinHex: '#cfc3ae',
    mortarHex: '#8d7d65',
    trimHex: '#d9ae56',
    roofHex: '#c65d3b',
    roughness: 0.28,
    metalness: 0.14,
    clearcoat: 0.35,
    normalScale: 0.85,
  },
  obsidian_bronze: {
    id: 'obsidian_bronze',
    name: 'Basalte d’Obsidienne & Bronze',
    subtitle: 'Maçonnerie volcanique polie, reflets minéraux & bronze antique',
    baseHex: '#3c424c',
    veinHex: '#1f242b',
    mortarHex: '#b87638',
    trimHex: '#c88d44',
    roofHex: '#6b3b2a',
    roughness: 0.24,
    metalness: 0.38,
    clearcoat: 0.45,
    normalScale: 0.95,
  },
  porphyry_imperial: {
    id: 'porphyry_imperial',
    name: 'Porphyre Pourpre & Laiton Capitolin',
    subtitle: 'Pierre impériale pourpre à cristaux blancs & corniches d’or',
    baseHex: '#6e3244',
    veinHex: '#9c596d',
    mortarHex: '#cab896',
    trimHex: '#e6be6a',
    roofHex: '#9e4434',
    roughness: 0.3,
    metalness: 0.2,
    clearcoat: 0.4,
    normalScale: 0.82,
  },
  celestial_azure: {
    id: 'celestial_azure',
    name: 'Lapis Céleste & Argent Stellaire',
    subtitle: 'Céramique d’azur vitrifiée, marbre blanc & incrustations d’argent',
    baseHex: '#dbe8f4',
    veinHex: '#5288b5',
    mortarHex: '#476885',
    trimHex: '#93c5fd',
    roofHex: '#2563eb',
    roughness: 0.2,
    metalness: 0.28,
    clearcoat: 0.55,
    normalScale: 0.78,
  },
  emerald_travertine: {
    id: 'emerald_travertine',
    name: 'Travertin & Cuivre d’Émeraude',
    subtitle: 'Pierre romaine chaude, dômes en cuivre patiné & reliefs botaniques',
    baseHex: '#e6dcc8',
    veinHex: '#8da88b',
    mortarHex: '#5e735c',
    trimHex: '#34d399',
    roofHex: '#2f7a5e',
    roughness: 0.34,
    metalness: 0.18,
    clearcoat: 0.3,
    normalScale: 0.88,
  },
};

/**
 * Helper: Computes a Tangent-Space Normal Map CanvasTexture + Roughness Map CanvasTexture
 * from a 2D heightfield array [0..1] using a 3x3 Sobel operator.
 */
function buildSobelNormalAndRoughnessFromHeightfield(
  normalCacheKey: string,
  roughCacheKey: string,
  size: number,
  heights: Float32Array,
  roughnessValues: Float32Array,
  sobelStrength: number,
  repeatX = 2,
  repeatY = 2
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d');

  if (normCtx && roughCtx) {
    const normImg = normCtx.createImageData(size, size);
    const roughImg = roughCtx.createImageData(size, size);
    const nData = normImg.data;
    const rData = roughImg.data;

    const sampleH = (x: number, y: number): number => {
      const wx = ((x % size) + size) % size;
      const wy = ((y % size) + size) % size;
      return heights[wy * size + wx];
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        const tl = sampleH(x - 1, y - 1);
        const t = sampleH(x, y - 1);
        const tr = sampleH(x + 1, y - 1);
        const l = sampleH(x - 1, y);
        const r = sampleH(x + 1, y);
        const bl = sampleH(x - 1, y + 1);
        const b = sampleH(x, y + 1);
        const br = sampleH(x + 1, y + 1);

        const dX = (tr + 2.0 * r + br - (tl + 2.0 * l + bl)) * sobelStrength;
        const dY = (bl + 2.0 * b + br - (tl + 2.0 * t + tr)) * sobelStrength;
        const dZ = 1.0;
        const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);

        nData[idx] = Math.floor((-dX * invLen * 0.5 + 0.5) * 255);
        nData[idx + 1] = Math.floor((-dY * invLen * 0.5 + 0.5) * 255);
        nData[idx + 2] = Math.floor((dZ * invLen * 0.5 + 0.5) * 255);
        nData[idx + 3] = 255;

        const rVal = Math.max(18, Math.min(248, Math.floor(roughnessValues[y * size + x] * 255)));
        rData[idx] = rVal;
        rData[idx + 1] = rVal;
        rData[idx + 2] = rVal;
        rData[idx + 3] = 255;
      }
    }

    normCtx.putImageData(normImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
  }

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeatX, repeatY);
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);
  roughnessMap.needsUpdate = true;

  textureCache.set(normalCacheKey, normalMap);
  textureCache.set(roughCacheKey, roughnessMap);
  return { normalMap, roughnessMap };
}

export function createSoftCircularParticleTexture(): THREE.CanvasTexture {
  const cacheKey = 'soft_circle_sprite';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.28, 'rgba(255, 252, 245, 0.85)');
    grad.addColorStop(0.65, 'rgba(220, 235, 255, 0.25)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, tex);
  return tex;
}

export function createZoneBannerSpriteTexture(
  zoneName: string,
  regionCode: string,
  accentHex: string
): THREE.CanvasTexture {
  const cacheKey = `zone_banner_${zoneName}_${accentHex}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(9, 17, 32, 0.9)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;

    const r = 24;
    const x = 16;
    const y = 14;
    const w = width - 32;
    const h = height - 28;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'center';
    ctx.fillText(`◆ ${regionCode} • CLIQUER POUR ENTRER ◆`, width / 2, 48);

    ctx.font = '600 28px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#fffbeb';
    ctx.fillText(zoneName, width / 2, 88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(cacheKey, tex);
  return tex;
}

/* ==========================================================================
   1. BLENDER-GRADE MULTI-CHANNEL PBR BUILDING TEXTURES (Albedo + Sobel Normal + Roughness)
   ========================================================================== */

export interface PbrTextureTriple {
  albedoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Synthesizes a complete 512x512 Blender Principled BSDF texture triple (Albedo + Sobel 3x3 Normal + Roughness)
 * for any of the 5 architectural material presets. Includes beveled ashlar stone blocks, fluted frieze moldings,
 * veined marble/porphyry/basalt grain, and metallic trim inlays.
 */
export function createBuildingPbrMaterialMaps(
  presetId: BuildingPbrMaterialId = 'carrara_gold'
): PbrTextureTriple {
  const spec = BUILDING_PBR_MATERIAL_SPECS[presetId] ?? BUILDING_PBR_MATERIAL_SPECS.carrara_gold;
  const albKey = `bld_pbr_albedo_512_${spec.id}`;
  const normKey = `bld_pbr_normal_512_${spec.id}`;
  const roughKey = `bld_pbr_rough_512_${spec.id}`;

  const cAlb = textureCache.get(albKey);
  const cNorm = textureCache.get(normKey);
  const cRough = textureCache.get(roughKey);
  if (cAlb && cNorm && cRough) {
    return { albedoMap: cAlb, normalMap: cNorm, roughnessMap: cRough };
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const heights = new Float32Array(size * size);
  const roughnesses = new Float32Array(size * size);

  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;

    const cBase = new THREE.Color(spec.baseHex);
    const cVein = new THREE.Color(spec.veinHex);
    const cMortar = new THREE.Color(spec.mortarHex);
    const cTrim = new THREE.Color(spec.trimHex);
    const cWork = new THREE.Color();

    const noise = createNoise2D(`bld_pbr_${spec.id}`);
    const rows = 8;
    const cols = 4;
    const rowH = size / rows;
    const colW = size / cols;

    for (let y = 0; y < size; y++) {
      const isFriezeBand = y < 28 || y > size - 32 || (y > 238 && y < 274);
      const rowIdx = Math.floor(y / rowH);
      const localY = y % rowH;
      const distYEdge = Math.min(localY, rowH - localY);

      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const pIdx = idx * 4;

        const offset = (rowIdx % 2) * (colW * 0.5);
        const shiftedX = (x + offset) % size;
        const colIdx = Math.floor(shiftedX / colW);
        const localX = shiftedX % colW;
        const distXEdge = Math.min(localX, colW - localX);

        // Beveled mortar joint detection (4px mortar + 6px 45-degree chamfer bevel)
        const minEdgeDist = Math.min(distXEdge, distYEdge);
        const isMortar = !isFriezeBand && minEdgeDist < 3.0;
        const bevelFactor = isFriezeBand
          ? 1.0
          : Math.max(0.0, Math.min(1.0, (minEdgeDist - 2.0) / 7.0));

        // Block variation + marble/mineral veins
        const blockSeed = ((rowIdx * 17 + colIdx * 31) % 9) * 0.015 - 0.06;
        const n1 = noise(x * 0.032, y * 0.032);
        const n2 = noise(x * 0.14, y * 0.14) * 0.06;
        const veinWave = Math.pow(
          Math.abs(Math.sin(x * 0.045 + y * 0.025 + n1 * 4.2)),
          4.0
        );

        let heightVal = 0.65 * bevelFactor + n2;
        let roughVal = spec.roughness + (1.0 - bevelFactor) * 0.42;

        if (isFriezeBand) {
          // Classical fluted entablature & gilded dentil frieze
          const flute = Math.sin((x / size) * Math.PI * 32.0);
          heightVal = 0.82 + flute * 0.14;
          roughVal = Math.max(0.14, spec.roughness * 0.65);
          cWork.lerpColors(cBase, cTrim, flute > 0.2 ? 0.82 : 0.28);
        } else if (isMortar) {
          heightVal = 0.08 + n2 * 0.3;
          roughVal = 0.88;
          cWork.copy(cMortar);
        } else {
          cWork.lerpColors(cBase, cVein, veinWave * 0.58);
          cWork.offsetHSL(0, 0, blockSeed + (bevelFactor - 0.8) * 0.08);
          roughVal = Math.max(0.15, Math.min(0.92, spec.roughness + veinWave * 0.12));
        }

        heights[idx] = heightVal;
        roughnesses[idx] = roughVal;

        d[pIdx] = Math.min(255, Math.max(0, Math.floor(cWork.r * 255)));
        d[pIdx + 1] = Math.min(255, Math.max(0, Math.floor(cWork.g * 255)));
        d[pIdx + 2] = Math.min(255, Math.max(0, Math.floor(cWork.b * 255)));
        d[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const albedoMap = new THREE.CanvasTexture(canvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.repeat.set(2, 2);
  albedoMap.needsUpdate = true;
  textureCache.set(albKey, albedoMap);

  const { normalMap, roughnessMap } = buildSobelNormalAndRoughnessFromHeightfield(
    normKey,
    roughKey,
    size,
    heights,
    roughnesses,
    4.2,
    2,
    2
  );

  return { albedoMap, normalMap, roughnessMap };
}

/**
 * Legacy helper maintained for compatibility.
 */
export function createBuildingFacadeTexture(): THREE.CanvasTexture {
  return createBuildingPbrMaterialMaps('carrara_gold').albedoMap;
}

/**
 * Synthesizes 3D curved Roman Imbricate Roof Tiles with Albedo + 3x3 Sobel Normal Map + Roughness Map.
 */
export function createRoofTilePbrMaps(roofHex = '#b85a3a'): PbrTextureTriple {
  const albKey = `bld_roof_pbr_alb_${roofHex}`;
  const normKey = `bld_roof_pbr_norm_${roofHex}`;
  const roughKey = `bld_roof_pbr_rough_${roofHex}`;

  const cAlb = textureCache.get(albKey);
  const cNorm = textureCache.get(normKey);
  const cRough = textureCache.get(roughKey);
  if (cAlb && cNorm && cRough) {
    return { albedoMap: cAlb, normalMap: cNorm, roughnessMap: cRough };
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const heights = new Float32Array(size * size);
  const roughnesses = new Float32Array(size * size);

  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const cBase = new THREE.Color(roofHex);
    const cWork = new THREE.Color();
    const noise = createNoise2D(`roof_tile_${roofHex}`);

    const cols = 10;
    const rows = 8;
    const colW = size / cols;
    const rowH = size / rows;

    for (let y = 0; y < size; y++) {
      const rIdx = Math.floor(y / rowH);
      const ly = (y % rowH) / rowH; // 0..1 down the tile course
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const pIdx = idx * 4;
        const cIdx = Math.floor(x / colW);
        const lx = (x % colW) / colW; // 0..1 across a single barrel tile

        // Barrel tile arch profile: sin(lx * PI) + overlapping lip at bottom of each row
        const arch = Math.sin(lx * Math.PI);
        const overlapLip = ly > 0.88 ? 0.15 : 0.72 + (1.0 - ly) * 0.18;
        const hVal = arch * overlapLip + noise(x * 0.2, y * 0.2) * 0.04;

        heights[idx] = hVal;
        roughnesses[idx] = ly > 0.88 ? 0.85 : 0.42 + (1.0 - arch) * 0.25;

        const tileVar = ((rIdx * 7 + cIdx * 13) % 5) * 0.02 - 0.04;
        cWork.copy(cBase).offsetHSL(0, 0, (hVal - 0.5) * 0.18 + tileVar);

        d[pIdx] = Math.min(255, Math.max(0, Math.floor(cWork.r * 255)));
        d[pIdx + 1] = Math.min(255, Math.max(0, Math.floor(cWork.g * 255)));
        d[pIdx + 2] = Math.min(255, Math.max(0, Math.floor(cWork.b * 255)));
        d[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const albedoMap = new THREE.CanvasTexture(canvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.repeat.set(2, 2);
  albedoMap.needsUpdate = true;
  textureCache.set(albKey, albedoMap);

  const { normalMap, roughnessMap } = buildSobelNormalAndRoughnessFromHeightfield(
    normKey,
    roughKey,
    size,
    heights,
    roughnesses,
    4.6,
    2,
    2
  );

  return { albedoMap, normalMap, roughnessMap };
}

export function createRoofTileTexture(): THREE.CanvasTexture {
  return createRoofTilePbrMaps('#b85a3a').albedoMap;
}

/**
 * Synthesizes Coffered Pantheon-style Imperial Bronze & Gold Filigree PBR Maps (Albedo + Sobel Normal + Roughness).
 */
export function createBronzeFiligreePbrMaps(trimHex = '#d4ad62'): PbrTextureTriple {
  const albKey = `bld_bronze_pbr_alb_${trimHex}`;
  const normKey = `bld_bronze_pbr_norm_${trimHex}`;
  const roughKey = `bld_bronze_pbr_rough_${trimHex}`;

  const cAlb = textureCache.get(albKey);
  const cNorm = textureCache.get(normKey);
  const cRough = textureCache.get(roughKey);
  if (cAlb && cNorm && cRough) {
    return { albedoMap: cAlb, normalMap: cNorm, roughnessMap: cRough };
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const heights = new Float32Array(size * size);
  const roughnesses = new Float32Array(size * size);

  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const cBase = new THREE.Color(trimHex);
    const cWork = new THREE.Color();

    const grid = 8;
    const cell = size / grid;

    for (let y = 0; y < size; y++) {
      const ly = (y % cell) / cell;
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const pIdx = idx * 4;
        const lx = (x % cell) / cell;

        // Stepped coffer cassette (Pantheon dome style) with central rosette
        const edgeDist = Math.min(Math.min(lx, 1.0 - lx), Math.min(ly, 1.0 - ly));
        const centerDist = Math.hypot(lx - 0.5, ly - 0.5);

        let hVal = 0.85;
        let rVal = 0.22;
        if (edgeDist < 0.14) {
          hVal = 0.95; // Outer raised rib
          rVal = 0.18;
        } else if (edgeDist < 0.26) {
          hVal = 0.55; // First recessed step
          rVal = 0.32;
        } else if (centerDist < 0.14) {
          hVal = 0.92; // Central gilded rosette boss
          rVal = 0.16;
        } else {
          hVal = 0.25; // Deep coffer recess
          rVal = 0.44;
        }

        heights[idx] = hVal;
        roughnesses[idx] = rVal;

        cWork.copy(cBase).offsetHSL(0, 0, (hVal - 0.6) * 0.16);
        d[pIdx] = Math.min(255, Math.max(0, Math.floor(cWork.r * 255)));
        d[pIdx + 1] = Math.min(255, Math.max(0, Math.floor(cWork.g * 255)));
        d[pIdx + 2] = Math.min(255, Math.max(0, Math.floor(cWork.b * 255)));
        d[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const albedoMap = new THREE.CanvasTexture(canvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.repeat.set(2, 2);
  albedoMap.needsUpdate = true;
  textureCache.set(albKey, albedoMap);

  const { normalMap, roughnessMap } = buildSobelNormalAndRoughnessFromHeightfield(
    normKey,
    roughKey,
    size,
    heights,
    roughnesses,
    4.5,
    2,
    2
  );

  return { albedoMap, normalMap, roughnessMap };
}

export function createBronzeFiligreeTexture(): THREE.CanvasTexture {
  return createBronzeFiligreePbrMaps('#d4ad62').albedoMap;
}

/**
 * Generates an Arched Mullioned Stained-Glass Window Texture (Albedo + Emissive Mullions) for 3D buildings.
 */
export function createArchWindowPbrTexture(): THREE.CanvasTexture {
  const cacheKey = 'bld_arch_window_mullion_128';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm glowing interior gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0.0, '#fff3c4');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1.0, '#d97706');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Bronze window frame & classical arch mullions
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, size - 8, size - 8);

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size / 2, 4);
    ctx.lineTo(size / 2, size - 4);
    ctx.moveTo(4, size * 0.38);
    ctx.lineTo(size - 4, size * 0.38);
    ctx.moveTo(4, size * 0.68);
    ctx.lineTo(size - 4, size * 0.68);
    ctx.stroke();

    // Upper Roman arch tracery
    ctx.beginPath();
    ctx.arc(size / 2, size * 0.38, size * 0.36, Math.PI, 0);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(cacheKey, tex);
  return tex;
}

/* ==========================================================================
   2. URBAN ROADS & FORUM PLAZA TEXTURES (Opus Sectile Mosaic & Via Imperiale Cobbles)
   ========================================================================== */

export function createForumMosaicPlazaTexture(): THREE.CanvasTexture {
  const cacheKey = 'urban_forum_mosaic_512';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#e7dfd0';
    ctx.fillRect(0, 0, size, size);

    const rings = [
      { r: 245, fill: '#d6c9b1', stroke: '#b89758' },
      { r: 215, fill: '#eee7da', stroke: '#948671' },
      { r: 165, fill: '#dfd4be', stroke: '#b89758' },
      { r: 110, fill: '#f3ede2', stroke: '#b89758' },
      { r: 52, fill: '#cbb894', stroke: '#8c6d32' },
    ];

    rings.forEach((ring) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.fill;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = ring.stroke;
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(148, 118, 62, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 24, cy + Math.sin(ang) * 24);
      ctx.lineTo(cx + Math.cos(ang) * 242, cy + Math.sin(ang) * 242);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, tex);
  return tex;
}

export function createImperialRoadCobbleTexture(): THREE.CanvasTexture {
  const cacheKey = 'urban_road_cobble_256';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#d8cebc';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#b9ab93';
    ctx.fillRect(0, 0, 26, size);
    ctx.fillRect(size - 26, 0, 26, size);

    const rows = 8;
    const cols = 5;
    const roadW = size - 52;
    const cellW = roadW / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 26 + c * cellW;
        const y = r * cellH;
        const shade = ((r + c) % 3) * 8 - 8;
        ctx.fillStyle = `rgb(${222 + shade}, ${212 + shade}, ${194 + shade})`;
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

/* ==========================================================================
   3. NPC & SOVEREIGN GARMENT TEXTURE (Woven Brocade & Embroidered Heraldry)
   ========================================================================== */

export function createNpcGarmentTexture(): THREE.CanvasTexture {
  const cacheKey = 'npc_garment_brocade_128';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(200, 190, 175, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, size - 14, size, 10);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

/* ==========================================================================
   4. TERRAIN OBJECTS, TREES, FOLIAGE & CLIFF STRATA TEXTURES
   ========================================================================== */

export function createTreeBarkTexture(): THREE.CanvasTexture {
  const cacheKey = 'prop_tree_bark_128';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    for (let x = 0; x < size; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + ((x % 12) - 6) * 0.4, size);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

export function createFoliageCanopyTexture(): THREE.CanvasTexture {
  const cacheKey = 'prop_foliage_canopy_128';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const noise = createNoise2D('foliage_leaf_clusters');
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = noise(x * 0.18, y * 0.18);
        const v = Math.floor(220 + n * 35);
        d[idx] = v;
        d[idx + 1] = Math.min(255, v + 10);
        d[idx + 2] = v;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

export function createCliffStrataTexture(): THREE.CanvasTexture {
  const cacheKey = 'terrain_cliff_strata_256';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const noise = createNoise2D('cliff_strata_sediment');
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const band = Math.sin(y * 0.16) * 18;
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = noise(x * 0.08, y * 0.15) * 22;
        const base = Math.max(70, Math.min(220, Math.floor(155 + band + n)));
        d[idx] = base;
        d[idx + 1] = Math.floor(base * 0.97);
        d[idx + 2] = Math.floor(base * 0.92);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  textureCache.set(cacheKey, tex);
  return tex;
}

/* ==========================================================================
   5. PLATEAU & PLANETARY GLOBE BIOME TEXTURES
   ========================================================================== */

export function createPlateauAlbedoTexture(
  preset: WorldPreset,
  seed: string | number
): THREE.CanvasTexture {
  const cacheKey = `plateau_albedo_v5_${preset.id}_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const sub0 = new THREE.Color(preset.subBiomes[0]?.colorHex ?? preset.groundLowColor);
    const sub1 = new THREE.Color(preset.subBiomes[1]?.colorHex ?? preset.groundBaseColor);
    const sub2 = new THREE.Color(preset.subBiomes[2]?.colorHex ?? preset.groundAccentColor);
    const sub3 = new THREE.Color(preset.subBiomes[3]?.colorHex ?? preset.groundPeakColor);

    const cShallow = new THREE.Color(preset.oceanShallowColor);
    const cUrbanMarble = new THREE.Color('#e2dacb');
    const cUrbanTravertine = new THREE.Color('#cbb899');
    const cFoamOrIce = new THREE.Color(
      preset.climateEffectType === 'volcanic_magma' ? '#ff6b1a' : '#f8fafc'
    );
    const cTemp = new THREE.Color();

    const detailNoise = createNoise2D(`${seed}_albedo_detail`);
    const subBiomeNoise = createNoise2D(`${seed}_subbiome_patch`);

    for (let py = 0; py < size; py++) {
      const wz = (py / size - 0.5) * wld_PLATEAU_LENGTH;
      for (let px = 0; px < size; px++) {
        const wx = (px / size - 0.5) * wld_PLATEAU_WIDTH;
        const h = getLocalReliefElevation(wx, wz);
        const zone = getPlateauMicroClimateZone(wx, wz);
        const micro = detailNoise(wx * 0.35, wz * 0.35) * 0.05;
        const patch = subBiomeNoise(wx * 0.065, wz * 0.065);

        if (h < -0.02) {
          const shoreLine = h > -0.08 ? 0.35 : 0.0;
          cTemp.lerpColors(cShallow, sub0, Math.max(0, (h + 0.55) / 0.53));
          if (shoreLine > 0) cTemp.lerp(cFoamOrIce, shoreLine);
        } else if (h < 0.25) {
          const t = (h + 0.02) / 0.27;
          cTemp.lerpColors(sub0, sub1, Math.max(0, Math.min(1, t * 0.85)));
        } else if (h < 1.35) {
          const elevT = (h - 0.25) / 1.1;
          const horizontalBlend = Math.max(
            0,
            Math.min(1, elevT * 0.65 + (patch + 0.5) * 0.45)
          );
          cTemp.lerpColors(sub1, sub2, horizontalBlend);

          if (
            preset.climateEffectType === 'volcanic_magma' &&
            Math.abs(patch) < 0.045 &&
            h < 0.9
          ) {
            cTemp.lerp(cFoamOrIce, 0.65);
          }
        } else {
          const t = Math.min(1, (h - 1.35) / 1.35);
          cTemp.lerpColors(sub2, sub3, t);
        }

        if (zone.urbanWeight > 0.15 && h > 0.05) {
          const gridPattern =
            (Math.abs(Math.floor(wx * 1.5)) + Math.abs(Math.floor(wz * 1.5))) % 2 === 0;
          const paverColor = gridPattern ? cUrbanMarble : cUrbanTravertine;
          cTemp.lerp(paverColor, zone.urbanWeight * 0.72);
        }

        const contourMod = Math.abs((((h * 3.0) % 1) + 1) % 1 - 0.5);
        const isContour = contourMod < 0.034 && h > 0.08;
        const contourBoost = isContour ? 0.9 : 1.0;

        const r = Math.min(
          255,
          Math.max(46, Math.floor((cTemp.r + micro) * 255 * contourBoost))
        );
        const g = Math.min(
          255,
          Math.max(48, Math.floor((cTemp.g + micro) * 255 * contourBoost))
        );
        const b = Math.min(
          255,
          Math.max(50, Math.floor((cTemp.b + micro) * 255 * contourBoost))
        );

        const idx = (py * size + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

export function createTerrainBumpTexture(): THREE.CanvasTexture {
  const cacheKey = 'terrain_bump_512';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const noise = createNoise2D('bump_detail_seed');

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = noise.fractal(x * 0.06, y * 0.06, 3, 0.5, 2.0);
        const val = Math.max(0, Math.min(255, Math.floor(128 + n * 95)));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  textureCache.set(cacheKey, texture);
  return texture;
}

export function createPlateauSobelNormalAndRoughnessMaps(
  seed: string | number
): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const normKey = `plateau_sobel_normal_${seed}`;
  const roughKey = `plateau_roughness_${seed}`;
  const cachedNorm = textureCache.get(normKey);
  const cachedRough = textureCache.get(roughKey);
  if (cachedNorm && cachedRough) {
    return { normalMap: cachedNorm, roughnessMap: cachedRough };
  }

  const size = 512;
  const heights = new Float32Array(size * size);
  const microNoise = createNoise2D(`${seed}_sobel_micro`);

  for (let py = 0; py < size; py++) {
    const wz = (py / size - 0.5) * wld_PLATEAU_LENGTH;
    for (let px = 0; px < size; px++) {
      const wx = (px / size - 0.5) * wld_PLATEAU_WIDTH;
      const h = getLocalReliefElevation(wx, wz);
      const micro = microNoise.fractal(wx * 0.45, wz * 0.45, 2, 0.5, 2.0) * 0.08;
      heights[py * size + px] = h + micro;
    }
  }

  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d');

  if (normCtx && roughCtx) {
    const normImg = normCtx.createImageData(size, size);
    const roughImg = roughCtx.createImageData(size, size);
    const nData = normImg.data;
    const rData = roughImg.data;
    const strength = 2.8;

    const sampleH = (x: number, y: number): number => {
      const cx = Math.max(0, Math.min(size - 1, x));
      const cy = Math.max(0, Math.min(size - 1, y));
      return heights[cy * size + cx];
    };

    for (let py = 0; py < size; py++) {
      const wz = (py / size - 0.5) * wld_PLATEAU_LENGTH;
      for (let px = 0; px < size; px++) {
        const wx = (px / size - 0.5) * wld_PLATEAU_WIDTH;
        const idx = (py * size + px) * 4;

        const tl = sampleH(px - 1, py - 1);
        const t = sampleH(px, py - 1);
        const tr = sampleH(px + 1, py - 1);
        const l = sampleH(px - 1, py);
        const r = sampleH(px + 1, py);
        const bl = sampleH(px - 1, py + 1);
        const b = sampleH(px, py + 1);
        const br = sampleH(px + 1, py + 1);

        const dX = (tr + 2.0 * r + br - (tl + 2.0 * l + bl)) * strength;
        const dY = (bl + 2.0 * b + br - (tl + 2.0 * t + tr)) * strength;
        const dZ = 1.0;
        const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);

        nData[idx] = Math.floor((-dX * invLen * 0.5 + 0.5) * 255);
        nData[idx + 1] = Math.floor((-dY * invLen * 0.5 + 0.5) * 255);
        nData[idx + 2] = Math.floor((dZ * invLen * 0.5 + 0.5) * 255);
        nData[idx + 3] = 255;

        const h = heights[py * size + px];
        const zone = getPlateauMicroClimateZone(wx, wz);
        let rough = 0.68;
        if (h < 0.02) {
          rough = 0.16;
        } else if (zone.urbanWeight > 0.25) {
          rough = 0.36;
        } else if (h > 1.55) {
          rough = 0.34;
        } else if (h > 0.85) {
          rough = 0.88;
        }
        const rByte = Math.max(25, Math.min(245, Math.floor(rough * 255)));
        rData[idx] = rByte;
        rData[idx + 1] = rByte;
        rData[idx + 2] = rByte;
        rData[idx + 3] = 255;
      }
    }

    normCtx.putImageData(normImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
  }

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.ClampToEdgeWrapping;
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
  roughnessMap.needsUpdate = true;

  textureCache.set(normKey, normalMap);
  textureCache.set(roughKey, roughnessMap);
  return { normalMap, roughnessMap };
}

export function createPlanetWorldMapTexture(
  preset: WorldPreset,
  seed: string | number
): THREE.CanvasTexture {
  const cacheKey = `planet_worldmap_v5_${preset.id}_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const cOceanDeep = new THREE.Color(preset.oceanDeepColor);
    const cOceanShallow = new THREE.Color(preset.oceanShallowColor);
    const cCoast = new THREE.Color(preset.groundLowColor);
    const cPlain = new THREE.Color(preset.groundBaseColor);
    const cHighland = new THREE.Color(preset.groundAccentColor);
    const cPeak = new THREE.Color(preset.groundPeakColor);
    const cPolar = new THREE.Color('#f8fafc');
    const cOut = new THREE.Color();

    for (let py = 0; py < height; py++) {
      const v = py / height;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const latitudeAbs = Math.abs(v - 0.5) * 2.0;

      for (let px = 0; px < width; px++) {
        const u = px / width;
        const theta = u * Math.PI * 2.0;

        const nx = -sinPhi * Math.cos(theta);
        const ny = cosPhi;
        const nz = sinPhi * Math.sin(theta);

        const elev = getPlanetSphereElevation(nx, ny, nz);

        if (elev < -0.18) {
          const t = Math.max(0, Math.min(1, (elev + 0.85) / 0.67));
          cOut.lerpColors(cOceanDeep, cOceanShallow, t * 0.65);
        } else if (elev < 0.0) {
          const t = (elev + 0.18) / 0.18;
          cOut.lerpColors(cOceanShallow, cCoast, t * 0.5);
        } else if (elev < 0.09) {
          const t = elev / 0.09;
          cOut.lerpColors(cCoast, cPlain, t);
        } else if (elev < 0.48) {
          const t = (elev - 0.09) / 0.39;
          cOut.lerpColors(cPlain, cHighland, t);
        } else {
          const t = Math.min(1, (elev - 0.48) / 0.55);
          cOut.lerpColors(cHighland, cPeak, t);
        }

        if (latitudeAbs > 0.82) {
          const iceT = Math.min(1, (latitudeAbs - 0.82) / 0.14);
          cOut.lerp(cPolar, iceT * 0.85);
        }

        const isCoastline = Math.abs(elev) < 0.014;
        const boost = isCoastline ? 1.15 : 1.0;

        const idx = (py * width + px) * 4;
        data[idx] = Math.min(255, Math.floor(cOut.r * 255 * boost));
        data[idx + 1] = Math.min(255, Math.floor(cOut.g * 255 * boost));
        data[idx + 2] = Math.min(255, Math.floor(cOut.b * 255 * boost));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

export function createPlanetCloudTexture(seed: string | number): THREE.CanvasTexture {
  const cacheKey = `planet_clouds_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const cloudNoise = createNoise2D(`${seed}_clouds`);

    for (let py = 0; py < height; py++) {
      const phi = (py / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let px = 0; px < width; px++) {
        const theta = (px / width) * Math.PI * 2.0;
        const nx = -sinPhi * Math.cos(theta);
        const ny = cosPhi;
        const nz = sinPhi * Math.sin(theta);

        const n = cloudNoise.fractal3D(nx * 2.6, ny * 3.4, nz * 2.6, 4, 0.5, 2.0);
        const alpha = Math.max(0, Math.min(1, (n - 0.08) * 2.2));

        const idx = (py * width + px) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 175);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}
