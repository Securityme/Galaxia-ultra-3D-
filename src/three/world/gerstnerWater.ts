/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-25 (Lot Alpha) : Miroir d'Eau Planétaire à Ondes de Gerstner
 * Implémente :
 * - 4 trains d'ondes de Gerstner superposés à amplitude plafonnée (wld_GERSTNER_MAX_AMPLITUDE)
 * - Réflexion céleste dynamique selon l'heure du cycle solaire (aube, midi, crépuscule, nuit)
 * - Reflets spéculaires projetés des façades monumentales et lanternes riveraines
 * - Écume de rivage par bande d'élévation via carte bathymétrique déterministe
 * - Repli automatique sur shader standard léger en preset Performance ou SwiftShader
 */

import * as THREE from 'three';
import {
  wld_PLATEAU_WIDTH,
  wld_PLATEAU_LENGTH,
} from '../../config/constants';
import { PlacedBuilding, WorldPreset } from '../../contracts/schemas';
import {
  getLocalReliefElevation,
  getSphericalCurvatureDrop,
} from '../../core/terrainMath';
import { GraphicsQualityPreset } from '../postfx/blenderComposer';

export const wld_GERSTNER_SUBDIVISIONS = 72;
export const wld_GERSTNER_MAX_AMPLITUDE = 0.075;
export const wld_SHORE_FOAM_ELEV_BAND = 0.14;
export const wld_MAX_REFLECTED_MONUMENTS = 12;
export const wld_WATER_DEPTH_TEX_SIZE = 128;

export interface GerstnerWaterMirror {
  mesh: THREE.Mesh;
  updateTheme: (preset: WorldPreset) => void;
  rebuildBathymetry: () => void;
  rebuildShorelineDepthMap: () => void;
  syncReflectedMonuments: (buildings: PlacedBuilding[]) => void;
  syncBuildingsForReflection: (buildings: PlacedBuilding[]) => void;
  setQualityPreset: (preset: GraphicsQualityPreset, reducedMotion: boolean) => void;
  update: (
    elapsedTime: number,
    celestialTime: number,
    sunDirection: THREE.Vector3
  ) => void;
  dispose: () => void;
}

