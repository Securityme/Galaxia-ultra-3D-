/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-27 (Canonique): Forêts en InstancedMesh par Sous-Biome
 * Architecture D2-GU-PT v7.0.0 — Lot Alpha:
 * - Un seul draw call par variante d'arbre et par couche géométrique (THREE.InstancedMesh)
 * - Densité décuplée modulée par preset de qualité (420 Cinéma / 280 Équilibré / 140 Performance)
 * - Placement strictement déterministe par graine Mulberry32 (`createPRNG`, zéro Math.random)
 * - LOD géométrique 3D pur par distance caméra (`wld_FOREST_LOD_DISTANCE`) :
 *   * Proche (Near LOD) : tronc cannelé + 3 étages de cônes de feuillage sculptés
 *   * Lointain (Far LOD) : géométrie 3D basse résolution (tronc 4 pans + cône pyramidal 5 pans — aucun billboard 2D)
 */

import * as THREE from 'three';
import {
  wld_ARRIVAL_ZONE_RADIUS,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
  wld_PLATEAU_WIDTH,
} from '../../config/constants';
import { WorldPreset } from '../../contracts/schemas';
import { createPRNG } from '../../core/prng';
import {
  getLocalReliefElevation,
  getPlateauMicroClimateZone,
  getTerrainHeight,
} from '../../core/terrainMath';
import { GraphicsQualityPreset } from '../postfx/blenderComposer';

export const wld_FOREST_COUNT_CINEMA = 420;
export const wld_FOREST_COUNT_BALANCED = 280;
export const wld_FOREST_COUNT_PERFORMANCE = 140;
export const wld_FOREST_LOD_DISTANCE = 64.0;
export const wld_FOREST_MIN_FORUM_CLEARANCE = 8.8;
export const wld_FOREST_MIN_ARRIVAL_CLEARANCE = wld_ARRIVAL_ZONE_RADIUS + 2.8;
export const wld_FOREST_MAX_RADIUS = wld_PLATEAU_WIDTH * 0.455;

export type SubBiomeTreeVariant = 'temperate_cypress' | 'coastal_palm' | 'alpine_conifer';

interface TreeInstanceRecord {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotationY: number;
  variant: SubBiomeTreeVariant;
}

interface VariantInstancedMeshes {
  nearTrunk: THREE.InstancedMesh;
  nearCanopyLow: THREE.InstancedMesh;
  nearCanopyMid: THREE.InstancedMesh;
  nearCanopyHigh: THREE.InstancedMesh;
  farTrunk: THREE.InstancedMesh;
  farCanopy: THREE.InstancedMesh;
}

export interface InstancedForestsManager {
  group: THREE.Group;
  rebuildForSeedAndTheme: (preset: WorldPreset, seed: string | number) => void;
  setQualityPreset: (preset: GraphicsQualityPreset) => void;
  updateDistanceLod: (cameraPosition: THREE.Vector3) => void;
  getActiveTreeCount: () => number;
  dispose: () => void;
}

