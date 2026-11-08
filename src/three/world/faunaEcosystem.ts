/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Living 3D Fauna & Lush Botanical Flora Ecosystem
 * Populates the 112x112m planetary plateau with deterministic Mulberry32 lifeforms:
 * 1. Celestial Bird Flocks (16 articulated 3D birds with flapping wings soaring over valleys)
 * 2. Glade Quadruped Fauna (12 sculpted 3D stags/gazelles with golden antlers wandering the meadows)
 * 3. Lagoon Aquatic Fauna (14 luminescent koi/rays gliding in coastal water basins)
 * 4. Lush Undergrowth Flora & Pollinators (48 fern rosettes, flowering shrubs, floating waterlilies & 22 butterflies)
 */

import * as THREE from 'three';
import {
  wld_ARRIVAL_ZONE_RADIUS,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
} from '../../config/constants';
import { WorldPreset } from '../../contracts/schemas';
import { createPRNG } from '../../core/prng';
import {
  getLocalReliefElevation,
  getSphericalCurvatureDrop,
  getTerrainHeight,
} from '../../core/terrainMath';

interface BirdAgent {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  altitude: number;
  speed: number;
  phase: number;
  flapSpeed: number;
}

interface GrazerAgent {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  homeX: number;
  homeZ: number;
  roamRadius: number;
  speed: number;
  phase: number;
}

interface AquaticAgent {
  root: THREE.Group;
  tailMesh: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radius: number;
  speed: number;
  phase: number;
}

interface ButterflyAgent {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  phase: number;
  speed: number;
}

interface FloraNode {
  root: THREE.Group;
  sx: number;
  sz: number;
  isWaterLily: boolean;
  swayPhase: number;
}

export interface FaunaAndFloraEcosystem {
  group: THREE.Group;
  rebuildForSeedAndTheme: (preset: WorldPreset, seed: string | number) => void;
  update: (elapsedTime: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}

export function createFaunaAndFloraEcosystem(
  initialPreset: WorldPreset,
  initialSeed: string | number
): FaunaAndFloraEcosystem {
  const group = new THREE.Group();
  group.name = 'SubCollection_LivingFaunaAndFlora';

  const birdsGroup = new THREE.Group();
  birdsGroup.name = 'Fauna_CelestialBirds';
  group.add(birdsGroup);

  const grazersGroup = new THREE.Group();
  grazersGroup.name = 'Fauna_GladeGrazers';
  group.add(grazersGroup);

  const aquaticGroup = new THREE.Group();
  aquaticGroup.name = 'Fauna_LagoonAquatic';
  group.add(aquaticGroup);

  const floraGroup = new THREE.Group();
  floraGroup.name = 'Flora_UndergrowthAndWaterlilies';
  group.add(floraGroup);

  const butterfliesGroup = new THREE.Group();
  butterfliesGroup.name = 'Fauna_Pollinators';
  group.add(butterfliesGroup);

  const birds: BirdAgent[] = [];
  const grazers: GrazerAgent[] = [];
  const aquatics: AquaticAgent[] = [];
  const butterflies: ButterflyAgent[] = [];
  const floraNodes: FloraNode[] = [];

  // Shared Geometries
  const birdBodyGeo = new THREE.ConeGeometry(0.11, 0.48, 5);
  birdBodyGeo.rotateX(Math.PI / 2);
  const birdWingGeo = new THREE.BoxGeometry(0.46, 0.025, 0.18);

  const stagBodyGeo = new THREE.CapsuleGeometry(0.18, 0.42, 4, 8);
  stagBodyGeo.rotateZ(Math.PI / 2);
  const stagNeckGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.34, 6);
  const stagHeadGeo = new THREE.BoxGeometry(0.16, 0.14, 0.26);
  const stagAntlerGeo = new THREE.ConeGeometry(0.035, 0.28, 4);
  const stagLegGeo = new THREE.CylinderGeometry(0.035, 0.025, 0.38, 5);

  const koiBodyGeo = new THREE.ConeGeometry(0.14, 0.52, 6);
  koiBodyGeo.rotateX(Math.PI / 2);
  const koiTailGeo = new THREE.BoxGeometry(0.03, 0.18, 0.24);

