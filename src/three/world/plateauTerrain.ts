/**
 * PAX HISTORIA 3D • Expanded Curved Planetary Plateau, Micro-Climates, Beaches, Mountains & Urban Districts
 * Features:
 * - 112x112m plateau curved along a spherical planetary radius (simulating a real planet surface)
 * - 5 Horizontal Biome & Micro-Climate Sectors with localized atmospheric mist halos
 * - Golden sandy beaches & lagoon shoreline in the South-East + Alpine Mountain Massif in the North-East
 * - Organic 3D Urban Districts (paved marble plazas, connecting imperial roads & street lanterns) generated under buildings
 * - Panoramic Planetary Horizon (curved ocean skirt, distant mountain cordillera, sky dome)
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
import {
  getLocalReliefElevation,
  getPlateauMicroClimateZone,
  getSphericalCurvatureDrop,
  getTerrainHeight,
} from '../../core/terrainMath';
import {
  createPlateauAlbedoTexture,
  createSoftCircularParticleTexture,
  createTerrainBumpTexture,
} from '../textures/proceduralTextures';

export interface PlateauTerrain {
  group: THREE.Group;
  surfaceMesh: THREE.Mesh;
  surfaceGeo: THREE.PlaneGeometry;
  surfaceMat: THREE.MeshStandardMaterial;
  hullMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  horizonGroup: THREE.Group;
  scattersGroup: THREE.Group;
  urbanDistrictGroup: THREE.Group;
  recomputeVertices: (seed?: string | number) => void;
  updateTheme: (preset: WorldPreset, seed: string | number) => void;
  syncUrbanDistricts: (buildings: PlacedBuilding[]) => void;
  updateWaterAnimation: (time: number) => void;
  dispose: () => void;
}

export function createPlateauTerrain(
  initialPreset: WorldPreset,
  initialSeed: string | number
): PlateauTerrain {
  const group = new THREE.Group();

  let currentPreset = initialPreset;
  let currentSeed = initialSeed;
  let lastUrbanKey = '';

  const bumpTexture = createTerrainBumpTexture();
  const albedoTexture = createPlateauAlbedoTexture(initialPreset, initialSeed);

  // 1. Subdivided Curved Surface Plane (112x112 with spherical planetary curvature)
  const surfaceGeo = new THREE.PlaneGeometry(
    wld_PLATEAU_WIDTH,
    wld_PLATEAU_LENGTH,
    wld_PLATEAU_SUBDIVISIONS,
    wld_PLATEAU_SUBDIVISIONS
  );
  surfaceGeo.rotateX(-Math.PI / 2);

  const surfaceMat = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.16,
    roughness: 0.64,
    metalness: 0.06,
    flatShading: false,
  });

  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.receiveShadow = true;
  surfaceMesh.castShadow = true;
  group.add(surfaceMesh);

  // 2. Strategic Atlas Plinth / Beveled Pedestal Underneath
  const rimDrop = getSphericalCurvatureDrop(wld_PLATEAU_WIDTH * 0.5, wld_PLATEAU_LENGTH * 0.5);
  const hullGeo = createBeveledHullGeometry(
    wld_PLATEAU_WIDTH,
    wld_PLATEAU_LENGTH,
    wld_PLATEAU_THICKNESS,
    rimDrop
  );
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.72,
    flatShading: true,
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.receiveShadow = true;
  group.add(hullMesh);

  // 3. Curved Specular Sea / Coastal Lagoon Plane
  const waterSubdivs = 48;
  const waterGeo = new THREE.PlaneGeometry(
    wld_PLATEAU_WIDTH * 0.98,
    wld_PLATEAU_LENGTH * 0.98,
    waterSubdivs,
    waterSubdivs
  );
  waterGeo.rotateX(-Math.PI / 2);

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialPreset.oceanShallowColor),
    roughness: 0.12,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.82,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // 4. LIVING PLANETARY HORIZON (Curved Planetary Sea Skirt + Distant Mountain Cordillera + Sky Dome)
  const horizonGroup = new THREE.Group();
  horizonGroup.name = 'LivingPlanetaryHorizon';

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

  const horizonPeakMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundAccentColor).lerp(
      new THREE.Color(initialPreset.atmosphereColor),
      0.55
    ),
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const horizonSnowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundPeakColor),
    roughness: 0.7,
    flatShading: true,
  });

  const peakGeo = new THREE.ConeGeometry(16, 26, 6);
  const peakCapGeo = new THREE.ConeGeometry(7.5, 11, 6);
  const peakCount = 28;

  for (let p = 0; p < peakCount; p++) {
    const angle = (p / peakCount) * Math.PI * 2 + (p % 3) * 0.08;
    const dist = 132 + (p % 4) * 18;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;
    const baseDrop = getSphericalCurvatureDrop(px, pz) * 0.45 - 6.5;

    const mountainNode = new THREE.Group();
    const scaleH = 0.75 + (p % 5) * 0.24;
    const scaleW = 0.85 + (p % 3) * 0.3;

    const baseCone = new THREE.Mesh(peakGeo, horizonPeakMat);
    baseCone.position.y = 11 * scaleH;
    baseCone.scale.set(scaleW, scaleH, scaleW);
    mountainNode.add(baseCone);

    const snowCap = new THREE.Mesh(peakCapGeo, horizonSnowMat);
    snowCap.position.y = 19.5 * scaleH;
    snowCap.scale.set(scaleW * 0.92, scaleH * 0.85, scaleW * 0.92);
    mountainNode.add(snowCap);

    mountainNode.position.set(px, baseDrop, pz);
    mountainNode.rotation.y = p * 1.1;
    horizonGroup.add(mountainNode);
  }

  const horizonAtmoGeo = new THREE.CylinderGeometry(225, 225, 58, 48, 1, true);
  const horizonAtmoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initialPreset.atmosphereColor),
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const horizonAtmoMesh = new THREE.Mesh(horizonAtmoGeo, horizonAtmoMat);
  horizonAtmoMesh.position.y = 6;
  horizonGroup.add(horizonAtmoMesh);

  group.add(horizonGroup);

  // 5. Realistic Multi-Part Trees, Coastal Palms, Alpine Crags & Micro-Climate Mist Halos
  const scattersGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.16, 0.75, 6);
  const foliageLowGeo = new THREE.ConeGeometry(0.62, 1.25, 7);
  const foliageMidGeo = new THREE.ConeGeometry(0.5, 1.0, 7);
  const foliageTopGeo = new THREE.ConeGeometry(0.36, 0.85, 7);
  const rockGeo = new THREE.DodecahedronGeometry(0.75, 1);
  const alpineCragGeo = new THREE.ConeGeometry(2.4, 5.2, 6);
  const alpineSnowGeo = new THREE.ConeGeometry(1.25, 2.4, 6);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundAccentColor),
    roughness: 0.65,
  });
  const coastalPalmMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.55,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
  });

  // 5a. Sculpted 3D Mountain Crags in the North-Eastern Alpine Massif sector
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

  // 5b. Forest Trees, Coastal Trees & Boulders
  const scatterCount = 82;
  for (let i = 0; i < scatterCount; i++) {
    const angle = (i / scatterCount) * Math.PI * 2 + (i % 5) * 0.42;
    const rad = 9.5 + (i % 9) * 4.2;
    const sx = Math.cos(angle) * rad;
    const sz = Math.sin(angle) * rad;
    const zone = getPlateauMicroClimateZone(sx, sz);

    if (i % 3 !== 0) {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.36;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const leafMat = zone.id === 'coastal_lagoon' ? coastalPalmMat : foliageMat;

      const f1 = new THREE.Mesh(foliageLowGeo, leafMat);
      f1.position.y = 0.98;
      f1.castShadow = true;
      treeGroup.add(f1);

      const f2 = new THREE.Mesh(foliageMidGeo, leafMat);
      f2.position.y = 1.48;
      f2.castShadow = true;
      treeGroup.add(f2);

      const f3 = new THREE.Mesh(foliageTopGeo, leafMat);
      f3.position.y = 1.92;
      f3.castShadow = true;
      treeGroup.add(f3);

      const s = 0.8 + (i % 4) * 0.18;
      treeGroup.scale.setScalar(s);
      treeGroup.userData = { sx, sz, isTree: true };
      scattersGroup.add(treeGroup);
    } else {
      const rMesh = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.6 + (i % 4) * 0.28;
      rMesh.scale.set(s * 1.25, s * 0.78, s);
      rMesh.rotation.set(i * 0.4, i * 0.6, 0);
      rMesh.castShadow = true;
      rMesh.receiveShadow = true;
      rMesh.userData = { sx, sz, isRock: true };
      scattersGroup.add(rMesh);
    }
  }

  // 5c. Soft Micro-Climate Atmospheric Mist Sprites over the horizontal biome sectors
  const mistTex = createSoftCircularParticleTexture();
  const microClimateHalos = [
    { x: 18, z: -20, yOffset: 4.5, color: 0xe2e8f0, scale: 18 }, // Alpine snow mist
    { x: 16, z: 16, yOffset: 1.6, color: 0x38bdf8, scale: 16 },  // Coastal lagoon sea breeze
    { x: -16, z: -14, yOffset: 2.2, color: 0x34d399, scale: 17 }, // Sylvan grove dew
    { x: -16, z: 14, yOffset: 2.4, color: 0xf59e0b, scale: 16 },  // Amber steppe solar haze
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
    sprite.userData = { sx: mc.x, sz: mc.z, yOffset: mc.yOffset, isMist: true };
    scattersGroup.add(sprite);
  });

  group.add(scattersGroup);

  // 6. URBAN DISTRICTS & IMPERIAL ROADS GROUP (Generated organically around buildings & forum)
  const urbanDistrictGroup = new THREE.Group();
  urbanDistrictGroup.name = 'UrbanDistrictPlazasAndRoads';
  group.add(urbanDistrictGroup);

  const plazaDiscGeo = new THREE.CylinderGeometry(3.2, 3.45, 0.14, 16);
  const plazaRingGeo = new THREE.RingGeometry(3.15, 3.42, 24);
  const centralForumGeo = new THREE.CylinderGeometry(6.8, 7.2, 0.16, 24);
  const roadSlabGeo = new THREE.BoxGeometry(1.1, 0.1, 1.4);
  const lampPostGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.35, 6);
  const lampOrbGeo = new THREE.SphereGeometry(0.14, 8, 8);

  const urbanMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xe5dec9,
    roughness: 0.48,
    metalness: 0.12,
  });

  const urbanGoldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.75,
    side: THREE.DoubleSide,
  });

  const lampOrbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  function syncUrbanDistricts(buildings: PlacedBuilding[]): void {
    const key = buildings.map((b) => `${b.id}:${b.x.toFixed(1)},${b.z.toFixed(1)}`).join('|');
    if (key === lastUrbanKey) return;
    lastUrbanKey = key;

    while (urbanDistrictGroup.children.length > 0) {
      urbanDistrictGroup.remove(urbanDistrictGroup.children[0]);
    }

    // Central Imperial Forum Plaza at (0, 0)
    const centerY = getTerrainHeight(0, 0);
    const forumMesh = new THREE.Mesh(centralForumGeo, urbanMarbleMat);
    forumMesh.position.set(0, centerY + 0.04, 0);
    forumMesh.receiveShadow = true;
    urbanDistrictGroup.add(forumMesh);

    // For each building, create a Paved Urban District Plaza + Street Lanterns + Road to Forum
    buildings.forEach((bld, idx) => {
      const by = getTerrainHeight(bld.x, bld.z);

      const plaza = new THREE.Mesh(plazaDiscGeo, urbanMarbleMat);
      plaza.position.set(bld.x, by + 0.03, bld.z);
      plaza.receiveShadow = true;
      urbanDistrictGroup.add(plaza);

      const ring = new THREE.Mesh(plazaRingGeo, urbanGoldTrimMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bld.x, by + 0.11, bld.z);
      urbanDistrictGroup.add(ring);

      // Two warm street lanterns flanking each building plaza
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

      // Paved road stepping stones connecting the building plaza to the Central Forum (0, 0)
      const dist = Math.hypot(bld.x, bld.z);
      if (dist > 4.5 && idx < 18) {
        const steps = Math.min(14, Math.max(3, Math.floor(dist / 2.2)));
        const angle = Math.atan2(bld.x, bld.z);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const rx = bld.x * (1 - t);
          const rz = bld.z * (1 - t);
          const ry = getTerrainHeight(rx, rz);

          const slab = new THREE.Mesh(roadSlabGeo, urbanMarbleMat);
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
    surfaceMat.needsUpdate = true;

    scattersGroup.children.forEach((obj) => {
      const u = obj.userData as {
        sx: number;
        sz: number;
        yOffset?: number;
        isTree?: boolean;
        isAlpineCrag?: boolean;
        isMist?: boolean;
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
    waterMat.color.set(newPreset.oceanShallowColor);
    foliageMat.color.set(newPreset.groundAccentColor);
    horizonSeaMat.color.set(newPreset.oceanDeepColor);
    horizonPeakMat.color
      .set(newPreset.groundAccentColor)
      .lerp(new THREE.Color(newPreset.atmosphereColor), 0.55);
    horizonSnowMat.color.set(newPreset.groundPeakColor);
    horizonAtmoMat.color.set(newPreset.atmosphereColor);
    recomputeVertices(seed);
  }

  function updateWaterAnimation(time: number): void {
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      const x = wPos.getX(i);
      const z = wPos.getZ(i);
      const curveDrop = getSphericalCurvatureDrop(x, z);
      const wave =
        Math.sin(time * 1.8 + x * 0.22 + z * 0.18) * 0.04 +
        Math.cos(time * 1.3 + x * 0.15) * 0.025;
      wPos.setY(i, curveDrop + wave - 0.04);
    }
    wPos.needsUpdate = true;
  }

  function dispose(): void {
    surfaceGeo.dispose();
    surfaceMat.dispose();
    hullGeo.dispose();
    hullMat.dispose();
    waterGeo.dispose();
    waterMat.dispose();
    horizonSeaGeo.dispose();
    horizonSeaMat.dispose();
    peakGeo.dispose();
    peakCapGeo.dispose();
    horizonPeakMat.dispose();
    horizonSnowMat.dispose();
    horizonAtmoGeo.dispose();
    horizonAtmoMat.dispose();
    trunkGeo.dispose();
    foliageLowGeo.dispose();
    foliageMidGeo.dispose();
    foliageTopGeo.dispose();
    rockGeo.dispose();
    alpineCragGeo.dispose();
    alpineSnowGeo.dispose();
    trunkMat.dispose();
    foliageMat.dispose();
    coastalPalmMat.dispose();
    rockMat.dispose();
    plazaDiscGeo.dispose();
    plazaRingGeo.dispose();
    centralForumGeo.dispose();
    roadSlabGeo.dispose();
    lampPostGeo.dispose();
    lampOrbGeo.dispose();
    urbanMarbleMat.dispose();
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
    horizonGroup,
    scattersGroup,
    urbanDistrictGroup,
    recomputeVertices,
    updateTheme,
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

  const indices = [
    4, 6, 5,  4, 7, 6,
    0, 1, 5,  0, 5, 4,
    1, 2, 6,  1, 6, 5,
    2, 3, 7,  2, 7, 6,
    3, 0, 4,  3, 4, 7,
  ];

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
