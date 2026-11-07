import * as THREE from 'three';
import {
  WeatherType,
  wtr_CALM,
  wtr_STARDUST_DRIFT,
  wtr_ELECTRICAL_STORM,
  wtr_AURORA_CURTAIN,
  wtr_SOLAR_FLARE,
  bld_TYPE_RELAY_TOWER,
} from '../../config/constants';
import { PlacedBuilding } from '../../contracts/schemas';
import { getTerrainHeight } from '../../core/terrainMath';
import { createSoftCircularParticleTexture } from '../textures/proceduralTextures';

export interface WeatherSystemManager {
  group: THREE.Group;
  setWeather: (weather: WeatherType, durationSec?: number) => void;
  getActiveWeather: () => WeatherType;
  update: (time: number, dt: number, buildings: PlacedBuilding[], accentHex: string) => void;
  dispose: () => void;
}

interface ArcBolt {
  line: THREE.Line;
  positions: Float32Array;
  nextStrikeTime: number;
  visibleUntil: number;
}

/**
 * Dynamic weather system for the plateau:
 * - calm: clear atmosphere
 * - stardust_drift / solar_flare: drifting golden-amber atmospheric mist using circular radial sprites
 * - electrical_storm: localized lightning arcs between energy spires & ground + point flash
 * - aurora_curtain: translucent atmospheric aurora ribbons high above the plateau
 */