  const fernFrondGeo = new THREE.ConeGeometry(0.22, 0.78, 4);
  const shrubSphereGeo = new THREE.DodecahedronGeometry(0.42, 1);
  const blossomGeo = new THREE.OctahedronGeometry(0.11, 0);
  const lilyPadGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.03, 12);
  const lotusFlowerGeo = new THREE.ConeGeometry(0.18, 0.22, 6);
  const butterflyWingGeo = new THREE.PlaneGeometry(0.14, 0.18);

  // Shared Materials
  const birdFeatherMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.1,
  });

  const stagCoatMat = new THREE.MeshStandardMaterial({
    color: 0xd9a066,
    roughness: 0.65,
    metalness: 0.08,
  });

  const stagAntlerMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.65,
  });

  const koiMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xfb923c,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.2,
  });

  const fernMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundAccentColor),
    roughness: 0.6,
    metalness: 0.05,
    flatShading: true,
  });

  const shrubMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundBaseColor).lerp(
      new THREE.Color(0x10b981),
      0.55
    ),
    roughness: 0.68,
    flatShading: true,
  });

  const blossomMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.edgeColor),
    emissive: new THREE.Color(initialPreset.edgeColor),
    emissiveIntensity: 0.6,
    roughness: 0.25,
  });

  const lilyPadMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.5,
  });

  const lotusMat = new THREE.MeshStandardMaterial({
    color: 0xfdf2f8,
    emissive: 0xf472b6,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  const butterflyMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  function clearGroup(g: THREE.Group) {
    while (g.children.length > 0) {
      g.remove(g.children[0]);
    }
  }

  function rebuildForSeedAndTheme(preset: WorldPreset, seed: string | number) {
    clearGroup(birdsGroup);
    clearGroup(grazersGroup);
    clearGroup(aquaticGroup);
    clearGroup(floraGroup);
    clearGroup(butterfliesGroup);

    birds.length = 0;
    grazers.length = 0;
    aquatics.length = 0;
    butterflies.length = 0;
    floraNodes.length = 0;

    // Update theme materials
    fernMat.color.set(preset.groundAccentColor);
    shrubMat.color
      .set(preset.groundBaseColor)
      .lerp(new THREE.Color(0x10b981), 0.5);
    blossomMat.color.set(preset.edgeColor);
    blossomMat.emissive.set(preset.edgeColor);
    birdFeatherMat.emissive.set(preset.edgeColor);
    butterflyMat.color.set(preset.edgeColor);

    const rng = createPRNG(`${seed}_fauna_flora_v8`);

    // 1. Spawn 16 Celestial Birds soaring above the plateau
    const birdCount = 16;
    for (let i = 0; i < birdCount; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(birdBodyGeo, birdFeatherMat);
      root.add(body);

      const leftWing = new THREE.Mesh(birdWingGeo, birdFeatherMat);
      leftWing.position.set(-0.22, 0.02, 0);
      root.add(leftWing);

      const rightWing = new THREE.Mesh(birdWingGeo, birdFeatherMat);
      rightWing.position.set(0.22, 0.02, 0);
      root.add(rightWing);

      const scale = 0.75 + rng() * 0.55;
      root.scale.setScalar(scale);

      birdsGroup.add(root);
      birds.push({
        root,
        leftWing,
        rightWing,
        centerX: (rng() - 0.5) * 38,
        centerZ: (rng() - 0.5) * 38,
        radiusX: 10 + rng() * 22,
        radiusZ: 10 + rng() * 22,
        altitude: 6.5 + rng() * 7.5,
        speed: 0.32 + rng() * 0.28,
        phase: rng() * Math.PI * 2,
        flapSpeed: 5.5 + rng() * 3.5,
      });
    }

    // 2. Spawn 12 Glade Grazers (Deer / Gazelles) on elevated grassy meadows
    let grazerAttempts = 0;
    while (grazers.length < 12 && grazerAttempts < 80) {
      grazerAttempts++;
      const angle = rng() * Math.PI * 2;
      const rad = 11 + rng() * 31;
      const hx = Math.cos(angle) * rad;
      const hz = Math.sin(angle) * rad;

      const distArrival = Math.hypot(
        hx - wld_ARRIVAL_ZONE_X,
        hz - wld_ARRIVAL_ZONE_Z
      );
      if (distArrival < wld_ARRIVAL_ZONE_RADIUS + 4) continue;

      const elev = getLocalReliefElevation(hx, hz);
      if (elev < 0.08 || elev > 1.8) continue;

      const root = new THREE.Group();
      const torso = new THREE.Mesh(stagBodyGeo, stagCoatMat);
      torso.position.y = 0.44;
      torso.castShadow = true;
      root.add(torso);

      const headGroup = new THREE.Group();
      headGroup.position.set(0.24, 0.56, 0);

      const neck = new THREE.Mesh(stagNeckGeo, stagCoatMat);
      neck.rotation.z = -0.35;
      neck.position.set(0.05, 0.12, 0);
      headGroup.add(neck);

      const head = new THREE.Mesh(stagHeadGeo, stagCoatMat);
      head.position.set(0.16, 0.28, 0);
      headGroup.add(head);

      const antlerL = new THREE.Mesh(stagAntlerGeo, stagAntlerMat);
      antlerL.position.set(0.12, 0.44, -0.07);
      antlerL.rotation.set(-0.25, 0, 0.2);
      headGroup.add(antlerL);

      const antlerR = new THREE.Mesh(stagAntlerGeo, stagAntlerMat);
      antlerR.position.set(0.12, 0.44, 0.07);
      antlerR.rotation.set(0.25, 0, 0.2);
      headGroup.add(antlerR);

      root.add(headGroup);

      const legPositions = [
        [0.18, 0.19, -0.1],
        [0.18, 0.19, 0.1],
        [-0.18, 0.19, -0.1],
        [-0.18, 0.19, 0.1],
      ];
      const legs: THREE.Mesh[] = [];
      legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(stagLegGeo, stagCoatMat);
        leg.position.set(lx, ly, lz);
        root.add(leg);
        legs.push(leg);
      });

      const s = 0.72 + rng() * 0.35;
      root.scale.setScalar(s);

      grazersGroup.add(root);
      grazers.push({
        root,
        headGroup,
        legs,
        homeX: hx,
        homeZ: hz,
        roamRadius: 2.2 + rng() * 2.8,
        speed: 0.42 + rng() * 0.35,
        phase: rng() * Math.PI * 2,
      });
    }

    // 3. Spawn 14 Aquatic Koi / Luminescent Rays in submerged coastal basins
    let aquaticAttempts = 0;
    while (aquatics.length < 14 && aquaticAttempts < 120) {
      aquaticAttempts++;
      const angle = rng() * Math.PI * 2;
      const rad = 12 + rng() * 34;
      const wx = Math.cos(angle) * rad;
      const wz = Math.sin(angle) * rad;

      const elev = getLocalReliefElevation(wx, wz);
      if (elev > 0.02) continue;

      const root = new THREE.Group();
      const body = new THREE.Mesh(koiBodyGeo, koiMat);
      body.scale.set(1.1, 0.45, 1.0);
      root.add(body);

      const tailMesh = new THREE.Mesh(koiTailGeo, stagAntlerMat);
      tailMesh.position.set(0, 0, -0.28);
      root.add(tailMesh);

      const s = 0.75 + rng() * 0.55;
      root.scale.setScalar(s);

      aquaticGroup.add(root);
      aquatics.push({
        root,
        tailMesh,
        centerX: wx,
        centerZ: wz,
        radius: 1.4 + rng() * 2.2,
        speed: 0.65 + rng() * 0.5,
        phase: rng() * Math.PI * 2,
      });
    }

    // 4. Spawn 56 Lush Botanical Flora Clusters (Ferns, Flowering Shrubs, Waterlilies)
    const floraTarget = 56;
    for (let i = 0; i < floraTarget * 2 && floraNodes.length < floraTarget; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 7.5 + rng() * 39;
      const fx = Math.cos(angle) * rad;
      const fz = Math.sin(angle) * rad;

      const distArrival = Math.hypot(
        fx - wld_ARRIVAL_ZONE_X,
        fz - wld_ARRIVAL_ZONE_Z
      );
      if (distArrival < wld_ARRIVAL_ZONE_RADIUS + 2.2) continue;

      const elev = getLocalReliefElevation(fx, fz);
      const isWaterLily = elev <= 0.025 && elev >= -0.35;

      const nodeRoot = new THREE.Group();

      if (isWaterLily) {
        // Floating Waterlily & Lotus Pad on the Lagoon
        const pad = new THREE.Mesh(lilyPadGeo, lilyPadMat);
        const padScale = 0.8 + rng() * 0.7;
        pad.scale.setScalar(padScale);
        nodeRoot.add(pad);

        if (rng() > 0.3) {
          const flower = new THREE.Mesh(lotusFlowerGeo, lotusMat);
          flower.position.y = 0.11;
          nodeRoot.add(flower);
        }
      } else if (elev > 0.04) {
        // Lush Terrestrial Fern Rosette + Flowering Shrub + Glowing Blossoms
        const shrub = new THREE.Mesh(shrubSphereGeo, shrubMat);
        const sScale = 0.65 + rng() * 0.65;
        shrub.scale.set(sScale * 1.2, sScale * 0.75, sScale * 1.1);
        shrub.position.y = 0.22 * sScale;
        shrub.castShadow = true;
        shrub.receiveShadow = true;
        nodeRoot.add(shrub);

        const frondCount = 5;
        for (let f = 0; f < frondCount; f++) {
          const fAngle = (f / frondCount) * Math.PI * 2 + rng() * 0.3;
          const frond = new THREE.Mesh(fernFrondGeo, fernMat);
          frond.scale.set(0.55, 0.85, 0.25);
          frond.position.set(
            Math.cos(fAngle) * 0.25,
            0.28,
            Math.sin(fAngle) * 0.25
          );
          frond.rotation.y = -fAngle;
          frond.rotation.z = 0.55;
          nodeRoot.add(frond);
        }

        // Colorful Bioluminescent Blossoms
        for (let b = 0; b < 3; b++) {
          const bAngle = (b / 3) * Math.PI * 2 + rng();
          const blossom = new THREE.Mesh(blossomGeo, blossomMat);
          blossom.position.set(
            Math.cos(bAngle) * 0.28 * sScale,
            0.42 * sScale,
            Math.sin(bAngle) * 0.28 * sScale
          );
          nodeRoot.add(blossom);
        }
      } else {
        continue;
      }

      const gh = getTerrainHeight(fx, fz);
      const waterSurfaceY = getSphericalCurvatureDrop(fx, fz) + 0.03;
      nodeRoot.position.set(
        fx,
        isWaterLily ? Math.max(gh, waterSurfaceY) : gh,
        fz
      );

      floraGroup.add(nodeRoot);
      floraNodes.push({
        root: nodeRoot,
        sx: fx,
        sz: fz,
        isWaterLily,
        swayPhase: rng() * Math.PI * 2,
      });

      // Spawn a fluttering 3D butterfly over every ~2.5 flora groves
      if (!isWaterLily && butterflies.length < 22 && rng() > 0.52) {
        const bRoot = new THREE.Group();
        const lw = new THREE.Mesh(butterflyWingGeo, butterflyMat);
        lw.position.x = -0.07;
        const rw = new THREE.Mesh(butterflyWingGeo, butterflyMat);
        rw.position.x = 0.07;
        bRoot.add(lw, rw);

        butterfliesGroup.add(bRoot);
        butterflies.push({
          root: bRoot,
          leftWing: lw,
          rightWing: rw,
          anchorX: fx,
          anchorY: gh + 0.85 + rng() * 0.8,
          anchorZ: fz,
          phase: rng() * Math.PI * 2,
          speed: 1.4 + rng() * 1.2,
        });
      }
    }
  }

  rebuildForSeedAndTheme(initialPreset, initialSeed);

  function update(elapsedTime: number, reducedMotion = false) {
    if (reducedMotion) return;

    // 1. Update Celestial Bird Flocks (figure-8 / orbital gliding + wing flapping)
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const t = elapsedTime * b.speed + b.phase;
      const nx = b.centerX + Math.cos(t) * b.radiusX;
      const nz = b.centerZ + Math.sin(t * 1.5) * b.radiusZ * 0.75;
      const ny =
        getTerrainHeight(nx, nz) + b.altitude + Math.sin(t * 2.2) * 0.65;

      const dx = -Math.sin(t) * b.radiusX * b.speed;
      const dz = Math.cos(t * 1.5) * 1.5 * b.radiusZ * 0.75 * b.speed;
      b.root.position.set(nx, ny, nz);
      b.root.rotation.y = Math.atan2(dx, dz);
      b.root.rotation.z = Math.sin(t) * 0.18;

      const flap = Math.sin(elapsedTime * b.flapSpeed + b.phase) * 0.55;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }

    // 2. Update Glade Grazers (gentle meadow roaming + grazing head nod + leg stride)
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const t = elapsedTime * g.speed + g.phase;
      const gx = g.homeX + Math.cos(t) * g.roamRadius;
      const gz = g.homeZ + Math.sin(t) * g.roamRadius;
      const gy = getTerrainHeight(gx, gz);

      const dx = -Math.sin(t) * g.roamRadius;
      const dz = Math.cos(t) * g.roamRadius;
      g.root.position.set(gx, gy, gz);
      g.root.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;

      const stride = Math.sin(elapsedTime * 3.8 + g.phase) * 0.28;
      g.legs[0].rotation.z = stride;
      g.legs[3].rotation.z = stride;
      g.legs[1].rotation.z = -stride;
      g.legs[2].rotation.z = -stride;

      g.headGroup.rotation.z = Math.sin(elapsedTime * 1.6 + g.phase) * 0.16;
    }

    // 3. Update Lagoon Aquatic Fauna
    for (let i = 0; i < aquatics.length; i++) {
      const a = aquatics[i];
      const t = elapsedTime * a.speed + a.phase;
      const ax = a.centerX + Math.cos(t) * a.radius;
      const az = a.centerZ + Math.sin(t) * a.radius;
      const gh = getTerrainHeight(ax, az);

      const dx = -Math.sin(t) * a.radius;
      const dz = Math.cos(t) * a.radius;
      const waterSurfaceY = getSphericalCurvatureDrop(ax, az);
      a.root.position.set(ax, Math.max(gh + 0.06, waterSurfaceY - 0.05), az);
      a.root.rotation.y = Math.atan2(dx, dz);
      a.tailMesh.rotation.y = Math.sin(elapsedTime * 6.5 + a.phase) * 0.42;
    }

    // 4. Update Butterflies & Flora wind sway
    for (let i = 0; i < butterflies.length; i++) {
      const bf = butterflies[i];
      const t = elapsedTime * bf.speed + bf.phase;
      bf.root.position.set(
        bf.anchorX + Math.cos(t * 1.3) * 0.85,
        bf.anchorY + Math.sin(t * 2.4) * 0.28,
        bf.anchorZ + Math.sin(t * 1.1) * 0.85
      );
      bf.root.rotation.y = t;
      const wingAngle = Math.sin(elapsedTime * 14 + bf.phase) * 0.75;
      bf.leftWing.rotation.y = wingAngle;
      bf.rightWing.rotation.y = -wingAngle;
    }

    for (let i = 0; i < floraNodes.length; i++) {
      const fn = floraNodes[i];
      if (fn.isWaterLily) {
        fn.root.rotation.y =
          Math.sin(elapsedTime * 0.6 + fn.swayPhase) * 0.15;
      } else {
        fn.root.rotation.z =
          Math.sin(elapsedTime * 1.4 + fn.swayPhase) * 0.045;
      }
    }
  }

  function dispose() {
    birdBodyGeo.dispose();
    birdWingGeo.dispose();
    stagBodyGeo.dispose();
    stagNeckGeo.dispose();
    stagHeadGeo.dispose();
    stagAntlerGeo.dispose();
    stagLegGeo.dispose();
    koiBodyGeo.dispose();
    koiTailGeo.dispose();
    fernFrondGeo.dispose();
    shrubSphereGeo.dispose();
    blossomGeo.dispose();
    lilyPadGeo.dispose();
    lotusFlowerGeo.dispose();
    butterflyWingGeo.dispose();

    birdFeatherMat.dispose();
    stagCoatMat.dispose();
    stagAntlerMat.dispose();
    koiMat.dispose();
    fernMat.dispose();
    shrubMat.dispose();
    blossomMat.dispose();
    lilyPadMat.dispose();
    lotusMat.dispose();
    butterflyMat.dispose();
  }

  return {
    group,
    rebuildForSeedAndTheme,
    update,
    dispose,
  };
}
