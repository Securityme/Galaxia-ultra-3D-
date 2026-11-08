import * as THREE from 'three';
import {
  WeatherType,
  wtr_CALM,
  wtr_LIGHT_RAIN,
  wtr_MIST,
  wtr_STARDUST_DRIFT,
  wtr_ELECTRICAL_STORM,
  wtr_AURORA_CURTAIN,
  wtr_SOLAR_FLARE,
  bld_TYPE_RELAY_TOWER,
} from '../../config/constants';
import { PlacedBuilding, WorldPreset } from '../../contracts/schemas';
import { createPRNG, DeterministicPRNG } from '../../core/prng';
import { getSphericalCurvatureDrop, getTerrainHeight } from '../../core/terrainMath';
import { createSoftCircularParticleTexture } from '../textures/proceduralTextures';

export interface WeatherSystemManager {
  group: THREE.Group;
  setWeather: (weather: WeatherType, durationSec?: number) => void;
  getActiveWeather: () => WeatherType;
  update: (
    time: number,
    dt: number,
    buildings: PlacedBuilding[],
    preset: WorldPreset,
    isGlobeMode?: boolean
  ) => void;
  dispose: () => void;
}

interface ArcBolt {
  line: THREE.Line;
  positions: Float32Array;
  nextStrikeTime: number;
  visibleUntil: number;
}

/**
 * Procedural weather cycle definition tailored to a specific planetary biome.
 */
interface BiomeWeatherCycle {
  weather: WeatherType;
  duration: number; // Duration in seconds before transitioning
  label: string;
}

/**
 * Returns procedural weather cycles tuned to the natural biome climate:
 * - terra_blue (Mediterranean): cycles light_rain -> calm -> mist -> light_rain
 * - glacial_aurora (Boreal ice): cycles aurora_curtain -> mist -> calm -> aurora_curtain
 * - highland_fjord (Highlands/celtic): cycles mist -> light_rain -> aurora_curtain -> mist
 * - volcanic_core (Geothermal caldera): cycles stardust_drift (thermal ash) -> electrical_storm -> mist
 * - neon_alien (Solar desert oasis): cycles solar_flare (heat haze) -> calm -> stardust_drift
 */
function getBiomeWeatherSequence(presetId: string): BiomeWeatherCycle[] {
  switch (presetId) {
    case 'glacial_aurora':
      return [
        { weather: wtr_AURORA_CURTAIN, duration: 32, label: 'Aurores Boréales Étincelantes' },
        { weather: wtr_MIST, duration: 22, label: 'Brumes Cristallines & Poudrin de Glace' },
        { weather: wtr_CALM, duration: 16, label: 'Ciel Arctique Pur' },
      ];
    case 'highland_fjord':
      return [
        { weather: wtr_MIST, duration: 28, label: 'Brume des Fjords & Écume Éthérée' },
        { weather: wtr_LIGHT_RAIN, duration: 24, label: 'Pluie Fine Céleste des Hautes-Terres' },
        { weather: wtr_AURORA_CURTAIN, duration: 26, label: 'Aurore Nocturne d’Avalon' },
        { weather: wtr_CALM, duration: 18, label: 'Éclaircie Tempérée' },
      ];
    case 'volcanic_core':
      return [
        { weather: wtr_STARDUST_DRIFT, duration: 26, label: 'Nuées de Cendres Dorées & Fumerolles' },
        { weather: wtr_ELECTRICAL_STORM, duration: 18, label: 'Arcs Géothermiques' },
        { weather: wtr_MIST, duration: 24, label: 'Vapeurs Minérales des Failles' },
      ];
    case 'neon_alien':
      return [
        { weather: wtr_SOLAR_FLARE, duration: 26, label: 'Rayonnement Zénithal & Brume Solaire' },
        { weather: wtr_STARDUST_DRIFT, duration: 22, label: 'Poussière d’Étoile & Sable d’Or' },
        { weather: wtr_MIST, duration: 20, label: 'Brume Nocturne de l’Oasis' },
        { weather: wtr_CALM, duration: 18, label: 'Ciel Cristallin d’Héliopolis' },
      ];
    case 'terra_blue':
    default:
      return [
        { weather: wtr_LIGHT_RAIN, duration: 26, label: 'Pluie Fine d’Or & Ondée Vivifiante' },
        { weather: wtr_MIST, duration: 22, label: 'Brume d’Évaporation & Ciel de Rosée' },
        { weather: wtr_AURORA_CURTAIN, duration: 24, label: 'Voiles d’Aurore Héliocentriques' },
        { weather: wtr_CALM, duration: 18, label: 'Zénith Ensoleillé Limpide' },
      ];
  }
}

