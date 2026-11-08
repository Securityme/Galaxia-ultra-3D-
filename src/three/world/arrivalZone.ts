/**
 * PAX HISTORIA 3D • 3D Plateau Arrival Zone ("Porte Céleste & Astroport d'Arrivée")
 * Monumental landing esplanade, orbital portal arch, 4 beacon obelisks, hovering Imperial Shuttle,
 * vertical arrival telemetry beam, and ceremonial causeway connecting to the plateau center.
 */

import * as THREE from 'three';
import {
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
} from '../../config/constants';
import { getTerrainHeight } from '../../core/terrainMath';
import {
  createBronzeFiligreeTexture,
  createBuildingFacadeTexture,
  createCliffStrataTexture,
  createForumMosaicPlazaTexture,
} from '../textures/proceduralTextures';

export interface ArrivalZone3D {
  group: THREE.Group;
  syncPositionAndSelection: (isSelected: boolean, accentHex: string) => void;
  triggerLandingAnimation: () => void;
  update: (time: number, dt: number) => void;
  getInteractiveObject: () => THREE.Object3D;
  getWorldPosition: () => THREE.Vector3;
  dispose: () => void;
}

export function createArrivalZone3D(): ArrivalZone3D {
  const group = new THREE.Group();
  group.name = 'Collection_02_PlateauArrivalGate';

  const rootPlaza = new THREE.Group();
  rootPlaza.userData = { entityType: 'arrival_zone', entityId: 'arrival_gate' };
  group.add(rootPlaza);

  const stoneTex = createCliffStrataTexture();
  const marbleTex = createBuildingFacadeTexture();
  const mosaicTex = createForumMosaicPlazaTexture();
  const bronzeTex = createBronzeFiligreeTexture();

  // Materials with dedicated PBR textures
  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xe8dfd1,
    map: stoneTex,
    bumpMap: stoneTex,
    bumpScale: 0.06,
    roughness: 0.62,
    metalness: 0.08,
  });

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xfaf5eb,
    map: marbleTex,
    bumpMap: marbleTex,
    bumpScale: 0.05,
    roughness: 0.38,
    metalness: 0.12,
  });

  const darkSlateMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d66,
    map: mosaicTex,
    bumpMap: mosaicTex,
    bumpScale: 0.04,
    roughness: 0.45,
    metalness: 0.35,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd4ad60,
    map: bronzeTex,
    bumpMap: bronzeTex,
    bumpScale: 0.04,
    roughness: 0.26,
    metalness: 0.82,
  });

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.2,
  });

  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });

  // 1. Stepped Circular Esplanade Foundation
  const baseFoundation = new THREE.Mesh(
    new THREE.CylinderGeometry(3.85, 4.35, 1.1, 32),
    limestoneMat
  );
  baseFoundation.position.y = -0.35;
  baseFoundation.castShadow = true;
  baseFoundation.receiveShadow = true;
  rootPlaza.add(baseFoundation);

  const upperDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.45, 3.7, 0.28, 32),
    marbleMat
  );
  upperDeck.position.y = 0.28;
  upperDeck.castShadow = true;
  upperDeck.receiveShadow = true;
  rootPlaza.add(upperDeck);

  const landingPadCore = new THREE.Mesh(
    new THREE.CylinderGeometry(2.45, 2.55, 0.12, 32),
    darkSlateMat
  );
  landingPadCore.position.y = 0.45;
  landingPadCore.receiveShadow = true;
  rootPlaza.add(landingPadCore);

  // Inlaid Brass Compass Rose & Concentric Docking Rings
  const outerBrassRing = new THREE.Mesh(
    new THREE.RingGeometry(2.38, 2.56, 48),
    bronzeMat
  );
  outerBrassRing.rotation.x = -Math.PI / 2;
  outerBrassRing.position.y = 0.52;
  rootPlaza.add(outerBrassRing);

  const innerTelemetryRing = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 1.52, 36),
    beaconMat
  );
  innerTelemetryRing.rotation.x = -Math.PI / 2;
  innerTelemetryRing.position.y = 0.53;
  rootPlaza.add(innerTelemetryRing);

  // 4 Cardinal Compass Bars
  for (let c = 0; c < 4; c++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 4.6), bronzeMat);
    bar.position.y = 0.52;
    bar.rotation.y = (c * Math.PI) / 4;
    rootPlaza.add(bar);
  }

  // 2. Four Perimeter Beacon Obelisks
  const pylonAngles = [
    Math.PI * 0.22,
    Math.PI * 0.78,
    -Math.PI * 0.22,
    -Math.PI * 0.78,
  ];
  const rotatingRings: THREE.Object3D[] = [];

  pylonAngles.forEach((angle) => {
    const px = Math.cos(angle) * 3.15;
    const pz = Math.sin(angle) * 3.15;

    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(px, 0.4, pz);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.45, 0.52),
      limestoneMat
    );
    pedestal.position.y = 0.22;
    pedestal.castShadow = true;
    pylonGroup.add(pedestal);

    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 1.85, 8),
      marbleMat
    );
    column.position.y = 1.35;
    column.castShadow = true;
    pylonGroup.add(column);

    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.035, 8, 20),
      bronzeMat
    );
    crownRing.position.y = 2.45;
    pylonGroup.add(crownRing);
    rotatingRings.push(crownRing);

    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), beaconMat);
    orb.position.y = 2.45;
    pylonGroup.add(orb);

    rootPlaza.add(pylonGroup);
  });

  // 3. Monumental Imperial Portal Arch on the Southern Rim
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0.4, 2.85);

  const leftPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 2.8, 12),
    marbleMat
  );
  leftPillar.position.set(-1.35, 1.4, 0);
  leftPillar.castShadow = true;
  archGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 2.8, 12),
    marbleMat
  );
  rightPillar.position.set(1.35, 1.4, 0);
  rightPillar.castShadow = true;
  archGroup.add(rightPillar);

  const archCrown = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.2, 10, 28, Math.PI),
    bronzeMat
  );
  archCrown.position.set(0, 2.75, 0);
  archCrown.castShadow = true;
  archGroup.add(archCrown);

  const crestSun = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), beaconMat);
  crestSun.position.set(0, 4.12, 0);
  archGroup.add(crestSun);

  rootPlaza.add(archGroup);

  // 4. Hovering Imperial Orbital Shuttle (Navette d'Arrivée)
  const shuttleGroup = new THREE.Group();
  shuttleGroup.position.set(0, 1.35, 0);

  const fuselage = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 2.2, 8),
    marbleMat
  );
  fuselage.rotation.x = -Math.PI / 2;
  fuselage.scale.set(1.15, 1.0, 0.58);
  fuselage.castShadow = true;
  shuttleGroup.add(fuselage);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.8,
    })
  );
  canopy.position.set(0, 0.18, -0.25);
  canopy.scale.set(0.9, 0.55, 1.4);
  shuttleGroup.add(canopy);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.75), bronzeMat);
  leftWing.position.set(0, 0, 0.25);
  leftWing.castShadow = true;
  shuttleGroup.add(leftWing);

  const thrusterGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.75, 0.5, 16, 1, true),
    thrusterMat
  );
  thrusterGlow.position.set(0, -0.32, 0.1);
  shuttleGroup.add(thrusterGlow);

  rootPlaza.add(shuttleGroup);

  // 5. Vertical Orbital Arrival Light Column (pulses during arrival / selection)
  const beamGeo = new THREE.CylinderGeometry(0.85, 2.15, 16, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const arrivalBeam = new THREE.Mesh(beamGeo, beamMat);
  arrivalBeam.position.y = 8.4;
  rootPlaza.add(arrivalBeam);

  // Selection Ring around the Arrival Zone
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(4.1, 4.45, 48),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.2;
  selectionRing.visible = false;
  rootPlaza.add(selectionRing);

  // 6. Ceremonial Stone Causeway Stones leading toward Plateau Center
  const causewayGroup = new THREE.Group();
  const steppingCount = 7;
  for (let s = 1; s <= steppingCount; s++) {
    const t = s / (steppingCount + 1);
    const cz = THREE.MathUtils.lerp(wld_ARRIVAL_ZONE_Z - 4.1, 2.6, t);
    const cx = Math.sin(t * Math.PI) * 0.35;

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.18, 8),
      limestoneMat
    );
    slab.scale.set(1.3, 1, 0.75);
    slab.receiveShadow = true;
    slab.userData = { cx, cz };
    causewayGroup.add(slab);
  }
  group.add(causewayGroup);

  // Tag all child meshes of rootPlaza for raycasting
  rootPlaza.traverse((obj) => {
    obj.userData = { entityType: 'arrival_zone', entityId: 'arrival_gate' };
  });

  // Animation state for orbital landing descent
  let landingProgress = 1.0; // 0 -> descending from orbit, 1 -> hovering over pad
  let beamPulseTimer = 0;

  function syncPositionAndSelection(isSelected: boolean, accentHex: string) {
    const groundY = getTerrainHeight(wld_ARRIVAL_ZONE_X, wld_ARRIVAL_ZONE_Z);
    rootPlaza.position.set(wld_ARRIVAL_ZONE_X, groundY, wld_ARRIVAL_ZONE_Z);
    selectionRing.visible = isSelected;

    beaconMat.color.set(accentHex).lerp(new THREE.Color(0xfbbf24), 0.5);
    beaconMat.emissive.set(accentHex).lerp(new THREE.Color(0xf59e0b), 0.5);

    causewayGroup.children.forEach((slab) => {
      const { cx, cz } = slab.userData as { cx: number; cz: number };
      const sy = getTerrainHeight(cx, cz);
      slab.position.set(cx, sy + 0.04, cz);
    });
  }

  function triggerLandingAnimation() {
    landingProgress = 0.0;
    beamPulseTimer = 4.5;
  }

  function update(time: number, dt: number) {
    if (landingProgress < 1.0) {
      landingProgress = Math.min(1.0, landingProgress + dt * 0.65);
    }

    if (beamPulseTimer > 0) {
      beamPulseTimer = Math.max(0, beamPulseTimer - dt);
    }

    // Smooth cubic ease-out for shuttle descent from high altitude (y=18 -> y=1.35)
    const ease = 1 - Math.pow(1 - landingProgress, 3);
    const hoverBob = Math.sin(time * 2.2) * 0.12;
    const shuttleY = THREE.MathUtils.lerp(18.5, 1.38, ease) + hoverBob;
    shuttleGroup.position.y = shuttleY;
    shuttleGroup.rotation.y = Math.sin(time * 0.6) * 0.08 + (1 - ease) * 1.4;

    // Beam opacity intensifies during landing or when selected
    const targetBeamOpacity =
      beamPulseTimer > 0
        ? 0.34
        : selectionRing.visible
        ? 0.24
        : 0.09 + Math.sin(time * 1.8) * 0.03;
    beamMat.opacity = THREE.MathUtils.lerp(beamMat.opacity, targetBeamOpacity, dt * 4);
    arrivalBeam.rotation.y = time * 0.35;

    rotatingRings.forEach((ring, idx) => {
      ring.rotation.y = time * (1.1 + idx * 0.2);
      ring.rotation.x = Math.sin(time * 0.9 + idx) * 0.35;
    });

    if (selectionRing.visible) {
      selectionRing.rotation.z = -time * 0.8;
    }
  }

  function getInteractiveObject(): THREE.Object3D {
    return rootPlaza;
  }

  function getWorldPosition(): THREE.Vector3 {
    return rootPlaza.position.clone();
  }

  function dispose() {
    limestoneMat.dispose();
    marbleMat.dispose();
    darkSlateMat.dispose();
    bronzeMat.dispose();
    beaconMat.dispose();
    thrusterMat.dispose();
    beamGeo.dispose();
    beamMat.dispose();
    selectionRing.geometry.dispose();
    (selectionRing.material as THREE.Material).dispose();
  }

  // Initialize default position
  syncPositionAndSelection(false, '#fbbf24');

  return {
    group,
    syncPositionAndSelection,
    triggerLandingAnimation,
    update,
    getInteractiveObject,
    getWorldPosition,
    dispose,
  };
}
