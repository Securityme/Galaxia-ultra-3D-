/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Blender-Organized Curved Planetary Plateau
 * Architecture D2-GU-PT v7.0.0 — Lot Alpha Integrated:
 * - 112x112m plateau curved along a spherical planetary radius with Sobel 3x3 Normal & Roughness maps (PT-20)
 * - PT-25 (Canonique): Miroir d'eau planétaire à 4 trains d'ondes de Gerstner, reflet céleste dynamique,
 *   reflets projetés des façades monumentales, écume de rivage par altitude & repli Performance (`gerstnerWater.ts`)
 * - PT-27 (Canonique): Forêts en `THREE.InstancedMesh` par sous-biome (420 Cinéma / 280 Équilibré / 140 Performance)
 *   avec placement Mulberry32 (`createPRNG`) et LOD géométrique 3D pur (`instancedForests.ts`)
 * - Quartiers urbains Opus Sectile, routes pavées Via Imperiale et jalons méridiens
 */

import * as THREE from 'three';
import {
  wld_PLATEAU_WIDTH,
  wld_PLATEAU_LENGTH,
  wld_PLATEAU_THICKNESS,
  wld_PLATEAU_SUBDIVISIONS,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
  wld_ARRIVAL_ZONE_RADIUS,
} from '../../config/constants';
import { PlacedBuilding, WorldPreset } from '../../contracts/schemas';
import { createPRNG } from '../../core/prng';
import {
  getLocalReliefElevation,
  getSphericalCurvatureDrop,
  getTerrainHeight,
} from '../../core/terrainMath';
import { GraphicsQualityPreset } from '../postfx/blenderComposer';
import {
  createBronzeFiligreeTexture,
  createBuildingFacadeTexture,
  createCliffStrataTexture,
  createFoliageCanopyTexture,
  createForumMosaicPlazaTexture,
  createImperialRoadCobbleTexture,
  createPlateauAlbedoTexture,
  createPlateauSobelNormalAndRoughnessMaps,
  createSoftCircularParticleTexture,
  createTerrainBumpTexture,
  createTreeBarkTexture,
} from '../textures/proceduralTextures';
import {
  createGerstnerWaterMirror,
  GerstnerWaterMirror,
} from './gerstnerWater';
import {
  createInstancedForests,
  InstancedForestsManager,
} from './instancedForests';
import {
  AuroraHorizonCrown,
  createAuroraHorizonCrown,
} from './horizonCrown';
import {
  createFaunaAndFloraEcosystem,
  FaunaAndFloraEcosystem,
} from './faunaEcosystem';

export interface PlateauTerrain {
  group: THREE.Group;
  surfaceMesh: THREE.Mesh;
  surfaceGeo: THREE.PlaneGeometry;
  surfaceMat: THREE.MeshStandardMaterial;
  hullMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  gerstnerWater: GerstnerWaterMirror;
  instancedForests: InstancedForestsManager;
  auroraHorizon: AuroraHorizonCrown;
  faunaEcosystem: FaunaAndFloraEcosystem;
  horizonGroup: THREE.Group;
  scattersGroup: THREE.Group;
  urbanDistrictGroup: THREE.Group;
  recomputeVertices: (seed?: string | number) => void;
  updateTheme: (preset: WorldPreset, seed: string | number) => void;
  setQualityPreset: (
    preset: GraphicsQualityPreset,
    reducedMotion: boolean
  ) => void;
  syncUrbanDistricts: (buildings: PlacedBuilding[]) => void;
  updateWaterAnimation: (
    elapsedTime: number,
    celestialTime?: number,
    sunDirection?: THREE.Vector3,
    cameraPosition?: THREE.Vector3,
    tickIndex?: number,
    isGlobeMode?: boolean
  ) => void;
  dispose: () => void;
}