export function createInstancedForests(
  initialPreset: WorldPreset,
  initialSeed: string | number,
  treeBarkTex: THREE.CanvasTexture,
  foliageCanopyTex: THREE.CanvasTexture
): InstancedForestsManager {
  const group = new THREE.Group();
  group.name = 'SubCollection_PT27_InstancedForests';

  let currentPreset = initialPreset;
  let currentSeed = initialSeed;
  let currentQuality: GraphicsQualityPreset = 'cinema';
  let allTreeRecords: TreeInstanceRecord[] = [];
  let lastLodCameraPos = new THREE.Vector3(9999, 9999, 9999);

  // 1. Geometries — Near High-Detail 3D vs Far Reduced-Poly 3D (Zero 2D Billboards)
  const nearTrunkGeo = new THREE.CylinderGeometry(0.085, 0.155, 0.78, 7);
  nearTrunkGeo.translate(0, 0.39, 0);

  const nearCanopyLowGeo = new THREE.ConeGeometry(0.62, 1.22, 8);
  nearCanopyLowGeo.translate(0, 1.02, 0);

  const nearCanopyMidGeo = new THREE.ConeGeometry(0.49, 0.98, 8);
  nearCanopyMidGeo.translate(0, 1.52, 0);

  const nearCanopyHighGeo = new THREE.ConeGeometry(0.34, 0.82, 8);
  nearCanopyHighGeo.translate(0, 1.96, 0);

  // Far LOD 3D Geometries (Low-segment 3D volumes, ~65% fewer triangles)
  const farTrunkGeo = new THREE.CylinderGeometry(0.09, 0.15, 0.75, 4);
  farTrunkGeo.translate(0, 0.37, 0);

  const farCanopyGeo = new THREE.ConeGeometry(0.58, 1.88, 5);
  farCanopyGeo.translate(0, 1.36, 0);

  // 2. Materials per Sub-Biome Botanical Variant
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x7c5844,
    map: treeBarkTex,
    bumpMap: treeBarkTex,
    bumpScale: 0.05,
    roughness: 0.86,
    metalness: 0.04,
  });

  const temperateCanopyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundAccentColor),
    map: foliageCanopyTex,
    bumpMap: foliageCanopyTex,
    bumpScale: 0.04,
    roughness: 0.62,
    metalness: 0.04,
  });

  const coastalPalmMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x10b981).lerp(
      new THREE.Color(initialPreset.groundAccentColor),
      0.35
    ),
    map: foliageCanopyTex,
    bumpMap: foliageCanopyTex,
    bumpScale: 0.04,
    roughness: 0.54,
    metalness: 0.05,
  });

  const alpineConiferMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundAccentColor).lerp(
      new THREE.Color(initialPreset.groundPeakColor),
      0.42
    ),
    map: foliageCanopyTex,
    bumpMap: foliageCanopyTex,
    bumpScale: 0.05,
    roughness: 0.68,
    metalness: 0.04,
  });

  const variantMaterials: Record<SubBiomeTreeVariant, THREE.MeshStandardMaterial> = {
    temperate_cypress: temperateCanopyMat,
    coastal_palm: coastalPalmMat,
    alpine_conifer: alpineConiferMat,
  };

  const variants: SubBiomeTreeVariant[] = [
    'temperate_cypress',
    'coastal_palm',
    'alpine_conifer',
  ];

  function createVariantMeshBundle(variant: SubBiomeTreeVariant): VariantInstancedMeshes {
    const canopyMat = variantMaterials[variant];
    const maxCap = wld_FOREST_COUNT_CINEMA;

    const nearTrunk = new THREE.InstancedMesh(nearTrunkGeo, trunkMat, maxCap);
    const nearCanopyLow = new THREE.InstancedMesh(nearCanopyLowGeo, canopyMat, maxCap);
    const nearCanopyMid = new THREE.InstancedMesh(nearCanopyMidGeo, canopyMat, maxCap);
    const nearCanopyHigh = new THREE.InstancedMesh(nearCanopyHighGeo, canopyMat, maxCap);
    const farTrunk = new THREE.InstancedMesh(farTrunkGeo, trunkMat, maxCap);
    const farCanopy = new THREE.InstancedMesh(farCanopyGeo, canopyMat, maxCap);

    const allMeshes = [
      nearTrunk,
      nearCanopyLow,
      nearCanopyMid,
      nearCanopyHigh,
      farTrunk,
      farCanopy,
    ];

    allMeshes.forEach((m, idx) => {
      m.name = `InstancedMesh_${variant}_${idx}`;
      m.castShadow = idx < 4; // Near LOD casts soft shadows; Far LOD saves shadow pass cost
      m.receiveShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      group.add(m);
    });

    return {
      nearTrunk,
      nearCanopyLow,
      nearCanopyMid,
      nearCanopyHigh,
      farTrunk,
      farCanopy,
    };
  }

  const bundles: Record<SubBiomeTreeVariant, VariantInstancedMeshes> = {
    temperate_cypress: createVariantMeshBundle('temperate_cypress'),
    coastal_palm: createVariantMeshBundle('coastal_palm'),
    alpine_conifer: createVariantMeshBundle('alpine_conifer'),
  };

  const dummy = new THREE.Object3D();

  function getMaxCountForQuality(q: GraphicsQualityPreset): number {
    if (q === 'performance') return wld_FOREST_COUNT_PERFORMANCE;
    if (q === 'balanced') return wld_FOREST_COUNT_BALANCED;
    return wld_FOREST_COUNT_CINEMA;
  }

  function generateDeterministicTreeRecords(seed: string | number): TreeInstanceRecord[] {
    const rng = createPRNG(`${seed}_PT27_instanced_forest_v7`);
    const records: TreeInstanceRecord[] = [];
    const maxCandidateAttempts = wld_FOREST_COUNT_CINEMA * 4;

    for (
      let attempt = 0;
      attempt < maxCandidateAttempts && records.length < wld_FOREST_COUNT_CINEMA;
      attempt++
    ) {
      // Stratified golden-angle + Mulberry32 jitter for organic grove clustering
      const clusterAnchorAngle = rng() * Math.PI * 2;
      const clusterRadius =
        wld_FOREST_MIN_FORUM_CLEARANCE +
        Math.pow(rng(), 0.72) * (wld_FOREST_MAX_RADIUS - wld_FOREST_MIN_FORUM_CLEARANCE);

      const sx = Math.cos(clusterAnchorAngle) * clusterRadius + (rng() - 0.5) * 3.6;
      const sz = Math.sin(clusterAnchorAngle) * clusterRadius + (rng() - 0.5) * 3.6;

      if (
        Math.abs(sx) > wld_FOREST_MAX_RADIUS ||
        Math.abs(sz) > wld_FOREST_MAX_RADIUS
      ) {
        continue;
      }

      const distToForum = Math.hypot(sx, sz);
      const distToArrival = Math.hypot(
        sx - wld_ARRIVAL_ZONE_X,
        sz - wld_ARRIVAL_ZONE_Z
      );
      if (
        distToForum < wld_FOREST_MIN_FORUM_CLEARANCE ||
        distToArrival < wld_FOREST_MIN_ARRIVAL_CLEARANCE
      ) {
        continue;
      }

      const localElev = getLocalReliefElevation(sx, sz);
      if (localElev <= 0.055) {
        continue; // Keep beaches and submerged lagoon clear
      }

      const gh = getTerrainHeight(sx, sz);
      const zone = getPlateauMicroClimateZone(sx, sz);

      let variant: SubBiomeTreeVariant = 'temperate_cypress';
      if (zone.id === 'coastal_lagoon') {
        variant = 'coastal_palm';
      } else if (zone.id === 'alpine_massif' || localElev > 1.35) {
        variant = 'alpine_conifer';
      }

      const scale =
        variant === 'alpine_conifer'
          ? 0.82 + rng() * 0.62
          : variant === 'coastal_palm'
          ? 0.78 + rng() * 0.48
          : 0.74 + rng() * 0.55;

      records.push({
        x: sx,
        y: gh,
        z: sz,
        scale,
        rotationY: rng() * Math.PI * 2,
        variant,
      });
    }

    return records;
  }

  function populateInstancedMeshes(cameraPosition: THREE.Vector3): void {
    const activeBudget = Math.min(
      allTreeRecords.length,
      getMaxCountForQuality(currentQuality)
    );
    const lodDistSq = wld_FOREST_LOD_DISTANCE * wld_FOREST_LOD_DISTANCE;

    variants.forEach((variant) => {
      const b = bundles[variant];
      let nearIdx = 0;
      let farIdx = 0;

      for (let i = 0; i < activeBudget; i++) {
        const rec = allTreeRecords[i];
        if (rec.variant !== variant) continue;

        dummy.position.set(rec.x, rec.y, rec.z);
        dummy.rotation.set(0, rec.rotationY, 0);

        if (variant === 'coastal_palm') {
          dummy.scale.set(rec.scale * 0.88, rec.scale * 1.15, rec.scale * 0.88);
        } else if (variant === 'alpine_conifer') {
          dummy.scale.set(rec.scale * 0.82, rec.scale * 1.24, rec.scale * 0.82);
        } else {
          dummy.scale.setScalar(rec.scale);
        }
        dummy.updateMatrix();

        const dx = rec.x - cameraPosition.x;
        const dy = rec.y - cameraPosition.y;
        const dz = rec.z - cameraPosition.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= lodDistSq && currentQuality !== 'performance') {
          b.nearTrunk.setMatrixAt(nearIdx, dummy.matrix);
          b.nearCanopyLow.setMatrixAt(nearIdx, dummy.matrix);
          b.nearCanopyMid.setMatrixAt(nearIdx, dummy.matrix);
          b.nearCanopyHigh.setMatrixAt(nearIdx, dummy.matrix);
          nearIdx++;
        } else {
          b.farTrunk.setMatrixAt(farIdx, dummy.matrix);
          b.farCanopy.setMatrixAt(farIdx, dummy.matrix);
          farIdx++;
        }
      }

      b.nearTrunk.count = nearIdx;
      b.nearCanopyLow.count = nearIdx;
      b.nearCanopyMid.count = nearIdx;
      b.nearCanopyHigh.count = nearIdx;
      b.farTrunk.count = farIdx;
      b.farCanopy.count = farIdx;

      b.nearTrunk.instanceMatrix.needsUpdate = true;
      b.nearCanopyLow.instanceMatrix.needsUpdate = true;
      b.nearCanopyMid.instanceMatrix.needsUpdate = true;
      b.nearCanopyHigh.instanceMatrix.needsUpdate = true;
      b.farTrunk.instanceMatrix.needsUpdate = true;
      b.farCanopy.instanceMatrix.needsUpdate = true;
    });
  }

  function rebuildForSeedAndTheme(preset: WorldPreset, seed: string | number): void {
    currentPreset = preset;
    currentSeed = seed;

    temperateCanopyMat.color.set(currentPreset.groundAccentColor);
    coastalPalmMat.color
      .set(0x10b981)
      .lerp(new THREE.Color(currentPreset.groundAccentColor), 0.35);
    alpineConiferMat.color
      .set(currentPreset.groundAccentColor)
      .lerp(new THREE.Color(currentPreset.groundPeakColor), 0.42);

    allTreeRecords = generateDeterministicTreeRecords(currentSeed);
    lastLodCameraPos.set(9999, 9999, 9999);
    populateInstancedMeshes(new THREE.Vector3(0, 26, 36));
  }

  function setQualityPreset(preset: GraphicsQualityPreset): void {
    if (preset === currentQuality) return;
    currentQuality = preset;
    lastLodCameraPos.set(9999, 9999, 9999);
    populateInstancedMeshes(new THREE.Vector3(0, 26, 36));
  }

  function updateDistanceLod(cameraPosition: THREE.Vector3): void {
    if (lastLodCameraPos.distanceToSquared(cameraPosition) < 12.0) {
      return; // Re-partition LOD buckets only when camera moves >= 3.4m
    }
    lastLodCameraPos.copy(cameraPosition);
    populateInstancedMeshes(cameraPosition);
  }

  function getActiveTreeCount(): number {
    return Math.min(allTreeRecords.length, getMaxCountForQuality(currentQuality));
  }

  rebuildForSeedAndTheme(initialPreset, initialSeed);

  function dispose(): void {
    nearTrunkGeo.dispose();
    nearCanopyLowGeo.dispose();
    nearCanopyMidGeo.dispose();
    nearCanopyHighGeo.dispose();
    farTrunkGeo.dispose();
    farCanopyGeo.dispose();
    trunkMat.dispose();
    temperateCanopyMat.dispose();
    coastalPalmMat.dispose();
    alpineConiferMat.dispose();
    variants.forEach((v) => {
      const b = bundles[v];
      b.nearTrunk.dispose();
      b.nearCanopyLow.dispose();
      b.nearCanopyMid.dispose();
      b.nearCanopyHigh.dispose();
      b.farTrunk.dispose();
      b.farCanopy.dispose();
    });
  }

  return {
    group,
    rebuildForSeedAndTheme,
    setQualityPreset,
    updateDistanceLod,
    getActiveTreeCount,
    dispose,
  };
}
