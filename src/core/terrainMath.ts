/**
 * PAX HISTORIA 3D • Mathematical Topography & Horizontal Micro-Climate Engine
 * Evaluates the expanded strategic plateau with:
 * - True spherical planetary curvature (simulating a planet surface of large diameter)
 * - Vertical strata (Coastal Beaches, Fertile Plains, High Mountain Massifs)
 * - 5 Horizontal Biome & Micro-Climate Sectors across the plateau
 * - Leveled Arrival Zone esplanade & Central Urban Forum
 * - 3D spherical planetary globe continents
 */

import { createNoise2D, NoiseGenerator } from './noise';
import {
  wld_PLATEAU_WIDTH,
  wld_PLATEAU_LENGTH,
  wld_DEFAULT_RELIEF_SCALE,
  wld_SPHERICAL_CURVATURE_RADIUS,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
  wld_ARRIVAL_ZONE_RADIUS,
  wld_ARRIVAL_ZONE_ELEVATION,
} from '../config/constants';

let currentNoise: NoiseGenerator = createNoise2D(42);
let currentReliefScale: number = wld_DEFAULT_RELIEF_SCALE;
let currentCurvatureIntensity = 1.0;

export type PlateauMicroClimateId =
  | 'urban_forum'
  | 'coastal_lagoon'
  | 'alpine_massif'
  | 'amber_steppe'
  | 'sylvan_grove';

export interface PlateauMicroClimateInfo {
  id: PlateauMicroClimateId;
  name: string;
  climateTag: string;
  tintHex: string;
  urbanWeight: number;
  beachWeight: number;
  mountainWeight: number;
}

export function configureTerrain(
  seed: string | number,
  reliefScale = wld_DEFAULT_RELIEF_SCALE,
  curvatureIntensity = 1.0
): void {
  currentNoise = createNoise2D(seed);
  currentReliefScale = reliefScale;
  currentCurvatureIntensity = curvatureIntensity;
}

/**
 * Computes the spherical planetary drop at distance r from the plateau center.
 * Simulates standing on a real curved planet surface with a generous radius.
 */
export function getSphericalCurvatureDrop(x: number, z: number): number {
  const rSq = x * x + z * z;
  const R = wld_SPHERICAL_CURVATURE_RADIUS;
  return -(rSq / (2 * R)) * currentCurvatureIntensity;
}

function getEdgeAttenuation(x: number, z: number): number {
  const halfW = wld_PLATEAU_WIDTH * 0.47;
  const halfL = wld_PLATEAU_LENGTH * 0.47;
  const dx = Math.abs(x) / halfW;
  const dz = Math.abs(z) / halfL;
  const dist = Math.max(dx, dz);
  if (dist >= 1.0) return 0.05;
  if (dist <= 0.76) return 1.0;
  const t = (dist - 0.76) / (1.0 - 0.76);
  return 1.0 - t * t * (3 - 2 * t);
}

/**
 * Evaluates the horizontal Biome & Micro-Climate sector at (x, z) on the plateau.
 * Combines non-vertical horizontal biome zones with coastal beach & mountain massif weights.
 */
export function getPlateauMicroClimateZone(x: number, z: number): PlateauMicroClimateInfo {
  const distCenter = Math.hypot(x, z);
  const onCauseway = z > -2 && z <= wld_ARRIVAL_ZONE_Z + 4 && Math.abs(x) < 4.5;

  const urbanWeight = Math.max(
    0,
    Math.min(
      1,
      distCenter < 13.5
        ? 1.0 - Math.max(0, (distCenter - 7.5) / 6.0)
        : onCauseway
        ? 1.0 - Math.abs(x) / 4.5
        : 0
    )
  );

  // North-East / North: Alpine Massif (High Mountains)
  const mountainDist = Math.hypot(x - 18, z + 20);
  const mountainWeight = Math.max(0, Math.min(1, 1.0 - mountainDist / 26.0));

  // South-East: Coastal Lagoon & Golden Sandy Beaches
  const beachDist = Math.hypot(x - 16, z - 16);
  const beachWeight = Math.max(0, Math.min(1, 1.0 - beachDist / 24.0));

  if (urbanWeight > 0.45) {
    return {
      id: 'urban_forum',
      name: 'Cœur Urbain & Forum Impérial',
      climateTag: 'Micro-climat Tempéré Régulé',
      tintHex: '#e2d9c8',
      urbanWeight,
      beachWeight,
      mountainWeight,
    };
  }

  if (mountainWeight > 0.38 || (z < -12 && x > 0)) {
    return {
      id: 'alpine_massif',
      name: 'Massif Alpin & Crêtes Boréales',
      climateTag: 'Brume d’Altitude & Neiges Éternelles',
      tintHex: '#cbd5e1',
      urbanWeight,
      beachWeight,
      mountainWeight: Math.max(mountainWeight, 0.55),
    };
  }

  if (beachWeight > 0.35 || (z > 8 && x > 4)) {
    return {
      id: 'coastal_lagoon',
      name: 'Rivage Solaire & Plages d’Or',
      climateTag: 'Alizés Marins & Écume Côtière',
      tintHex: '#fde68a',
      urbanWeight,
      beachWeight: Math.max(beachWeight, 0.55),
      mountainWeight,
    };
  }

  if (z > 4 && x <= 4) {
    return {
      id: 'amber_steppe',
      name: 'Coteaux d’Ambre & Terrasses Héliocentriques',
      climateTag: 'Zénith Chaud & Poussière Dorée',
      tintHex: '#f59e0b',
      urbanWeight,
      beachWeight,
      mountainWeight,
    };
  }

  return {
    id: 'sylvan_grove',
    name: 'Bosquet d’Émeraude & Sources Thermales',
    climateTag: 'Rosée Vivifiante & Brise Sylvestre',
    tintHex: '#34d399',
    urbanWeight,
    beachWeight,
    mountainWeight,
  };
}

