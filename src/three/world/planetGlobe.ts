/**
 * PAX HISTORIA 3D • 3D Planetary Globe View, Trade Routes & Cinematic Orbital Flagship
 * Renders:
 * - Full 3D planet with continents, bathymetric oceans, physical relief displacement, clouds & atmosphere
 * - 6 Direct 3D Miniature Plateau Terraces + Cartographic Banner Labels directly on the globe
 * - 3D Inter-Zone Orbital Trade Arcs & gliding Cargo Shuttles connecting the 6 Plateau Zones
 * - Cinematic 3D Imperial Flagship approaching the planet during the Boot / Main Menu sequence!
 */

import * as THREE from 'three';
import {
  wld_PLANET_RADIUS,
  wld_PLANET_SUBDIVISIONS,
  wld_PLANET_ATMO_RADIUS,
} from '../../config/constants';
import { PLANETARY_ZONES } from '../../config/planetaryZones';
import { WorldPreset } from '../../contracts/schemas';
import {
  getPlanetSphereElevation,
  latLonToUnitVector,
} from '../../core/terrainMath';
import {
  createPlanetWorldMapTexture,
  createPlanetCloudTexture,
  createTerrainBumpTexture,
  createZoneBannerSpriteTexture,
} from '../textures/proceduralTextures';

export interface PlanetGlobe {
  group: THREE.Group;
  planetMesh: THREE.Mesh;
  oceanMesh: THREE.Mesh;
  cloudMesh: THREE.Mesh;
  atmoMesh: THREE.Mesh;
  cartoRingGroup: THREE.Group;
  zoneMarkersGroup: THREE.Group;
  flagshipGroup: THREE.Group;
  rebuildPlanet: (preset: WorldPreset, seed: string | number) => void;
  setActiveZone: (activeZoneId: string) => void;
  getInteractiveZoneMarkers: () => THREE.Object3D[];
  getZoneMarkerWorldPosition: (zoneId: string) => THREE.Vector3 | null;
  update: (time: number, delta: number, isBootOrMenuActive?: boolean) => void;
  dispose: () => void;
}

interface ZoneMarkerNode {
  zoneId: string;
  latDeg: number;
  lonDeg: number;
  root: THREE.Group;
  ringMesh: THREE.Mesh;
  crystalMesh: THREE.Mesh;
  bannerSprite: THREE.Sprite;
  beaconMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  baseColor: THREE.Color;
}

interface TradeRouteArcNode {
  curve: THREE.QuadraticBezierCurve3;
  line: THREE.Line;
  cargoMesh: THREE.Mesh;
  speed: number;
  phase: number;
}