function buildBathymetryTexture(): THREE.DataTexture {
  const size = wld_WATER_DEPTH_TEX_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    const wz = (py / (size - 1) - 0.5) * wld_PLATEAU_LENGTH * 0.98;
    for (let px = 0; px < size; px++) {
      const wx = (px / (size - 1) - 0.5) * wld_PLATEAU_WIDTH * 0.98;
      const elev = getLocalReliefElevation(wx, wz);
      // Encode elevation relative to waterline (0.0) into [0..255] where 128 = 0.0m
      const norm = Math.max(0, Math.min(1, (elev + 0.6) / 1.2));
      const byteVal = Math.floor(norm * 255);
      const idx = (py * size + px) * 4;
      data[idx] = byteVal;
      data[idx + 1] = byteVal;
      data[idx + 2] = byteVal;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createGerstnerWaterMirror(
  initialPreset: WorldPreset,
  initialBuildingsOrTexOrSoftwareGl?: PlacedBuilding[] | THREE.Texture | boolean,
  maybeSoftwareGl?: boolean
): GerstnerWaterMirror {
  const isSoftwareGl =
    typeof initialBuildingsOrTexOrSoftwareGl === 'boolean'
      ? initialBuildingsOrTexOrSoftwareGl
      : Boolean(maybeSoftwareGl);
  const initialBuildings = Array.isArray(initialBuildingsOrTexOrSoftwareGl)
    ? initialBuildingsOrTexOrSoftwareGl
    : [];

  const geo = new THREE.PlaneGeometry(
    wld_PLATEAU_WIDTH * 0.98,
    wld_PLATEAU_LENGTH * 0.98,
    wld_GERSTNER_SUBDIVISIONS,
    wld_GERSTNER_SUBDIVISIONS
  );
  geo.rotateX(-Math.PI / 2);

  let depthTex = buildBathymetryTexture();

  // Uniform array of vec4(x, z, heightScale, emissiveStrength) for up to 12 monuments
  const monumentVectors: THREE.Vector4[] = [];
  for (let i = 0; i < wld_MAX_REFLECTED_MONUMENTS; i++) {
    monumentVectors.push(new THREE.Vector4(9999, 9999, 0, 0));
  }

  const gerstnerShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0.0 },
      uWaveAmplitudeScale: { value: 1.0 },
      uShallowColor: { value: new THREE.Color(initialPreset.oceanShallowColor) },
      uDeepColor: { value: new THREE.Color(initialPreset.oceanDeepColor) },
      uSkyZenithColor: { value: new THREE.Color(initialPreset.atmosphereColor) },
      uSkyHorizonColor: { value: new THREE.Color('#fde68a') },
      uSunColor: { value: new THREE.Color('#fffbeb') },
      uSunDirection: { value: new THREE.Vector3(0.45, 0.75, 0.35).normalize() },
      uDepthMap: { value: depthTex },
      uMonumentCount: { value: 0 },
      uMonuments: { value: monumentVectors },
      uMonumentTint: { value: new THREE.Color('#fbbf24') },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWaveAmplitudeScale;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      // Planetary curvature matching getSphericalCurvatureDrop (R = 185.0)
      float sphericalDrop(vec2 xz) {
        float rSq = dot(xz, xz);
        return -rSq / (2.0 * 185.0);
      }

      // Single Gerstner Wave train contribution
      void addGerstnerTrain(
        vec2 xz,
        vec2 dir,
        float steepness,
        float wavelength,
        float speed,
        inout vec3 offset,
        inout vec3 tangent,
        inout vec3 binormal
      ) {
        float k = 6.2831853 / wavelength;
        float c = sqrt(9.8 / k) * speed;
        vec2 d = normalize(dir);
        float f = k * (dot(d, xz) - c * uTime);
        float a = (steepness / k) * uWaveAmplitudeScale;

        offset.x += d.x * (a * cos(f));
        offset.y += a * sin(f);
        offset.z += d.y * (a * cos(f));

        tangent += vec3(
          -d.x * d.x * (steepness * sin(f)),
          d.x * (steepness * cos(f)),
          -d.x * d.y * (steepness * sin(f))
        );
        binormal += vec3(
          -d.x * d.y * (steepness * sin(f)),
          d.y * (steepness * cos(f)),
          -d.y * d.y * (steepness * sin(f))
        );
      }

      void main() {
        vUv = uv;
        vec3 basePos = position;
        vec3 offset = vec3(0.0);
        vec3 tangent = vec3(1.0, 0.0, 0.0);
        vec3 binormal = vec3(0.0, 0.0, 1.0);

        // 4 superposed Gerstner wave trains (capped amplitude <= 0.075m)
        addGerstnerTrain(basePos.xz, vec2(0.86, 0.50), 0.11, 7.5, 0.55, offset, tangent, binormal);
        addGerstnerTrain(basePos.xz, vec2(-0.62, 0.78), 0.08, 4.8, 0.68, offset, tangent, binormal);
        addGerstnerTrain(basePos.xz, vec2(0.32, -0.94), 0.06, 3.1, 0.82, offset, tangent, binormal);
        addGerstnerTrain(basePos.xz, vec2(-0.91, -0.41), 0.04, 1.9, 0.95, offset, tangent, binormal);

        offset.y = clamp(offset.y, -0.075, 0.075);

        vec3 displaced = basePos + offset;
        displaced.y += sphericalDrop(basePos.xz) - 0.035;

        vec3 localNormal = normalize(cross(binormal, tangent));
        vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
        vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = worldPosition.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uSkyZenithColor;
      uniform vec3 uSkyHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDirection;
      uniform sampler2D uDepthMap;
      uniform int uMonumentCount;
      uniform vec4 uMonuments[12];
      uniform vec3 uMonumentTint;

      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 R = reflect(-V, N);

        // Bathymetry sample: 0.5 = shoreline (0.0m)
        float rawDepth = texture2D(uDepthMap, vUv).r;
        float signedElev = (rawDepth - 0.5) * 1.2;
        float waterDepth = clamp(-signedElev / 0.45, 0.0, 1.0);

        // 1. Base Water Albedo (Shallow turquoise lagoon -> Deep sapphire sea)
        vec3 waterAlbedo = mix(uShallowColor, uDeepColor, smoothstep(0.0, 0.85, waterDepth));

        // 2. Dynamic Celestial Sky Mirror Reflection (Fresnel Schlick)
        float NoV = max(dot(N, V), 0.0);
        float fresnel = 0.06 + 0.88 * pow(1.0 - NoV, 4.0);
        float skyElev = clamp(R.y, 0.0, 1.0);
        vec3 skyReflection = mix(uSkyHorizonColor, uSkyZenithColor, pow(skyElev, 0.65));

        // 3. Solar Specular Glint on Gerstner crests
        vec3 H = normalize(uSunDirection + V);
        float spec = pow(max(dot(N, H), 0.0), 96.0) * 1.45;
        vec3 sunGlint = uSunColor * spec;

        // 4. Projected Reflections of Nearby Monumental Facades & Golden Windows
        vec3 monumentRefl = vec3(0.0);
        for (int i = 0; i < 12; i++) {
          if (i >= uMonumentCount) break;
          vec4 m = uMonuments[i];
          vec2 toMon = m.xy - vWorldPos.xz;
          float dist = length(toMon);
          float reach = 5.5 + m.z * 2.2;
          if (dist < reach) {
            float radialFalloff = 1.0 - smoothstep(1.2, reach, dist);
            float ripple = 0.55 + 0.45 * sin(dist * 3.8 - uTime * 2.6 + N.x * 9.0);
            vec3 facadeSil = mix(vec3(0.95, 0.92, 0.84), uMonumentTint, 0.55);
            monumentRefl += facadeSil * radialFalloff * ripple * m.w * 0.42;
          }
        }

        // 5. Shoreline Foam by Elevation Band
        float shoreDist = abs(signedElev);
        float foamWave = sin(vWorldPos.x * 1.6 + vWorldPos.z * 1.6 - uTime * 2.4) * 0.025;
        float foamMask = 1.0 - smoothstep(0.0, 0.13, shoreDist + foamWave);
        vec3 foamColor = vec3(0.96, 0.98, 1.0) * foamMask * 0.72;

        vec3 finalRgb = mix(waterAlbedo, skyReflection, fresnel * 0.75) + monumentRefl + sunGlint + foamColor;
        float alpha = mix(0.76, 0.92, waterDepth) + foamMask * 0.15;

        gl_FragColor = vec4(clamp(finalRgb, 0.0, 1.0), clamp(alpha, 0.0, 0.96));
      }
    `,
  });

  // Fast fallback material for Performance preset or SwiftShader
  const fallbackWaterMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.oceanShallowColor),
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity: 0.84,
  });

  let useSimpleFallback = isSoftwareGl;
  let isReducedMotion = false;

  const mesh = new THREE.Mesh(
    geo,
    useSimpleFallback ? fallbackWaterMat : gerstnerShaderMat
  );
  mesh.name = 'Mesh_CoastalLagoonGerstnerMirror';
  mesh.receiveShadow = true;

  function applyCurvatureToFallbackGeometry(): void {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getSphericalCurvatureDrop(x, z) - 0.04);
    }
    pos.needsUpdate = true;
  }

  applyCurvatureToFallbackGeometry();

  function updateTheme(preset: WorldPreset): void {
    gerstnerShaderMat.uniforms.uShallowColor.value.set(preset.oceanShallowColor);
    gerstnerShaderMat.uniforms.uDeepColor.value.set(preset.oceanDeepColor);
    gerstnerShaderMat.uniforms.uSkyZenithColor.value.set(preset.atmosphereColor);
    gerstnerShaderMat.uniforms.uMonumentTint.value.set(preset.edgeColor);
    fallbackWaterMat.color.set(preset.oceanShallowColor);
  }

  function rebuildBathymetry(): void {
    depthTex.dispose();
    depthTex = buildBathymetryTexture();
    gerstnerShaderMat.uniforms.uDepthMap.value = depthTex;
  }

  function syncReflectedMonuments(buildings: PlacedBuilding[]): void {
    const count = Math.min(wld_MAX_REFLECTED_MONUMENTS, buildings.length);
    gerstnerShaderMat.uniforms.uMonumentCount.value = count;
    for (let i = 0; i < wld_MAX_REFLECTED_MONUMENTS; i++) {
      if (i < count) {
        const b = buildings[i];
        const tierBoost = 0.85 + ((b.tier ?? 1) - 1) * 0.35;
        monumentVectors[i].set(b.x, b.z, b.scale * tierBoost, tierBoost);
      } else {
        monumentVectors[i].set(9999, 9999, 0, 0);
      }
    }
  }

  if (initialBuildings.length > 0) {
    syncReflectedMonuments(initialBuildings);
  }

  function setQualityPreset(
    preset: GraphicsQualityPreset,
    reducedMotion: boolean
  ): void {
    isReducedMotion = reducedMotion;
    const nextFallback = isSoftwareGl || preset === 'performance';
    if (nextFallback !== useSimpleFallback) {
      useSimpleFallback = nextFallback;
      mesh.material = useSimpleFallback ? fallbackWaterMat : gerstnerShaderMat;
    }
    gerstnerShaderMat.uniforms.uWaveAmplitudeScale.value = isReducedMotion
      ? 0.25
      : 1.0;
  }

  function update(
    elapsedTime: number,
    celestialTime: number,
    sunDirection: THREE.Vector3
  ): void {
    if (useSimpleFallback) return;

    gerstnerShaderMat.uniforms.uTime.value = isReducedMotion ? 0.0 : elapsedTime;
    gerstnerShaderMat.uniforms.uSunDirection.value.copy(sunDirection).normalize();

    const daylight = Math.sin(celestialTime * Math.PI);
    const isTwilight = daylight > 0.08 && daylight < 0.45;
    if (daylight <= 0.08) {
      gerstnerShaderMat.uniforms.uSkyHorizonColor.value.set('#1e293b');
      gerstnerShaderMat.uniforms.uSunColor.value.set('#93c5fd');
    } else if (isTwilight) {
      gerstnerShaderMat.uniforms.uSkyHorizonColor.value.set('#f59e0b');
      gerstnerShaderMat.uniforms.uSunColor.value.set('#fde68a');
    } else {
      gerstnerShaderMat.uniforms.uSkyHorizonColor.value.set('#bae6fd');
      gerstnerShaderMat.uniforms.uSunColor.value.set('#fffbeb');
    }
  }

  function dispose(): void {
    geo.dispose();
    depthTex.dispose();
    gerstnerShaderMat.dispose();
    fallbackWaterMat.dispose();
  }

  return {
    mesh,
    updateTheme,
    rebuildBathymetry,
    rebuildShorelineDepthMap: rebuildBathymetry,
    syncReflectedMonuments,
    syncBuildingsForReflection: syncReflectedMonuments,
    setQualityPreset,
    update,
    dispose,
  };
}