export function createPlateauTerrain(
  initialPreset: WorldPreset,
  initialSeed: string | number,
  isSoftwareGl = false
): PlateauTerrain {
  const group = new THREE.Group();
  group.name = 'Collection_01_PlanetaryPlateau';

  let currentPreset = initialPreset;
  let currentSeed = initialSeed;
  let lastUrbanKey = '';

  const bumpTexture = createTerrainBumpTexture();
  const albedoTexture = createPlateauAlbedoTexture(initialPreset, initialSeed);
  const { normalMap, roughnessMap } =
    createPlateauSobelNormalAndRoughnessMaps(initialSeed);
  const cliffStrataTex = createCliffStrataTexture();
  const treeBarkTex = createTreeBarkTexture();
  const foliageCanopyTex = createFoliageCanopyTexture();
  const forumMosaicTex = createForumMosaicPlazaTexture();
  const roadCobbleTex = createImperialRoadCobbleTexture();
  const marbleFacadeTex = createBuildingFacadeTexture();
  const bronzeFiligreeTex = createBronzeFiligreeTexture();

  // 1. Subdivided Curved Surface Plane (112x112 with spherical planetary curvature + Sobel PBR Maps)
  const surfaceGeo = new THREE.PlaneGeometry(
    wld_PLATEAU_WIDTH,
    wld_PLATEAU_LENGTH,
    wld_PLATEAU_SUBDIVISIONS,
    wld_PLATEAU_SUBDIVISIONS
  );
  surfaceGeo.rotateX(-Math.PI / 2);

  const surfaceMat = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap,
    bumpMap: bumpTexture,
    bumpScale: 0.1,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: false,
  });

  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.name = 'Mesh_TerrainSurface';
  surfaceMesh.receiveShadow = true;
  surfaceMesh.castShadow = true;
  group.add(surfaceMesh);

  // 2. Strategic Atlas Plinth / Beveled Sedimentary Cliff Pedestal Underneath
  const rimDrop = getSphericalCurvatureDrop(
    wld_PLATEAU_WIDTH * 0.5,
    wld_PLATEAU_LENGTH * 0.5
  );
  const hullGeo = createBeveledHullGeometry(
    wld_PLATEAU_WIDTH,
    wld_PLATEAU_LENGTH,
    wld_PLATEAU_THICKNESS,
    rimDrop
  );
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: cliffStrataTex,
    bumpMap: bumpTexture,
    bumpScale: 0.12,
    roughness: 0.48,
    metalness: 0.52,
    flatShading: true,
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.name = 'Mesh_PlateauCliffPlinth';
  hullMesh.receiveShadow = true;
  group.add(hullMesh);

  // 3. PT-25 (Canonique): Planetary Gerstner Water Mirror (4 wave trains, sky & monument reflections, shoreline foam)
  const gerstnerWater = createGerstnerWaterMirror(
    initialPreset,
    bumpTexture,
    isSoftwareGl
  );
  const waterMesh = gerstnerWater.mesh;
  group.add(waterMesh);

  // 4. PT-27 (Canonique): Sub-Biome InstancedMesh Forests (Mulberry32 deterministic + 3D geometric distance LOD)
  const instancedForests = createInstancedForests(
    initialPreset,
    initialSeed,
    treeBarkTex,
    foliageCanopyTex
  );
  group.add(instancedForests.group);

  // 5. PT-60: LIVING PLANETARY HORIZON (« Couronne de l'Aurore » — H1..H4 deterministic layers + Sea Skirt)
  const horizonGroup = new THREE.Group();
  horizonGroup.name = 'SubCollection_PlanetaryHorizon';

  const auroraHorizon = createAuroraHorizonCrown(initialPreset, initialSeed);
  horizonGroup.add(auroraHorizon.group);
  let activeQualityPreset: GraphicsQualityPreset = 'cinema';
  let isReducedMotion = false;

  // 4b. Living 3D Fauna & Lush Undergrowth Flora Ecosystem
  const faunaEcosystem = createFaunaAndFloraEcosystem(initialPreset, initialSeed);
  group.add(faunaEcosystem.group);

  const horizonSeaGeo = new THREE.RingGeometry(60, 235, 64, 16);
  horizonSeaGeo.rotateX(-Math.PI / 2);
  const hSeaPos = horizonSeaGeo.attributes.position;
  for (let i = 0; i < hSeaPos.count; i++) {
    const hx = hSeaPos.getX(i);
    const hz = hSeaPos.getZ(i);
    const drop = getSphericalCurvatureDrop(hx, hz) * 0.45 - 3.2;
    hSeaPos.setY(i, drop);
  }
  horizonSeaGeo.computeVertexNormals();

  const horizonSeaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.oceanDeepColor),
    roughness: 0.28,
    metalness: 0.2,
    transparent: true,
    opacity: 0.78,
  });
  const horizonSeaMesh = new THREE.Mesh(horizonSeaGeo, horizonSeaMat);
  horizonGroup.add(horizonSeaMesh);

  const horizonSnowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundPeakColor),
    map: foliageCanopyTex,
    roughness: 0.68,
    flatShading: true,
  });

  group.add(horizonGroup);

  // 6. GEOLOGICAL LANDMARKS, ALPINE CRAGS, CRYSTAL NODES & BOULDERS
  const scattersGroup = new THREE.Group();
  scattersGroup.name = 'SubCollection_TerrainPropsAndBiomeScatters';

  const rockGeo = new THREE.DodecahedronGeometry(0.75, 1);
  const alpineCragGeo = new THREE.ConeGeometry(2.4, 5.2, 6);
  const alpineSnowGeo = new THREE.ConeGeometry(1.25, 2.4, 6);
  const crystalPrismGeo = new THREE.OctahedronGeometry(0.45, 0);
  const milestoneColumnGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.45, 8);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x8594a6,
    map: cliffStrataTex,
    bumpMap: bumpTexture,
    bumpScale: 0.09,
    roughness: 0.74,
    metalness: 0.1,
    flatShading: true,
  });
  const crystalMineralMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.edgeColor),
    emissive: new THREE.Color(initialPreset.edgeColor),
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.35,
  });
  const milestoneMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf7f2e7,
    map: marbleFacadeTex,
    bumpMap: marbleFacadeTex,
    bumpScale: 0.04,
    roughness: 0.38,
    metalness: 0.12,
  });

  // 6a. Sculpted 3D Mountain Crags in the North-Eastern Alpine Massif sector
  const alpineCoords = [
    { x: 18, z: -22, s: 1.35 },
    { x: 25, z: -18, s: 1.55 },
    { x: 12, z: -27, s: 1.15 },
    { x: 28, z: -26, s: 1.45 },
    { x: -18, z: -25, s: 1.1 },
  ];

  alpineCoords.forEach((ac, idx) => {
    const cragNode = new THREE.Group();
    const rockCone = new THREE.Mesh(alpineCragGeo, rockMat);
    rockCone.position.y = 2.2 * ac.s;
    rockCone.scale.set(ac.s, ac.s, ac.s);
    rockCone.castShadow = true;
    rockCone.receiveShadow = true;
    cragNode.add(rockCone);

    const snowCone = new THREE.Mesh(alpineSnowGeo, horizonSnowMat);
    snowCone.position.y = 3.9 * ac.s;
    snowCone.scale.set(ac.s * 0.95, ac.s * 0.9, ac.s * 0.95);
    cragNode.add(snowCone);

    cragNode.rotation.y = idx * 0.9;
    cragNode.userData = { sx: ac.x, sz: ac.z, isAlpineCrag: true };
    scattersGroup.add(cragNode);
  });

  // 6b. Classical Meridian Milestone Obelisks & Scenic Marble Belvedere Gazebos
  const milestoneCoords = [
    { x: -12, z: -12 },
    { x: 12, z: -12 },
    { x: -12, z: 12 },
    { x: 14, z: 10 },
    { x: -22, z: 4 },
    { x: 22, z: 4 },
  ];

  milestoneCoords.forEach((mc) => {
    const milestoneGroup = new THREE.Group();
    const col = new THREE.Mesh(milestoneColumnGeo, milestoneMarbleMat);
    col.position.y = 0.72;
    col.castShadow = true;
    milestoneGroup.add(col);

    const cap = new THREE.Mesh(crystalPrismGeo, crystalMineralMat);
    cap.scale.setScalar(0.55);
    cap.position.y = 1.65;
    milestoneGroup.add(cap);

    milestoneGroup.userData = { sx: mc.x, sz: mc.z, isLandmarkProp: true };
    scattersGroup.add(milestoneGroup);
  });

  // 6b-bis. Scenic Hilltop Astral Belvederes (Kiosques Célestes à colonnade et coupole dorée)
  const belvederePlinthGeo = new THREE.CylinderGeometry(1.65, 1.85, 0.24, 16);
  const belvedereDomeGeo = new THREE.SphereGeometry(
    1.45,
    16,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5
  );
  const belvedereCoords = [
    { x: -24, z: -16 },
    { x: 24, z: 16 },
    { x: -20, z: 22 },
  ];

  belvedereCoords.forEach((bc) => {
    const belvGroup = new THREE.Group();
    const plinth = new THREE.Mesh(belvederePlinthGeo, milestoneMarbleMat);
    plinth.position.y = 0.12;
    plinth.receiveShadow = true;
    belvGroup.add(plinth);

    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2;
      const pillar = new THREE.Mesh(milestoneColumnGeo, milestoneMarbleMat);
      pillar.scale.set(0.65, 0.95, 0.65);
      pillar.position.set(Math.cos(a) * 1.25, 0.9, Math.sin(a) * 1.25);
      pillar.castShadow = true;
      belvGroup.add(pillar);
    }

    const dome = new THREE.Mesh(belvedereDomeGeo, crystalMineralMat);
    dome.position.y = 1.58;
    dome.scale.set(1, 0.55, 1);
    belvGroup.add(dome);

    const finial = new THREE.Mesh(crystalPrismGeo, crystalMineralMat);
    finial.position.y = 2.65;
    finial.scale.setScalar(0.65);
    belvGroup.add(finial);

    belvGroup.userData = { sx: bc.x, sz: bc.z, isLandmarkProp: true };
    scattersGroup.add(belvGroup);
  });

  // 6c. Deterministic Mineral Geodes & Sedimentary Boulders (via Mulberry32 createPRNG)
  const rockRng = createPRNG(`${initialSeed}_boulders_v7`);
  const boulderCount = 40;
  for (let i = 0; i < boulderCount; i++) {
    const angle = rockRng() * Math.PI * 2;
    const rad = 10.5 + rockRng() * 36.0;
    const sx = Math.cos(angle) * rad;
    const sz = Math.sin(angle) * rad;

    const rockCluster = new THREE.Group();
    const rMesh = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.58 + rockRng() * 0.65;
    rMesh.scale.set(s * 1.25, s * 0.78, s);
    rMesh.rotation.set(rockRng() * Math.PI, rockRng() * Math.PI, 0);
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    rockCluster.add(rMesh);

    if (i % 2 === 0) {
      const crystal = new THREE.Mesh(crystalPrismGeo, crystalMineralMat);
      crystal.scale.set(0.55, 1.15, 0.55);
      crystal.position.set(0.25, 0.45, 0);
      crystal.rotation.z = -0.28;
      rockCluster.add(crystal);
    }

    rockCluster.userData = { sx, sz, isRock: true };
    scattersGroup.add(rockCluster);
  }

  // 6d. Soft Micro-Climate Atmospheric Mist Sprites
  const mistTex = createSoftCircularParticleTexture();
  const microClimateHalos = [
    { x: 18, z: -20, yOffset: 4.5, color: 0xe2e8f0, scale: 18 },
    { x: 16, z: 16, yOffset: 1.6, color: 0x38bdf8, scale: 16 },
    { x: -16, z: -14, yOffset: 2.2, color: 0x34d399, scale: 17 },
    { x: -16, z: 14, yOffset: 2.4, color: 0xf59e0b, scale: 16 },
  ];

  microClimateHalos.forEach((mc) => {
    const spriteMat = new THREE.SpriteMaterial({
      map: mistTex,
      color: mc.color,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(mc.scale, mc.scale * 0.45, 1);
    sprite.userData = {
      sx: mc.x,
      sz: mc.z,
      yOffset: mc.yOffset,
      isMist: true,
    };
    scattersGroup.add(sprite);
  });

  group.add(scattersGroup);

  // 7. URBAN DISTRICTS, OPUS SECTILE FORUM PLAZAS & COBBLESTONE ROADS
  const urbanDistrictGroup = new THREE.Group();
  urbanDistrictGroup.name = 'SubCollection_UrbanDistrictsAndRoads';
  group.add(urbanDistrictGroup);

  const plazaDiscGeo = new THREE.CylinderGeometry(3.2, 3.45, 0.14, 24);
  const plazaRingGeo = new THREE.RingGeometry(3.15, 3.42, 32);
  const centralForumGeo = new THREE.CylinderGeometry(6.8, 7.2, 0.16, 32);
  const roadSlabGeo = new THREE.BoxGeometry(1.25, 0.11, 1.55);
  const lampPostGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.35, 6);
  const lampOrbGeo = new THREE.SphereGeometry(0.14, 8, 8);

  const urbanPlazaMosaicMat = new THREE.MeshStandardMaterial({
    color: 0xf7f2e7,
    map: forumMosaicTex,
    bumpMap: forumMosaicTex,
    bumpScale: 0.04,
    roughness: 0.42,
    metalness: 0.14,
  });

  const urbanRoadCobbleMat = new THREE.MeshStandardMaterial({
    color: 0xede5d5,
    map: roadCobbleTex,
    bumpMap: roadCobbleTex,
    bumpScale: 0.06,
    roughness: 0.54,
    metalness: 0.1,
  });

  const urbanGoldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    map: bronzeFiligreeTex,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.78,
    side: THREE.DoubleSide,
  });

  const lampOrbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  function syncUrbanDistricts(buildings: PlacedBuilding[]): void {
    const key = buildings
      .map((b) => `${b.id}:${b.x.toFixed(1)},${b.z.toFixed(1)},${b.tier ?? 1}`)
      .join('|');
    if (key === lastUrbanKey) return;
    lastUrbanKey = key;

    // Update projected monumental facade reflections on the Gerstner water mirror (PT-25)
    gerstnerWater.syncBuildingsForReflection(buildings);

    while (urbanDistrictGroup.children.length > 0) {
      urbanDistrictGroup.remove(urbanDistrictGroup.children[0]);
    }

    const centerY = getTerrainHeight(0, 0);
    const forumMesh = new THREE.Mesh(centralForumGeo, urbanPlazaMosaicMat);
    forumMesh.position.set(0, centerY + 0.04, 0);
    forumMesh.receiveShadow = true;
    urbanDistrictGroup.add(forumMesh);

    buildings.forEach((bld, idx) => {
      const by = getTerrainHeight(bld.x, bld.z);

      const plaza = new THREE.Mesh(plazaDiscGeo, urbanPlazaMosaicMat);
      plaza.position.set(bld.x, by + 0.03, bld.z);
      plaza.receiveShadow = true;
      urbanDistrictGroup.add(plaza);

      const ring = new THREE.Mesh(plazaRingGeo, urbanGoldTrimMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bld.x, by + 0.11, bld.z);
      urbanDistrictGroup.add(ring);

      for (const side of [-1, 1]) {
        const lx = bld.x + side * 2.6;
        const lz = bld.z + 1.8;
        const ly = getTerrainHeight(lx, lz);

        const post = new THREE.Mesh(lampPostGeo, urbanGoldTrimMat);
        post.position.set(lx, ly + 0.65, lz);
        urbanDistrictGroup.add(post);

        const orb = new THREE.Mesh(lampOrbGeo, lampOrbMat);
        orb.position.set(lx, ly + 1.38, lz);
        urbanDistrictGroup.add(orb);
      }

      const dist = Math.hypot(bld.x, bld.z);
      if (dist > 4.5 && idx < 18) {
        const steps = Math.min(14, Math.max(3, Math.floor(dist / 2.2)));
        const angle = Math.atan2(bld.x, bld.z);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const rx = bld.x * (1 - t);
          const rz = bld.z * (1 - t);
          const ry = getTerrainHeight(rx, rz);

          const slab = new THREE.Mesh(roadSlabGeo, urbanRoadCobbleMat);
          slab.position.set(rx, ry + 0.03, rz);
          slab.rotation.y = angle;
          slab.receiveShadow = true;
          urbanDistrictGroup.add(slab);
        }
      }
    });
  }

  function recomputeVertices(seedOverride?: string | number): void {
    if (seedOverride !== undefined) {
      currentSeed = seedOverride;
    }

    const pos = surfaceGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = getTerrainHeight(x, z);
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    surfaceGeo.computeVertexNormals();

    surfaceMat.map = createPlateauAlbedoTexture(currentPreset, currentSeed);
    const derivedPbr = createPlateauSobelNormalAndRoughnessMaps(currentSeed);
    surfaceMat.normalMap = derivedPbr.normalMap;
    surfaceMat.roughnessMap = derivedPbr.roughnessMap;
    surfaceMat.needsUpdate = true;

    // Refresh shoreline bathymetry, InstancedMesh forests & Living Fauna/Flora
    gerstnerWater.rebuildShorelineDepthMap();
    instancedForests.rebuildForSeedAndTheme(currentPreset, currentSeed);
    faunaEcosystem.rebuildForSeedAndTheme(currentPreset, currentSeed);

    scattersGroup.children.forEach((obj) => {
      const u = obj.userData as {
        sx: number;
        sz: number;
        yOffset?: number;
        isAlpineCrag?: boolean;
        isMist?: boolean;
        isLandmarkProp?: boolean;
        isRock?: boolean;
      };
      if (!u) return;

      const gh = getTerrainHeight(u.sx, u.sz);
      if (u.isMist) {
        obj.position.set(u.sx, gh + (u.yOffset ?? 2.5), u.sz);
        return;
      }

      if (u.isAlpineCrag) {
        obj.position.set(u.sx, gh - 0.3, u.sz);
        return;
      }

      const localElev = getLocalReliefElevation(u.sx, u.sz);
      const distToArrival = Math.hypot(
        u.sx - wld_ARRIVAL_ZONE_X,
        u.sz - wld_ARRIVAL_ZONE_Z
      );
      const distToForum = Math.hypot(u.sx, u.sz);

      obj.visible =
        localElev > 0.04 &&
        distToArrival > wld_ARRIVAL_ZONE_RADIUS + 2.5 &&
        distToForum > 8.5;
      obj.position.set(u.sx, gh, u.sz);
    });

    lastUrbanKey = '';
  }

  recomputeVertices();

  function updateTheme(newPreset: WorldPreset, seed: string | number): void {
    currentPreset = newPreset;
    currentSeed = seed;
    gerstnerWater.updateTheme(newPreset);
    auroraHorizon.rebuildForThemeAndSeed(newPreset, seed);
    crystalMineralMat.color.set(newPreset.edgeColor);
    crystalMineralMat.emissive.set(newPreset.edgeColor);
    horizonSeaMat.color.set(newPreset.oceanDeepColor);
    horizonSnowMat.color.set(newPreset.groundPeakColor);
    recomputeVertices(seed);
  }

  function setQualityPreset(
    preset: GraphicsQualityPreset,
    reducedMotion: boolean
  ): void {
    activeQualityPreset = preset;
    isReducedMotion = reducedMotion;
    gerstnerWater.setQualityPreset(preset, reducedMotion);
    instancedForests.setQualityPreset(preset);
  }

  const defaultSunDir = new THREE.Vector3(0.45, 0.78, 0.42).normalize();

  function updateWaterAnimation(
    elapsedTime: number,
    celestialTime = 0.35,
    sunDirection: THREE.Vector3 = defaultSunDir,
    cameraPosition?: THREE.Vector3,
    tickIndex = 0,
    isGlobeMode = false
  ): void {
    gerstnerWater.update(elapsedTime, celestialTime, sunDirection);
    auroraHorizon.updateByTick(
      tickIndex,
      celestialTime,
      activeQualityPreset,
      isGlobeMode
    );
    faunaEcosystem.update(elapsedTime, isReducedMotion);
    if (cameraPosition) {
      instancedForests.updateDistanceLod(cameraPosition);
    }
  }

  function dispose(): void {
    surfaceGeo.dispose();
    surfaceMat.dispose();
    hullGeo.dispose();
    hullMat.dispose();
    gerstnerWater.dispose();
    instancedForests.dispose();
    auroraHorizon.dispose();
    faunaEcosystem.dispose();
    horizonSeaGeo.dispose();
    horizonSeaMat.dispose();
    horizonSnowMat.dispose();
    rockGeo.dispose();
    alpineCragGeo.dispose();
    alpineSnowGeo.dispose();
    crystalPrismGeo.dispose();
    milestoneColumnGeo.dispose();
    belvederePlinthGeo.dispose();
    belvedereDomeGeo.dispose();
    rockMat.dispose();
    crystalMineralMat.dispose();
    milestoneMarbleMat.dispose();
    plazaDiscGeo.dispose();
    plazaRingGeo.dispose();
    centralForumGeo.dispose();
    roadSlabGeo.dispose();
    lampPostGeo.dispose();
    lampOrbGeo.dispose();
    urbanPlazaMosaicMat.dispose();
    urbanRoadCobbleMat.dispose();
    urbanGoldTrimMat.dispose();
    lampOrbMat.dispose();
  }

  return {
    group,
    surfaceMesh,
    surfaceGeo,
    surfaceMat,
    hullMesh,
    waterMesh,
    gerstnerWater,
    instancedForests,
    auroraHorizon,
    faunaEcosystem,
    horizonGroup,
    scattersGroup,
    urbanDistrictGroup,
    recomputeVertices,
    updateTheme,
    setQualityPreset,
    syncUrbanDistricts,
    updateWaterAnimation,
    dispose,
  };
}

function createBeveledHullGeometry(
  width: number,
  length: number,
  depth: number,
  rimDrop: number
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const halfW = width * 0.5;
  const halfL = length * 0.5;
  const taper = 0.86;
  const bottomW = halfW * taper;
  const bottomL = halfL * taper;
  const topY = rimDrop - 0.2;
  const botY = topY - depth;

  const vertices = [
    -halfW, topY, -halfL,
     halfW, topY, -halfL,
     halfW, topY,  halfL,
    -halfW, topY,  halfL,
    -bottomW, botY, -bottomL,
     bottomW, botY, -bottomL,
     bottomW, botY,  bottomL,
    -bottomW, botY,  bottomL,
  ];

  const uvs = [
    0, 1,
    1, 1,
    1, 1,
    0, 1,
    0, 0,
    1, 0,
    1, 0,
    0, 0,
  ];

  const indices = [
    4, 6, 5,  4, 7, 6,
    0, 1, 5,  0, 5, 4,
    1, 2, 6,  1, 6, 5,
    2, 3, 7,  2, 7, 6,
    3, 0, 4,  3, 4, 7,
  ];

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