/**
 * Returns local relief height BEFORE spherical planetary curvature drop.
 * Incorporates:
 * - High Mountain Massifs in the northern/alpine sector
 * - Gentle sandy beach slopes and coastal lagoon in the south-eastern sector
 * - Flattened Urban Forum terrace in the city heart & Arrival Zone esplanade
 */
export function getLocalReliefElevation(x: number, z: number): number {
  const maxExtent = Math.max(wld_PLATEAU_WIDTH, wld_PLATEAU_LENGTH) * 0.55;
  if (Math.abs(x) > maxExtent || Math.abs(z) > maxExtent) {
    return -0.25;
  }

  const scaleContinent = 0.028;
  const scaleRidge = 0.055;
  const scaleDetail = 0.12;

  const base = currentNoise.fractal(x * scaleContinent, z * scaleContinent, 4, 0.5, 2.05);
  const ridges = Math.max(
    0,
    currentNoise.ridged(x * scaleRidge + 12.3, z * scaleRidge - 8.7, 3, 0.5, 2.15)
  );
  const detail = currentNoise(x * scaleDetail, z * scaleDetail) * 0.22;

  const zoneInfo = getPlateauMicroClimateZone(x, z);

  // Boost mountain height dramatically in the Alpine Massif sector
  const mountainBoost = zoneInfo.mountainWeight * (1.85 + ridges * 2.1);

  // Carve a gentle sandy beach & shallow lagoon in the Coastal Lagoon sector
  const lagoonCarve = zoneInfo.beachWeight * 0.55;

  const combined = base * 1.15 + ridges * 0.92 + detail + mountainBoost - lagoonCarve;
  const attenuation = getEdgeAttenuation(x, z);
  let rawHeight = combined * currentReliefScale * attenuation;

  // Smoothly level the Central Urban Forum so buildings & plazas sit on an imperial terrace
  if (zoneInfo.urbanWeight > 0.05) {
    const targetUrbanHeight = 0.68;
    const u = zoneInfo.urbanWeight * 0.78;
    rawHeight = rawHeight * (1 - u) + targetUrbanHeight * u;
  }

  // Smoothly blend the Arrival Zone Esplanade so it forms a flat, dry imperial terrace
  const dxArr = x - wld_ARRIVAL_ZONE_X;
  const dzArr = z - wld_ARRIVAL_ZONE_Z;
  const distArr = Math.hypot(dxArr, dzArr);
  const innerR = wld_ARRIVAL_ZONE_RADIUS;
  const outerR = wld_ARRIVAL_ZONE_RADIUS + 4.2;

  if (distArr < outerR) {
    const t = Math.max(0, Math.min(1, (distArr - innerR) / (outerR - innerR)));
    const smoothT = t * t * (3 - 2 * t);
    rawHeight =
      wld_ARRIVAL_ZONE_ELEVATION * (1 - smoothT) + rawHeight * smoothT;
  }

  // Ceremonial causeway between Arrival Zone (z=24) and center (z=0) stays above water
  if (z > 0.5 && z < wld_ARRIVAL_ZONE_Z && Math.abs(x) < 3.0) {
    const pathFactor = 1.0 - Math.abs(x) / 3.0;
    const minCausewayHeight = 0.62;
    if (rawHeight < minCausewayHeight) {
      rawHeight = rawHeight * (1 - pathFactor * 0.88) + minCausewayHeight * (pathFactor * 0.88);
    }
  }

  return rawHeight;
}

/**
 * Returns final 3D world Y height at coordinates (x, z) on the curved planetary plateau
 * (combining local relief + spherical planetary curvature).
 */
export function getTerrainHeight(x: number, z: number): number {
  return getLocalReliefElevation(x, z) + getSphericalCurvatureDrop(x, z);
}

/**
 * Calculates surface normal at (x, z) on the curved plateau.
 */
export function getTerrainNormal(
  x: number,
  z: number,
  epsilon = 0.25
): { x: number; y: number; z: number } {
  const hL = getTerrainHeight(x - epsilon, z);
  const hR = getTerrainHeight(x + epsilon, z);
  const hD = getTerrainHeight(x, z - epsilon);
  const hU = getTerrainHeight(x, z + epsilon);

  const nx = (hL - hR) / (2 * epsilon);
  const ny = 1.0;
  const nz = (hD - hU) / (2 * epsilon);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Evaluates seamless 3D continental elevation on the unit sphere (nx, ny, nz) for the 3D Planet Globe.
 */
export function getPlanetSphereElevation(nx: number, ny: number, nz: number): number {
  const continent = currentNoise.fractal3D(nx * 1.65, ny * 1.65, nz * 1.65, 4, 0.52, 2.05);
  const mountains = currentNoise.fractal3D(
    nx * 4.2 + 5.1,
    ny * 4.2 - 3.4,
    nz * 4.2 + 1.9,
    3,
    0.5,
    2.1
  );
  const ridgeFactor = Math.max(0, 1.0 - Math.abs(mountains) * 1.6);

  const elevation = continent * 1.35 + (continent > 0.02 ? ridgeFactor * ridgeFactor * 0.65 : 0);
  return elevation * (0.7 + currentReliefScale * 0.25);
}

/**
 * Converts spherical (latDeg, lonDeg) into a unit normal vector (nx, ny, nz).
 */
export function latLonToUnitVector(
  latDeg: number,
  lonDeg: number
): { nx: number; ny: number; nz: number } {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    nx: cosLat * Math.cos(lonRad),
    ny: Math.sin(latRad),
    nz: cosLat * Math.sin(lonRad),
  };
}