/**
 * Creates dynamic procedural weather systems enclosed within the terrarium's glass orb / biodome.
 * Encompasses:
 * 1. Procedural glass biodome envelope with subtle Fresnel iridescence, condensation rim, and hex ribs
 * 2. Fine gentle rain lines falling within the biodome with splash ripples
 * 3. Atmospheric low-altitude volumetric mist clouds drifting gracefully over the terrain
 * 4. Sparkling ion aurora ribbons and celestial shimmer particles
 * 5. Electrical storm arc bolts connecting energy spires
 * 6. Procedural natural cycling based on active biome preset
 */
export function createWeatherSystem(
  seed: string | number = 'GALAXIA-OMEGA-77'
): WeatherSystemManager {
  const group = new THREE.Group();
  group.name = 'TerrariumWeatherSystem';

  const rng: DeterministicPRNG = createPRNG(`${seed}_weather_v5`);
  let activeWeather: WeatherType = wtr_CALM;
  let manualOverrideTimer = 0;
  let isManualOverride = false;

  // Procedural cycling state
  let currentCycleIndex = 0;
  let currentCycleTimer = 0;
  let lastBiomePresetId = '';

  // ---------------------------------------------------------------------------
  // 1. TERRARIUM GLASS ORB ENVELOPE (Translucent Biosphere Dôme)
  // ---------------------------------------------------------------------------
  const domeRadius = 58;
  const orbGroup = new THREE.Group();
  orbGroup.name = 'TerrariumGlassOrb';
  group.add(orbGroup);

  // Hemispherical glass dome with soft curvature
  const glassGeo = new THREE.SphereGeometry(
    domeRadius,
    64,
    32,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.52
  );

  const glassMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uFresnelColor: { value: new THREE.Color(0xa5f3fc) },
      uFogColor: { value: new THREE.Color(0x0f172a) },
      uMistIntensity: { value: 0.15 },
      uRainCondensation: { value: 0.1 },
      uAtmosphereColor: { value: new THREE.Color(0x38bdf8) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 worldP = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldP.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldP;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uFresnelColor;
      uniform vec3 uFogColor;
      uniform vec3 uAtmosphereColor;
      uniform float uMistIntensity;
      uniform float uRainCondensation;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float NoV = max(0.0, dot(N, V));
        float fresnel = pow(1.0 - NoV, 3.2);

        // Subtle geodesic hexagonal grid pattern on glass
        vec2 gridUv = vUv * vec2(96.0, 48.0);
        vec2 gridF = abs(fract(gridUv - 0.5) - 0.5);
        float lineDist = min(gridF.x, gridF.y);
        float gridLine = 1.0 - smoothstep(0.0, 0.045, lineDist);

        // Animated condensation droplet shimmer
        float condensationWave = sin(vUv.x * 60.0 + sin(vUv.y * 40.0 + uTime * 0.6)) * 0.5 + 0.5;
        float dropletGlow = condensationWave * uRainCondensation * 0.18;

        // Base glass tint with iridescent rim
        vec3 glassRgb = mix(uFogColor, uFresnelColor, fresnel * 0.85);
        glassRgb += uAtmosphereColor * (gridLine * 0.12);
        glassRgb += vec3(0.9, 0.98, 1.0) * dropletGlow;

        // Soft opacity: mostly invisible looking straight on, delicate gleam at glancing angles
        float alpha = clamp(fresnel * 0.28 + gridLine * 0.04 + dropletGlow * 0.35 + uMistIntensity * 0.06, 0.0, 0.65);
        gl_FragColor = vec4(glassRgb, alpha);
      }
    `,
  });

  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.y = -2.5;
  orbGroup.add(glassMesh);

  // Delicate decorative equatorial meridian ring at ground rim
  const rimRingGeo = new THREE.RingGeometry(domeRadius * 0.992, domeRadius * 1.008, 96);
  rimRingGeo.rotateX(-Math.PI / 2);
  const rimRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const rimRingMesh = new THREE.Mesh(rimRingGeo, rimRingMat);
  rimRingMesh.position.y = -1.2;
  orbGroup.add(rimRingMesh);

  // ---------------------------------------------------------------------------
  // 2. LIGHT RAIN SYSTEM (Procedural Gentle Falling Rain within the Orb)
  // ---------------------------------------------------------------------------
  const rainCount = 420;
  const rainPositions = new Float32Array(rainCount * 2 * 3); // Line segments (top and bottom of streak)
  const rainSpeeds = new Float32Array(rainCount);
  const rainOriginsX = new Float32Array(rainCount);
  const rainOriginsZ = new Float32Array(rainCount);

  for (let i = 0; i < rainCount; i++) {
    const rx = (rng() - 0.5) * 88;
    const rz = (rng() - 0.5) * 88;
    const ry = 8 + rng() * 32;
    rainOriginsX[i] = rx;
    rainOriginsZ[i] = rz;
    rainSpeeds[i] = 22 + rng() * 12;

    const streakLen = 0.85 + rng() * 0.6;
    const vIdx = i * 6;
    // Point A (top)
    rainPositions[vIdx] = rx;
    rainPositions[vIdx + 1] = ry;
    rainPositions[vIdx + 2] = rz;
    // Point B (bottom)
    rainPositions[vIdx + 3] = rx - 0.08;
    rainPositions[vIdx + 4] = ry - streakLen;
    rainPositions[vIdx + 5] = rz + 0.04;
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xc7e6fa,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  group.add(rainLines);

  // ---------------------------------------------------------------------------
  // 3. LOW-ALTITUDE VOLUMETRIC MIST & STARDUST CLOUDS
  // ---------------------------------------------------------------------------
  const mistCount = 180;
  const mistPositions = new Float32Array(mistCount * 3);
  const mistSpeeds = new Float32Array(mistCount);
  const mistScales = new Float32Array(mistCount);
  const mistCircularTexture = createSoftCircularParticleTexture();

  for (let i = 0; i < mistCount; i++) {
    const angle = (i / mistCount) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const dist = 6 + rng() * 38;
    mistPositions[i * 3] = Math.cos(angle) * dist;
    mistPositions[i * 3 + 1] = 1.2 + rng() * 11;
    mistPositions[i * 3 + 2] = Math.sin(angle) * dist;
    mistSpeeds[i] = 0.45 + rng() * 0.65;
    mistScales[i] = 1.4 + rng() * 2.2;
  }

  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));

  const mistMat = new THREE.PointsMaterial({
    color: 0xbae6fd,
    size: 2.8,
    map: mistCircularTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const mistPoints = new THREE.Points(mistGeo, mistMat);
  group.add(mistPoints);

  // ---------------------------------------------------------------------------
  // 4. SPARKLING AURORA & CELESTIAL SHIMMER
  // ---------------------------------------------------------------------------
  const auroraGroup = new THREE.Group();
  auroraGroup.name = 'TerrariumIonAurora';
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
  for (let r = 0; r < 3; r++) {
    const ribbonGeo = new THREE.PlaneGeometry(64, 8.5, 54, 4);
    const mesh = new THREE.Mesh(ribbonGeo, auroraMat);
    mesh.position.set(0, 18.5 + r * 3.2, -12 + r * 12);
    mesh.rotation.x = 0.28 + r * 0.06;
    auroraGroup.add(mesh);
    auroraRibbons.push(mesh);
  }

  // Sparkling celestial dust points specifically tied to the Aurora
  const shimmerCount = 75;
  const shimmerPositions = new Float32Array(shimmerCount * 3);
  for (let i = 0; i < shimmerCount; i++) {
    shimmerPositions[i * 3] = (rng() - 0.5) * 62;
    shimmerPositions[i * 3 + 1] = 14 + rng() * 16;
    shimmerPositions[i * 3 + 2] = (rng() - 0.5) * 58;
  }
  const shimmerGeo = new THREE.BufferGeometry();
  shimmerGeo.setAttribute('position', new THREE.BufferAttribute(shimmerPositions, 3));
  const shimmerMat = new THREE.PointsMaterial({
    color: 0xa7f3d0,
    size: 1.2,
    map: mistCircularTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const shimmerPoints = new THREE.Points(shimmerGeo, shimmerMat);
  auroraGroup.add(shimmerPoints);

  // ---------------------------------------------------------------------------
  // 5. ELECTRICAL STORM ARCS
  // ---------------------------------------------------------------------------
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
      nextStrikeTime: rng() * 1.5,
      visibleUntil: 0,
    });
  }

  const flashLight = new THREE.PointLight(0xaad8ff, 0, 32, 1.8);
  flashLight.position.set(0, 8, 0);
  stormGroup.add(flashLight);

  // ---------------------------------------------------------------------------
  // CONTROLLER METHODS
  // ---------------------------------------------------------------------------
  function setWeather(weather: WeatherType, durationSec = 45) {
    activeWeather = weather;
    manualOverrideTimer = durationSec;
    isManualOverride = true;
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
      arr[s * 3] = x + (rng() - 0.5) * jitter;
      arr[s * 3 + 1] = y + (rng() - 0.5) * jitter;
      arr[s * 3 + 2] = z + (rng() - 0.5) * jitter;
    }
    const attr = bolt.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  function update(
    time: number,
    dt: number,
    buildings: PlacedBuilding[],
    preset: WorldPreset,
    isGlobeMode = false
  ) {
    // When viewing full 3D planetary globe, mute weather inside the terrarium
    if (isGlobeMode) {
      rainMat.opacity = 0;
      mistMat.opacity = 0;
      auroraMat.opacity = 0;
      shimmerMat.opacity = 0;
      glassMesh.visible = false;
      return;
    }
    glassMesh.visible = true;

    // 1. Procedural Weather Cycling by Biome
    const sequence = getBiomeWeatherSequence(preset.id);
    if (preset.id !== lastBiomePresetId) {
      lastBiomePresetId = preset.id;
      currentCycleIndex = 0;
      currentCycleTimer = 0;
      if (!isManualOverride) {
        activeWeather = sequence[0].weather;
      }
    }

    if (isManualOverride) {
      manualOverrideTimer -= dt;
      if (manualOverrideTimer <= 0) {
        isManualOverride = false;
        currentCycleTimer = 0;
      }
    } else {
      currentCycleTimer += dt;
      const activeStep = sequence[currentCycleIndex % sequence.length];
      if (currentCycleTimer >= activeStep.duration) {
        currentCycleTimer = 0;
        currentCycleIndex = (currentCycleIndex + 1) % sequence.length;
        activeWeather = sequence[currentCycleIndex].weather;
      }
    }

    // Determine intensity targets based on activeWeather
    const isRain = activeWeather === wtr_LIGHT_RAIN;
    const isMist = activeWeather === wtr_MIST || activeWeather === wtr_STARDUST_DRIFT;
    const isAurora = activeWeather === wtr_AURORA_CURTAIN;
    const isStorm = activeWeather === wtr_ELECTRICAL_STORM;
    const isSolarFlare = activeWeather === wtr_SOLAR_FLARE;

    // 2. Update Terrarium Glass Orb Shaders
    glassMat.uniforms.uTime.value = time;
    glassMat.uniforms.uFresnelColor.value.set(preset.atmosphereColor).lerp(new THREE.Color(0xfef08a), 0.25);
    glassMat.uniforms.uFogColor.value.set(preset.fogColor);
    glassMat.uniforms.uAtmosphereColor.value.set(preset.edgeColor);
    glassMat.uniforms.uRainCondensation.value = THREE.MathUtils.lerp(
      glassMat.uniforms.uRainCondensation.value,
      isRain ? 0.72 : isMist ? 0.45 : 0.08,
      dt * 1.8
    );
    glassMat.uniforms.uMistIntensity.value = THREE.MathUtils.lerp(
      glassMat.uniforms.uMistIntensity.value,
      isMist ? 0.58 : isRain ? 0.35 : 0.08,
      dt * 1.8
    );
    rimRingMat.color.set(preset.edgeColor);

    // 3. Update Light Rain System
    const targetRainOpacity = isRain ? 0.65 : 0;
    rainMat.opacity = THREE.MathUtils.lerp(rainMat.opacity, targetRainOpacity, dt * 2.8);

    if (rainMat.opacity > 0.01) {
      const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < rainCount; i++) {
        const topIdx = i * 6;
        const botIdx = topIdx + 3;
        const spd = rainSpeeds[i] * dt;
        const streakLen = 0.95;

        // Fall downward
        arr[topIdx + 1] -= spd;
        arr[botIdx + 1] = arr[topIdx + 1] - streakLen;

        // Check ground impact and reset to top of dome
        const gx = arr[topIdx];
        const gz = arr[topIdx + 2];
        const groundH = getTerrainHeight(gx, gz) + getSphericalCurvatureDrop(gx, gz);

        if (arr[botIdx + 1] <= groundH) {
          // Re-spawn near top of terrarium dome
          const newY = 24 + (i % 12) * 1.8;
          arr[topIdx + 1] = newY;
          arr[botIdx + 1] = newY - streakLen;
          // Slight procedural drift
          arr[topIdx] = rainOriginsX[i] + Math.sin(time * 0.8 + i) * 1.2;
          arr[topIdx + 2] = rainOriginsZ[i] + Math.cos(time * 0.8 + i) * 1.2;
          arr[botIdx] = arr[topIdx] - 0.08;
          arr[botIdx + 2] = arr[topIdx + 2] + 0.04;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 4. Update Mist / Stardust Particles
    const targetMistOpacity = isMist ? 0.48 : isRain ? 0.28 : isSolarFlare ? 0.38 : 0;
    mistMat.opacity = THREE.MathUtils.lerp(mistMat.opacity, targetMistOpacity, dt * 2.4);

    if (mistMat.opacity > 0.01) {
      // Color tuned to biome: cold azure in glacial/highland, golden in terra/desert, copper in volcanic
      const mistColor =
        preset.climateEffectType === 'snow_ice'
          ? new THREE.Color(0xdbeafe)
          : preset.climateEffectType === 'volcanic_magma'
          ? new THREE.Color(0xfcd34d)
          : preset.climateEffectType === 'desert_sun'
          ? new THREE.Color(0xfef08a)
          : new THREE.Color(preset.atmosphereColor).lerp(new THREE.Color(0xffffff), 0.55);

      mistMat.color.copy(mistColor);

      const posAttr = mistGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < mistCount; i++) {
        const idx = i * 3;
        arr[idx] += dt * 1.8 * mistSpeeds[i];
        arr[idx + 1] += Math.sin(time * 0.9 + i * 0.3) * dt * 0.3;
        arr[idx + 2] += dt * 0.9 * mistSpeeds[i];

        // Wrap around plateau perimeter smoothly
        if (arr[idx] > 42) arr[idx] = -42;
        if (arr[idx + 2] > 42) arr[idx + 2] = -42;
      }
      posAttr.needsUpdate = true;
    }

    // 5. Update Sparkling Aurora & Celestial Ribbons
    const targetAuroraOpacity = isAurora ? 0.34 : 0;
    auroraMat.opacity = THREE.MathUtils.lerp(auroraMat.opacity, targetAuroraOpacity, dt * 2.0);
    shimmerMat.opacity = THREE.MathUtils.lerp(shimmerMat.opacity, isAurora ? 0.55 : 0, dt * 2.5);

    if (auroraMat.opacity > 0.01) {
      // Shimmer ribbon color modulated by biome accent
      const auroraColor = new THREE.Color(preset.edgeColor).lerp(new THREE.Color(0x34d399), 0.65);
      auroraMat.color.copy(auroraColor);
      shimmerMat.color.set(preset.atmosphereColor).lerp(new THREE.Color(0xffffff), 0.4);

      auroraRibbons.forEach((mesh, rIdx) => {
        const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const wave =
            Math.sin(x * 0.12 + time * 1.4 + rIdx * 1.2) * 1.6 +
            Math.cos(x * 0.22 - time * 0.8) * 0.8;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
      });

      // Animate shimmering spark points
      const shimAttr = shimmerGeo.getAttribute('position') as THREE.BufferAttribute;
      const shimArr = shimAttr.array as Float32Array;
      for (let i = 0; i < shimmerCount; i++) {
        const idx = i * 3;
        shimArr[idx + 1] += Math.sin(time * 2.2 + i) * dt * 0.45;
      }
      shimAttr.needsUpdate = true;
    }

    // 6. Update Electrical Storm Lightning Arcs
    if (isStorm) {
      const relays = buildings.filter((b) => b.buildingType === bld_TYPE_RELAY_TOWER);
      const anchorList = relays.length > 0 ? relays : buildings;

      bolts.forEach((bolt) => {
        if (time >= bolt.nextStrikeTime && anchorList.length > 0) {
          const targetBld = anchorList[Math.floor(rng() * anchorList.length)];
          const baseH = getTerrainHeight(targetBld.x, targetBld.z);
          const start = new THREE.Vector3(
            targetBld.x + (rng() - 0.5) * 0.5,
            baseH + 3.4 * targetBld.scale,
            targetBld.z + (rng() - 0.5) * 0.5
          );
          const angle = rng() * Math.PI * 2;
          const dist = 2.0 + rng() * 4.5;
          const endX = targetBld.x + Math.cos(angle) * dist;
          const endZ = targetBld.z + Math.sin(angle) * dist;
          const end = new THREE.Vector3(endX, getTerrainHeight(endX, endZ) + 0.3, endZ);

          rebuildBoltGeometry(bolt, start, end);
          bolt.line.visible = true;
          bolt.visibleUntil = time + 0.08 + rng() * 0.1;
          bolt.nextStrikeTime = time + 0.35 + rng() * 1.1;

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
  }

  function dispose() {
    glassGeo.dispose();
    glassMat.dispose();
    rimRingGeo.dispose();
    rimRingMat.dispose();
    rainGeo.dispose();
    rainMat.dispose();
    mistGeo.dispose();
    mistMat.dispose();
    shimmerGeo.dispose();
    shimmerMat.dispose();
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