export function createWeatherSystem(): WeatherSystemManager {
  const group = new THREE.Group();
  group.name = 'WeatherSystem';

  let activeWeather: WeatherType = wtr_CALM;
  let weatherTimer = 0;

  // 1. Drifting Golden Mist / Stardust (soft circular texture, never square)
  const dustCount = 120;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSpeeds = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 68;
    dustPositions[i * 3 + 1] = 1.5 + Math.random() * 14;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 68;
    dustSpeeds[i] = 0.6 + Math.random() * 0.9;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

  const dustMat = new THREE.PointsMaterial({
    color: 0xf6d38c,
    size: 0.7,
    map: createSoftCircularParticleTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const dustPoints = new THREE.Points(dustGeo, dustMat);
  group.add(dustPoints);

  // 2. Electrical Storm Arcs near Energy Spires
  const stormGroup = new THREE.Group();
  group.add(stormGroup);

  const bolts: ArcBolt[] = [];
  const boltSegments = 10;
  const boltMat = new THREE.LineBasicMaterial({
    color: 0xcceeff,
    transparent: true,
    opacity: 0.85,
  });

  for (let i = 0; i < 4; i++) {
    const positions = new Float32Array((boltSegments + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geo, boltMat);
    line.visible = false;
    stormGroup.add(line);
    bolts.push({
      line,
      positions,
      nextStrikeTime: Math.random() * 1.5,
      visibleUntil: 0,
    });
  }

  const flashLight = new THREE.PointLight(0xaad8ff, 0, 28, 1.8);
  flashLight.position.set(0, 8, 0);
  stormGroup.add(flashLight);

  // 3. Ion Aurora Ribbons
  const auroraGroup = new THREE.Group();
  group.add(auroraGroup);

  const auroraMat = new THREE.MeshBasicMaterial({
    color: 0x6ee7b7,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const auroraRibbons: THREE.Mesh[] = [];
  for (let r = 0; r < 2; r++) {
    const ribbonGeo = new THREE.PlaneGeometry(52, 6.5, 48, 4);
    const mesh = new THREE.Mesh(ribbonGeo, auroraMat);
    mesh.position.set(0, 15.5 + r * 2.4, -8 + r * 14);
    mesh.rotation.x = 0.25;
    auroraGroup.add(mesh);
    auroraRibbons.push(mesh);
  }

  function setWeather(weather: WeatherType, durationSec = 45) {
    activeWeather = weather;
    weatherTimer = durationSec;
  }

  function getActiveWeather(): WeatherType {
    return activeWeather;
  }

  function rebuildBoltGeometry(bolt: ArcBolt, start: THREE.Vector3, end: THREE.Vector3) {
    const arr = bolt.positions;
    for (let s = 0; s <= boltSegments; s++) {
      const t = s / boltSegments;
      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const y = THREE.MathUtils.lerp(start.y, end.y, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);

      const jitter = s === 0 || s === boltSegments ? 0 : Math.sin(t * Math.PI) * 0.85;
      arr[s * 3] = x + (Math.random() - 0.5) * jitter;
      arr[s * 3 + 1] = y + (Math.random() - 0.5) * jitter;
      arr[s * 3 + 2] = z + (Math.random() - 0.5) * jitter;
    }
    const attr = bolt.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  function update(time: number, dt: number, buildings: PlacedBuilding[], accentHex: string) {
    if (activeWeather !== wtr_CALM) {
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        activeWeather = wtr_CALM;
      }
    }

    const isStardust =
      activeWeather === wtr_STARDUST_DRIFT || activeWeather === wtr_SOLAR_FLARE;
    const isStorm = activeWeather === wtr_ELECTRICAL_STORM;
    const isAurora = activeWeather === wtr_AURORA_CURTAIN;

    const targetDustOpacity = isStardust ? 0.55 : isStorm ? 0.22 : 0;
    dustMat.opacity = THREE.MathUtils.lerp(dustMat.opacity, targetDustOpacity, dt * 3);

    if (dustMat.opacity > 0.01) {
      const posAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        const idx = i * 3;
        arr[idx] += dt * 4.2 * dustSpeeds[i];
        arr[idx + 1] += Math.sin(time * 1.5 + i) * dt * 0.35;
        arr[idx + 2] += dt * 1.6 * dustSpeeds[i];

        if (arr[idx] > 34) arr[idx] = -34;
        if (arr[idx + 2] > 34) arr[idx + 2] = -34;
      }
      posAttr.needsUpdate = true;
    }

    if (isStorm) {
      const relays = buildings.filter((b) => b.buildingType === bld_TYPE_RELAY_TOWER);
      const anchorList = relays.length > 0 ? relays : buildings;

      bolts.forEach((bolt) => {
        if (time >= bolt.nextStrikeTime && anchorList.length > 0) {
          const targetBld = anchorList[Math.floor(Math.random() * anchorList.length)];
          const baseH = getTerrainHeight(targetBld.x, targetBld.z);
          const start = new THREE.Vector3(
            targetBld.x + (Math.random() - 0.5) * 0.5,
            baseH + 3.4 * targetBld.scale,
            targetBld.z + (Math.random() - 0.5) * 0.5
          );
          const angle = Math.random() * Math.PI * 2;
          const dist = 2.0 + Math.random() * 4.5;
          const endX = targetBld.x + Math.cos(angle) * dist;
          const endZ = targetBld.z + Math.sin(angle) * dist;
          const end = new THREE.Vector3(endX, getTerrainHeight(endX, endZ) + 0.3, endZ);

          rebuildBoltGeometry(bolt, start, end);
          bolt.line.visible = true;
          bolt.visibleUntil = time + 0.08 + Math.random() * 0.1;
          bolt.nextStrikeTime = time + 0.35 + Math.random() * 1.1;

          flashLight.position.copy(start);
          flashLight.intensity = 4.5;
        } else if (time > bolt.visibleUntil) {
          bolt.line.visible = false;
        }
      });

      flashLight.intensity = THREE.MathUtils.lerp(flashLight.intensity, 0, dt * 14);
    } else {
      bolts.forEach((b) => {
        b.line.visible = false;
      });
      flashLight.intensity = 0;
    }

    const targetAuroraOpacity = isAurora ? 0.28 : 0;
    auroraMat.opacity = THREE.MathUtils.lerp(auroraMat.opacity, targetAuroraOpacity, dt * 2.2);
    if (auroraMat.opacity > 0.01) {
      auroraMat.color.set(accentHex).lerp(new THREE.Color(0x6ee7b7), 0.5);
      auroraRibbons.forEach((mesh, rIdx) => {
        const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const wave =
            Math.sin(x * 0.14 + time * 1.3 + rIdx) * 1.3 +
            Math.cos(x * 0.27 - time * 0.9) * 0.6;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
      });
    }
  }

  function dispose() {
    dustGeo.dispose();
    dustMat.dispose();
    boltMat.dispose();
    bolts.forEach((b) => b.line.geometry.dispose());
    auroraMat.dispose();
    auroraRibbons.forEach((m) => m.geometry.dispose());
  }

  return {
    group,
    setWeather,
    getActiveWeather,
    update,
    dispose,
  };
}