export function createPlanetGlobe(
  initialPreset: WorldPreset,
  initialSeed: string | number
): PlanetGlobe {
  const group = new THREE.Group();

  const rotatingCore = new THREE.Group();
  group.add(rotatingCore);

  // 1. Continental & Biome Displaced Sphere
  const planetGeo = new THREE.SphereGeometry(
    wld_PLANET_RADIUS,
    wld_PLANET_SUBDIVISIONS,
    Math.floor(wld_PLANET_SUBDIVISIONS * 0.75)
  );

  const posAttr = planetGeo.attributes.position;
  const baseDirs = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    baseDirs[i * 3] = vx / len;
    baseDirs[i * 3 + 1] = vy / len;
    baseDirs[i * 3 + 2] = vz / len;
  }

  const worldMapTex = createPlanetWorldMapTexture(initialPreset, initialSeed);
  const bumpTex = createTerrainBumpTexture();

  const planetMat = new THREE.MeshStandardMaterial({
    map: worldMapTex,
    bumpMap: bumpTex,
    bumpScale: 0.22,
    roughness: 0.62,
    metalness: 0.08,
  });

  const planetMesh = new THREE.Mesh(planetGeo, planetMat);
  planetMesh.castShadow = true;
  planetMesh.receiveShadow = true;
  rotatingCore.add(planetMesh);

  // 2. Smooth Specular Ocean Sphere at Sea Level
  const oceanGeo = new THREE.SphereGeometry(wld_PLANET_RADIUS * 0.998, 64, 48);
  const oceanMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialPreset.oceanDeepColor),
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.88,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  rotatingCore.add(oceanMesh);

  // 3. Direct 3D Plateau Zones on the Globe
  const zoneMarkersGroup = new THREE.Group();
  zoneMarkersGroup.name = 'PlanetZoneMarkersGroup';
  rotatingCore.add(zoneMarkersGroup);

  const markerNodes = new Map<string, ZoneMarkerNode>();
  const plateauPlinthGeo = new THREE.CylinderGeometry(1.55, 1.85, 0.36, 8);
  const plateauTopGeo = new THREE.CylinderGeometry(1.42, 1.52, 0.14, 8);
  const stemGeo = new THREE.CylinderGeometry(0.06, 0.12, 1.45, 8);
  const crystalGeo = new THREE.OctahedronGeometry(0.46, 0);
  const ringGeo = new THREE.RingGeometry(1.75, 2.15, 32);
  const hitSphereGeo = new THREE.SphereGeometry(2.35, 12, 12);
  const hitSphereMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const brassStemMat = new THREE.MeshStandardMaterial({
    color: 0xd4b483,
    roughness: 0.3,
    metalness: 0.8,
  });

  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.45,
    flatShading: true,
  });

  PLANETARY_ZONES.forEach((zone) => {
    const root = new THREE.Group();
    root.userData = { entityType: 'planet_zone', entityId: zone.id };

    const baseColor = new THREE.Color(zone.beaconColor);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.25,
    });

    const plateauSurfaceMat = new THREE.MeshStandardMaterial({
      color: baseColor.clone().lerp(new THREE.Color(0x349e6b), 0.45),
      roughness: 0.55,
      metalness: 0.15,
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });

    const plinthMesh = new THREE.Mesh(plateauPlinthGeo, stonePlinthMat);
    plinthMesh.position.y = 0.15;
    root.add(plinthMesh);

    const topMesh = new THREE.Mesh(plateauTopGeo, plateauSurfaceMat);
    topMesh.position.y = 0.38;
    root.add(topMesh);

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.25;
    root.add(ringMesh);

    const stem = new THREE.Mesh(stemGeo, brassStemMat);
    stem.position.y = 1.05;
    root.add(stem);

    const crystalMesh = new THREE.Mesh(crystalGeo, beaconMat);
    crystalMesh.position.y = 2.05;
    root.add(crystalMesh);

    const bannerTex = createZoneBannerSpriteTexture(
      zone.name,
      zone.regionCode,
      zone.beaconColor
    );
    const bannerMat = new THREE.SpriteMaterial({
      map: bannerTex,
      transparent: true,
      depthTest: false,
    });
    const bannerSprite = new THREE.Sprite(bannerMat);
    bannerSprite.position.set(0, 3.45, 0);
    bannerSprite.scale.set(6.2, 1.55, 1);
    root.add(bannerSprite);

    const hitSphere = new THREE.Mesh(hitSphereGeo, hitSphereMat);
    hitSphere.position.y = 1.4;
    root.add(hitSphere);

    root.traverse((obj) => {
      obj.userData = { entityType: 'planet_zone', entityId: zone.id };
    });

    zoneMarkersGroup.add(root);
    markerNodes.set(zone.id, {
      zoneId: zone.id,
      latDeg: zone.latDeg,
      lonDeg: zone.lonDeg,
      root,
      ringMesh,
      crystalMesh,
      bannerSprite,
      beaconMat,
      ringMat,
      baseColor,
    });
  });

  // 3b. 3D Inter-Zone Trade Route Arcs & Cargo Shuttles on the Globe
  const tradeRoutesGroup = new THREE.Group();
  rotatingCore.add(tradeRoutesGroup);
  const tradeArcs: TradeRouteArcNode[] = [];
  const cargoShuttleGeo = new THREE.ConeGeometry(0.28, 0.9, 6);
  cargoShuttleGeo.rotateX(Math.PI / 2);
  const cargoShuttleMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const tradeArcLineMat = new THREE.LineBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.48,
  });

  function rebuildTradeArcs(): void {
    while (tradeRoutesGroup.children.length > 0) {
      tradeRoutesGroup.remove(tradeRoutesGroup.children[0]);
    }
    tradeArcs.length = 0;

    const zoneArray = Array.from(markerNodes.values());
    const pairs = [
      [0, 1],
      [0, 2],
      [0, 4],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ];

    pairs.forEach(([iA, iB], idx) => {
      const nA = zoneArray[iA];
      const nB = zoneArray[iB];
      if (!nA || !nB) return;

      const pA = nA.root.position.clone().multiplyScalar(1.02);
      const pB = nB.root.position.clone().multiplyScalar(1.02);
      const mid = pA
        .clone()
        .add(pB)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(wld_PLANET_RADIUS * 1.32);

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
      const points = curve.getPoints(36);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, tradeArcLineMat);
      tradeRoutesGroup.add(line);

      const cargoMesh = new THREE.Mesh(cargoShuttleGeo, cargoShuttleMat);
      tradeRoutesGroup.add(cargoMesh);

      tradeArcs.push({
        curve,
        line,
        cargoMesh,
        speed: 0.14 + (idx % 3) * 0.04,
        phase: idx * 0.27,
      });
    });
  }

  // 4. Translucent Planetary Cloud Sphere
  const cloudGeo = new THREE.SphereGeometry(wld_PLANET_RADIUS * 1.032, 64, 48);
  const cloudTex = createPlanetCloudTexture(initialSeed);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    roughness: 0.9,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  group.add(cloudMesh);

  // 5. Atmospheric Scattering Halo
  const atmoGeo = new THREE.SphereGeometry(wld_PLANET_ATMO_RADIUS, 48, 36);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initialPreset.atmosphereColor),
    transparent: true,
    opacity: 0.16,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  group.add(atmoMesh);

  // 6. Pax Historia Cartographic Armillary / Meridian Rings
  const cartoRingGroup = new THREE.Group();
  const armillaryMat = new THREE.MeshStandardMaterial({
    color: 0xd4b483,
    metalness: 0.85,
    roughness: 0.25,
    transparent: true,
    opacity: 0.55,
  });

  const equatorialRingGeo = new THREE.TorusGeometry(wld_PLANET_RADIUS * 1.16, 0.06, 8, 96);
  equatorialRingGeo.rotateX(Math.PI / 2);
  const equatorialRing = new THREE.Mesh(equatorialRingGeo, armillaryMat);
  cartoRingGroup.add(equatorialRing);

  const meridianRingGeo = new THREE.TorusGeometry(wld_PLANET_RADIUS * 1.18, 0.045, 8, 96);
  const meridianRing = new THREE.Mesh(meridianRingGeo, armillaryMat);
  meridianRing.rotation.z = 0.28;
  cartoRingGroup.add(meridianRing);

  group.add(cartoRingGroup);

  // 7. CINEMATIC 3D IMPERIAL FLAGSHIP (Approaches and orbits the planet during Boot & Globe View!)
  const flagshipGroup = new THREE.Group();
  flagshipGroup.name = 'ImperialOrbitalFlagship';

  const hullWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.65,
  });
  const hullGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.85,
  });
  const plasmaGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // Main Fuselage
  const shipBodyGeo = new THREE.ConeGeometry(0.95, 4.8, 8);
  shipBodyGeo.rotateX(Math.PI / 2);
  const shipBody = new THREE.Mesh(shipBodyGeo, hullWhiteMat);
  flagshipGroup.add(shipBody);

  // Imperial Solar Sails / Wings
  const wingGeo = new THREE.BoxGeometry(4.2, 0.12, 1.4);
  const wingMesh = new THREE.Mesh(wingGeo, hullGoldMat);
  wingMesh.position.set(0, 0, -0.6);
  flagshipGroup.add(wingMesh);

  // Dorsal Command Ring
  const dorsalRingGeo = new THREE.TorusGeometry(1.15, 0.09, 8, 24);
  const dorsalRing = new THREE.Mesh(dorsalRingGeo, hullGoldMat);
  dorsalRing.position.set(0, 0, -0.8);
  flagshipGroup.add(dorsalRing);

  // Plasma Thruster Plume
  const thrusterGeo = new THREE.ConeGeometry(0.55, 2.2, 8);
  thrusterGeo.rotateX(-Math.PI / 2);
  const thrusterPlume = new THREE.Mesh(thrusterGeo, plasmaGlowMat);
  thrusterPlume.position.set(0, 0, -3.3);
  flagshipGroup.add(thrusterPlume);

  group.add(flagshipGroup);

  function updateZoneMarkerPositions(): void {
    const up = new THREE.Vector3(0, 1, 0);
    for (const node of markerNodes.values()) {
      const { nx, ny, nz } = latLonToUnitVector(node.latDeg, node.lonDeg);
      const elev = getPlanetSphereElevation(nx, ny, nz);
      const disp = elev > 0 ? elev * 1.35 : 0.08;
      const r = wld_PLANET_RADIUS + disp;

      const normalVec = new THREE.Vector3(nx, ny, nz).normalize();
      node.root.position.copy(normalVec).multiplyScalar(r);
      node.root.quaternion.setFromUnitVectors(up, normalVec);
    }
    rebuildTradeArcs();
  }

  function displaceContinents(): void {
    for (let i = 0; i < posAttr.count; i++) {
      const nx = baseDirs[i * 3];
      const ny = baseDirs[i * 3 + 1];
      const nz = baseDirs[i * 3 + 2];

      const elev = getPlanetSphereElevation(nx, ny, nz);
      const disp = elev > 0 ? elev * 1.35 : elev * 0.25;
      const r = wld_PLANET_RADIUS + disp;

      posAttr.setXYZ(i, nx * r, ny * r, nz * r);
    }
    posAttr.needsUpdate = true;
    planetGeo.computeVertexNormals();
    updateZoneMarkerPositions();
  }

  displaceContinents();

  let currentActiveZoneId = PLANETARY_ZONES[0].id;
  let lastPresetId = initialPreset.id;
  let lastSeed = String(initialSeed);

  function setActiveZone(activeZoneId: string): void {
    currentActiveZoneId = activeZoneId;
    for (const node of markerNodes.values()) {
      const isSelected = node.zoneId === activeZoneId;
      node.root.scale.setScalar(isSelected ? 1.24 : 0.96);
      node.beaconMat.emissiveIntensity = isSelected ? 1.7 : 0.85;
      node.ringMat.opacity = isSelected ? 1.0 : 0.6;
      node.bannerSprite.material.opacity = isSelected ? 1.0 : 0.82;
    }
  }

  setActiveZone(currentActiveZoneId);

  function rebuildPlanet(preset: WorldPreset, seed: string | number): void {
    const seedStr = String(seed);
    if (preset.id === lastPresetId && seedStr === lastSeed) return;
    lastPresetId = preset.id;
    lastSeed = seedStr;

    displaceContinents();

    planetMat.map = createPlanetWorldMapTexture(preset, seed);
    planetMat.needsUpdate = true;

    oceanMat.color.set(preset.oceanDeepColor);
    atmoMat.color.set(preset.atmosphereColor);
    cloudMat.map = createPlanetCloudTexture(seed);
    cloudMat.needsUpdate = true;
  }

  function getInteractiveZoneMarkers(): THREE.Object3D[] {
    return Array.from(markerNodes.values()).map((n) => n.root);
  }

  function getZoneMarkerWorldPosition(zoneId: string): THREE.Vector3 | null {
    const node = markerNodes.get(zoneId);
    if (!node) return null;
    const worldPos = new THREE.Vector3();
    node.root.getWorldPosition(worldPos);
    return worldPos;
  }

  function update(time: number, delta: number, isBootOrMenuActive = false): void {
    if (!group.visible) return;
    rotatingCore.rotation.y += delta * (isBootOrMenuActive ? 0.045 : 0.022);
    cloudMesh.rotation.y += delta * 0.055;
    cartoRingGroup.rotation.y -= delta * 0.018;

    // Animate Zone Markers
    for (const node of markerNodes.values()) {
      const isSelected = node.zoneId === currentActiveZoneId;
      node.crystalMesh.rotation.y = time * (isSelected ? 2.2 : 1.1);
      node.crystalMesh.position.y = 2.05 + Math.sin(time * 2.5 + node.latDeg) * 0.14;
      if (isSelected) {
        const pulse = 1.0 + Math.sin(time * 4.0) * 0.14;
        node.ringMesh.scale.setScalar(pulse);
      } else {
        node.ringMesh.scale.setScalar(1.0);
      }
    }

    // Animate Trade Route Cargo Shuttles gliding between the 6 Plateau Zones
    for (const arc of tradeArcs) {
      const t = (time * arc.speed + arc.phase) % 1.0;
      const pos = arc.curve.getPointAt(t);
      const tangent = arc.curve.getTangentAt(t);
      arc.cargoMesh.position.copy(pos);
      arc.cargoMesh.lookAt(pos.clone().add(tangent));
    }

    // Animate the 3D Imperial Flagship approaching and orbiting the planet!
    const orbitAngle = time * 0.32;
    const approachRadius = isBootOrMenuActive
      ? wld_PLANET_RADIUS * 1.38 + Math.sin(time * 0.6) * 1.4
      : wld_PLANET_RADIUS * 1.45;
    const fx = Math.cos(orbitAngle) * approachRadius;
    const fz = Math.sin(orbitAngle) * approachRadius;
    const fy = Math.sin(orbitAngle * 1.5) * 6.5 + 3.5;

    const nextAngle = orbitAngle + 0.05;
    const nfx = Math.cos(nextAngle) * approachRadius;
    const nfz = Math.sin(nextAngle) * approachRadius;
    const nfy = Math.sin(nextAngle * 1.5) * 6.5 + 3.5;

    flagshipGroup.position.set(fx, fy, fz);
    flagshipGroup.lookAt(nfx, nfy, nfz);
    dorsalRing.rotation.z = time * 1.8;
    thrusterPlume.scale.z = 0.85 + Math.sin(time * 18) * 0.22;
  }

  function dispose(): void {
    planetGeo.dispose();
    planetMat.dispose();
    oceanGeo.dispose();
    oceanMat.dispose();
    cloudGeo.dispose();
    cloudMat.dispose();
    atmoGeo.dispose();
    atmoMat.dispose();
    equatorialRingGeo.dispose();
    meridianRingGeo.dispose();
    armillaryMat.dispose();
    plateauPlinthGeo.dispose();
    plateauTopGeo.dispose();
    stemGeo.dispose();
    crystalGeo.dispose();
    ringGeo.dispose();
    hitSphereGeo.dispose();
    hitSphereMat.dispose();
    brassStemMat.dispose();
    stonePlinthMat.dispose();
    cargoShuttleGeo.dispose();
    cargoShuttleMat.dispose();
    tradeArcLineMat.dispose();
    shipBodyGeo.dispose();
    wingGeo.dispose();
    dorsalRingGeo.dispose();
    thrusterGeo.dispose();
    hullWhiteMat.dispose();
    hullGoldMat.dispose();
    plasmaGlowMat.dispose();
    for (const node of markerNodes.values()) {
      node.beaconMat.dispose();
      node.ringMat.dispose();
      node.bannerSprite.material.dispose();
    }
  }

  return {
    group,
    planetMesh,
    oceanMesh,
    cloudMesh,
    atmoMesh,
    cartoRingGroup,
    zoneMarkersGroup,
    flagshipGroup,
    rebuildPlanet,
    setActiveZone,
    getInteractiveZoneMarkers,
    getZoneMarkerWorldPosition,
    update,
    dispose,
  };
}
