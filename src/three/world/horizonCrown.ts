/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-60: Horizon Immersif « Couronne de l'Aurore »
 * Quatre couches déterministes indexées sur la graine et le tick (jamais d'horloge réelle) :
 * - H1 : Couronne montagneuse procédurale low-poly (rayon 68..96, hauteur max 14, maillage annulaire unique)
 * - H2 : Voile de nuages lumineux (sprites radiaux à Y = 10, dérive indexée sur tickIndex, sous seuil de bloom 0.82)
 * - H3 : Bande atmosphérique à dégradé vertical du fogColor vers le cosmos profond
 * - H4 : Signature céleste (Planète sœur géante + deux lunes procédurales en orbite lente dans le quadrant opposé au soleil)
 */

import * as THREE from 'three';
import {
  wld_CLOUD_BAND_Y,
  wld_CLOUD_DRIFT_PER_TICK,
  wld_CLOUD_SPRITE_COUNT_CINEMA,
  wld_CLOUD_SPRITE_COUNT_PERFORMANCE,
  wld_HORIZON_CROWN_INNER,
  wld_HORIZON_CROWN_OUTER,
  wld_HORIZON_PEAK_MAX,
  wld_MOON_ORBIT_PER_TICK,
} from '../../config/constants';
import { WorldPreset } from '../../contracts/schemas';
import { FractalNoise3D } from '../../core/noise';
import { createPRNG } from '../../core/prng';
import { getSphericalCurvatureDrop } from '../../core/terrainMath';
import { GraphicsQualityPreset } from '../postfx/blenderComposer';
import { createSoftCircularParticleTexture } from '../textures/proceduralTextures';

export interface AuroraHorizonCrown {
  group: THREE.Group;
  rebuildForThemeAndSeed: (preset: WorldPreset, seed: string | number) => void;
  updateByTick: (
    tickIndex: number,
    celestialTime: number,
    qualityPreset: GraphicsQualityPreset,
    isGlobeMode: boolean
  ) => void;
  dispose: () => void;
}

interface CloudSpriteMeta {
  baseAngle: number;
  radius: number;
  baseY: number;
  baseOpacity: number;
}

export function createAuroraHorizonCrown(
  initialPreset: WorldPreset,
  initialSeed: string | number
): AuroraHorizonCrown {
  const group = new THREE.Group();
  group.name = 'SubCollection_PT60_AuroraHorizonCrown';

  let currentPreset = initialPreset;
  let currentSeed = initialSeed;

  // ---------------------------------------------------------------------------
  // H1 — Procedural Low-Poly Mountain Crown (Single Annular Mesh, 68m..96m)
  // ---------------------------------------------------------------------------
  const radialSegs = 72;
  const thetaSegs = 8;
  const crownGeo = new THREE.RingGeometry(
    wld_HORIZON_CROWN_INNER,
    wld_HORIZON_CROWN_OUTER,
    radialSegs,
    thetaSegs
  );
  crownGeo.rotateX(-Math.PI / 2);

  const vertexCount = crownGeo.attributes.position.count;
  const crownColors = new Float32Array(vertexCount * 3);
  crownGeo.setAttribute('color', new THREE.BufferAttribute(crownColors, 3));

  const crownMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.12,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const crownMesh = new THREE.Mesh(crownGeo, crownMat);
  crownMesh.name = 'H1_ProceduralMountainCrown';
  crownMesh.castShadow = false;
  crownMesh.receiveShadow = true;
  crownMesh.frustumCulled = true;
  group.add(crownMesh);

  // ---------------------------------------------------------------------------
  // H2 — Luminous Cloud Veil (Radial Sprites at wld_CLOUD_BAND_Y = 10, < 0.82 bloom)
  // ---------------------------------------------------------------------------
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'H2_LuminousCloudVeil';
  const softCloudTex = createSoftCircularParticleTexture();
  const cloudSprites: THREE.Sprite[] = [];
  const cloudMetas: CloudSpriteMeta[] = [];

  for (let i = 0; i < wld_CLOUD_SPRITE_COUNT_CINEMA; i++) {
    const mat = new THREE.SpriteMaterial({
      map: softCloudTex,
      color: new THREE.Color(0xcbd5e1), // Luminance ~0.78 < 0.82 bloom threshold
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    cloudSprites.push(sprite);
    cloudMetas.push({
      baseAngle: (i / wld_CLOUD_SPRITE_COUNT_CINEMA) * Math.PI * 2,
      radius: 78,
      baseY: wld_CLOUD_BAND_Y,
      baseOpacity: 0.62,
    });
    cloudGroup.add(sprite);
  }
  group.add(cloudGroup);

  // ---------------------------------------------------------------------------
  // H3 — Vertical Gradient Atmospheric Dome (Dissolves Plateau Skirt into Horizon)
  // ---------------------------------------------------------------------------
  const domeGeo = new THREE.SphereGeometry(
    wld_HORIZON_CROWN_OUTER * 1.18,
    40,
    20,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.62
  );
  const domeVertCount = domeGeo.attributes.position.count;
  const domeColors = new Float32Array(domeVertCount * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(domeColors, 3));

  const domeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.34,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.name = 'H3_AtmosphericGradientDome';
  domeMesh.position.y = -5.5;
  group.add(domeMesh);

  // ---------------------------------------------------------------------------
  // H4 — Celestial Signature (Giant Sister Planet Sprite + Two Procedural Moons)
  // ---------------------------------------------------------------------------
  const signatureGroup = new THREE.Group();
  signatureGroup.name = 'H4_SisterPlanetAndTwoMoons';

  const sisterPlanetMat = new THREE.SpriteMaterial({
    map: softCloudTex,
    color: new THREE.Color(initialPreset.atmosphereColor),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const sisterPlanetSprite = new THREE.Sprite(sisterPlanetMat);
  sisterPlanetSprite.scale.set(28, 28, 1);
  sisterPlanetSprite.position.set(-76, 34, -74);
  signatureGroup.add(sisterPlanetSprite);

  const moon1Geo = new THREE.IcosahedronGeometry(2.6, 2);
  const moon2Geo = new THREE.IcosahedronGeometry(1.55, 2);
  const moon1Mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.groundPeakColor),
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
  });
  const moon2Mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialPreset.edgeColor),
    roughness: 0.65,
    metalness: 0.18,
    flatShading: true,
  });
  const moon1Mesh = new THREE.Mesh(moon1Geo, moon1Mat);
  const moon2Mesh = new THREE.Mesh(moon2Geo, moon2Mat);
  signatureGroup.add(moon1Mesh);
  signatureGroup.add(moon2Mesh);
  group.add(signatureGroup);

  function sculptAndTintHorizon(preset: WorldPreset, seed: string | number): void {
    const noise = new FractalNoise3D(`${seed}_PT60_horizon`);
    const rng = createPRNG(`${seed}_PT60_clouds`);

    const peakColor = new THREE.Color(preset.groundPeakColor);
    const edgeColor = new THREE.Color(preset.edgeColor);
    const baseColor = new THREE.Color(preset.groundBaseColor).lerp(
      new THREE.Color(preset.fogColor),
      0.38
    );

    // Biome-specific crown tint accent
    const crownAccent = peakColor.clone().lerp(edgeColor, 0.35);
    const pos = crownGeo.attributes.position;
    const colAttr = crownGeo.attributes.color as THREE.BufferAttribute;
    const innerR = wld_HORIZON_CROWN_INNER;
    const outerR = wld_HORIZON_CROWN_OUTER;
    const spanR = outerR - innerR;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const r = Math.hypot(vx, vz);
      const radialT = THREE.MathUtils.clamp((r - innerR) / spanR, 0, 1);
      // Arch profile: 0 at inner skirt edge & outer rim, peaking in the middle of the ring
      const ridgeArch = Math.sin(radialT * Math.PI);
      const nVal = noise.fbm(vx * 0.038, 0, vz * 0.038, 3, 2.1, 0.52);
      const ridgeHeight = Math.max(0, (nVal * 0.55 + 0.55) * wld_HORIZON_PEAK_MAX * ridgeArch);
      const curvatureDrop = getSphericalCurvatureDrop(vx, vz) * 0.32 - 3.6;
      const finalY = curvatureDrop + ridgeHeight;
      pos.setY(i, finalY);

      const heightRatio = THREE.MathUtils.clamp(ridgeHeight / wld_HORIZON_PEAK_MAX, 0, 1);
      const vertColor = baseColor.clone().lerp(crownAccent, Math.pow(heightRatio, 0.75));
      colAttr.setXYZ(i, vertColor.r, vertColor.g, vertColor.b);
    }

    pos.needsUpdate = true;
    colAttr.needsUpdate = true;
    crownGeo.computeVertexNormals();

    // Update H2 Cloud Sprites deterministic layout & biome-safe sub-bloom color
    const cloudTint = new THREE.Color(0xc4cdd8).lerp(edgeColor, 0.18);
    cloudTint.r = Math.min(0.79, cloudTint.r);
    cloudTint.g = Math.min(0.79, cloudTint.g);
    cloudTint.b = Math.min(0.81, cloudTint.b);

    for (let i = 0; i < wld_CLOUD_SPRITE_COUNT_CINEMA; i++) {
      const sprite = cloudSprites[i];
      const angle = (i / wld_CLOUD_SPRITE_COUNT_CINEMA) * Math.PI * 2 + (rng() - 0.5) * 0.14;
      const radius = wld_HORIZON_CROWN_INNER + 6 + rng() * 16;
      const baseY = wld_CLOUD_BAND_Y + (rng() - 0.5) * 2.4;
      const baseOpacity = 0.5 + rng() * 0.28;
      const scaleW = 22 + rng() * 14;
      const scaleH = 6.5 + rng() * 3.8;

      cloudMetas[i] = { baseAngle: angle, radius, baseY, baseOpacity };
      sprite.scale.set(scaleW, scaleH, 1);
      sprite.material.color.copy(cloudTint);
      sprite.material.opacity = baseOpacity;
      sprite.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
    }

    // Update H3 Atmospheric Dome Vertical Gradient
    const dPos = domeGeo.attributes.position;
    const dCol = domeGeo.attributes.color as THREE.BufferAttribute;
    const horizonHalo = new THREE.Color(preset.fogColor).lerp(
      new THREE.Color(preset.atmosphereColor),
      0.42
    );
    const deepCosmos = new THREE.Color(0x040711);

    for (let i = 0; i < dPos.count; i++) {
      const vy = dPos.getY(i);
      const normY = THREE.MathUtils.clamp(vy / (wld_HORIZON_CROWN_OUTER * 1.1), 0, 1);
      const c = horizonHalo.clone().lerp(deepCosmos, Math.pow(normY, 0.65));
      dCol.setXYZ(i, c.r, c.g, c.b);
    }
    dCol.needsUpdate = true;

    // Update H4 Sister Planet & Moons seed placement
    const quadrantAngle = Math.PI * 1.25 + (rng() - 0.5) * 0.45;
    const sisterDist = 88;
    sisterPlanetSprite.position.set(
      Math.cos(quadrantAngle) * sisterDist,
      30 + rng() * 8,
      Math.sin(quadrantAngle) * sisterDist
    );
    sisterPlanetMat.color
      .set(preset.atmosphereColor)
      .lerp(new THREE.Color(preset.edgeColor), 0.35);
    moon1Mat.color.set(preset.groundPeakColor);
    moon2Mat.color.set(preset.edgeColor);
  }

  function rebuildForThemeAndSeed(preset: WorldPreset, seed: string | number): void {
    currentPreset = preset;
    currentSeed = seed;
    sculptAndTintHorizon(currentPreset, currentSeed);
  }

  function updateByTick(
    tickIndex: number,
    celestialTime: number,
    qualityPreset: GraphicsQualityPreset,
    isGlobeMode: boolean
  ): void {
    group.visible = !isGlobeMode;
    if (isGlobeMode) return;

    const isPerf = qualityPreset === 'performance';
    signatureGroup.visible = !isPerf;

    const activeClouds = isPerf
      ? wld_CLOUD_SPRITE_COUNT_PERFORMANCE
      : wld_CLOUD_SPRITE_COUNT_CINEMA;
    const driftOffset = tickIndex * wld_CLOUD_DRIFT_PER_TICK;

    for (let i = 0; i < wld_CLOUD_SPRITE_COUNT_CINEMA; i++) {
      const sprite = cloudSprites[i];
      if (i >= activeClouds) {
        sprite.visible = false;
        continue;
      }
      sprite.visible = true;
      const meta = cloudMetas[i];
      const a = meta.baseAngle + driftOffset * (i % 2 === 0 ? 1 : 0.72);
      sprite.position.x = Math.cos(a) * meta.radius;
      sprite.position.z = Math.sin(a) * meta.radius;
    }

    // Zenith golden-white vs Dusk warm halo modulation on H3 dome
    const sunElev = Math.sin(celestialTime * Math.PI * 2);
    domeMat.opacity = THREE.MathUtils.clamp(0.28 + Math.max(0, sunElev) * 0.12, 0.24, 0.42);

    if (!isPerf) {
      const orbitPhase = tickIndex * wld_MOON_ORBIT_PER_TICK;
      const center = sisterPlanetSprite.position;
      moon1Mesh.position.set(
        center.x + Math.cos(orbitPhase) * 14,
        center.y + Math.sin(orbitPhase * 0.7) * 3.5,
        center.z + Math.sin(orbitPhase) * 14
      );
      moon2Mesh.position.set(
        center.x + Math.cos(-orbitPhase * 1.4 + 1.2) * 21,
        center.y - 3.0 + Math.cos(orbitPhase) * 2.2,
        center.z + Math.sin(-orbitPhase * 1.4 + 1.2) * 21
      );
    }
  }

  rebuildForThemeAndSeed(initialPreset, initialSeed);
  updateByTick(0, 0.35, 'cinema', false);

  function dispose(): void {
    crownGeo.dispose();
    crownMat.dispose();
    domeGeo.dispose();
    domeMat.dispose();
    sisterPlanetMat.dispose();
    moon1Geo.dispose();
    moon2Geo.dispose();
    moon1Mat.dispose();
    moon2Mat.dispose();
    cloudSprites.forEach((s) => s.material.dispose());
    softCloudTex.dispose();
  }

  return {
    group,
    rebuildForThemeAndSeed,
    updateByTick,
    dispose,
  };
}
