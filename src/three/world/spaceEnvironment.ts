/**
 * PAX HISTORIA 3D • Celestial Space Environment & Studio Lighting
 * Starfield with soft circular radial sprites (zero square points), subtle nebulae,
 * and balanced 3-point warm/cool illumination ensuring bright, realistic ground rendering.
 */

import * as THREE from 'three';
import {
  wld_STAR_COUNT,
  wld_ASTEROID_COUNT,
  wld_NEBULA_SPRITE_COUNT,
} from '../../config/constants';
import { WorldPreset } from '../../contracts/schemas';
import { createPRNG } from '../../core/prng';
import { AmbienceOverride } from '../../stores/worldStore';
import { createSoftCircularParticleTexture } from '../textures/proceduralTextures';

export interface SpaceEnvironment {
  group: THREE.Group;
  starfield: THREE.Points;
  nebulae: THREE.Group;
  asteroids: THREE.Group;
  dirLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
  lightTarget: THREE.Object3D;
  dispose: () => void;
}

function createNebulaTexture(colorHex: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.4, colorHex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSpaceEnvironment(
  _preset: WorldPreset,
  seed: string | number
): SpaceEnvironment {
  const group = new THREE.Group();
  const prng = createPRNG(`${seed}_space`);
  const circleSprite = createSoftCircularParticleTexture();

  // 1. Natural Celestial Starfield (soft circular points, natural stellar temperatures)
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(wld_STAR_COUNT * 3);
  const starColors = new Float32Array(wld_STAR_COUNT * 3);

  const naturalStellarPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#f8fafc'),
    new THREE.Color('#e0f2fe'),
    new THREE.Color('#fef3c7'),
  ];

  for (let i = 0; i < wld_STAR_COUNT; i++) {
    const radius = prng.range(190, 340);
    const theta = prng.range(0, Math.PI * 2);
    const phi = Math.acos(prng.range(-1, 1));

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const col = prng.pick(naturalStellarPalette);
    const brightness = prng.range(0.55, 1.0);
    starColors[i * 3] = col.r * brightness;
    starColors[i * 3 + 1] = col.g * brightness;
    starColors[i * 3 + 2] = col.b * brightness;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.1,
    map: circleSprite,
    alphaTest: 0.01,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const starfield = new THREE.Points(starGeo, starMat);
  group.add(starfield);

  // 2. Subtle Deep-Space Nebulae
  const nebulae = new THREE.Group();
  const nebulaTextures: THREE.Texture[] = [];
  const nebulaTints = [
    'rgba(56, 189, 248, 0.14)',
    'rgba(148, 163, 184, 0.12)',
    'rgba(212, 180, 131, 0.12)',
  ];

  for (let i = 0; i < wld_NEBULA_SPRITE_COUNT; i++) {
    const tint = prng.pick(nebulaTints);
    const tex = createNebulaTexture(tint);
    nebulaTextures.push(tex);

    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: prng.range(0.3, 0.55),
    });

    const sprite = new THREE.Sprite(mat);
    const dist = prng.range(150, 240);
    const angle = prng.range(0, Math.PI * 2);
    const height = prng.range(-40, 65);

    sprite.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);
    const scale = prng.range(95, 150);
    sprite.scale.set(scale, scale, 1);
    nebulae.add(sprite);
  }
  group.add(nebulae);

  // 3. Distant Planetary Satellites / Asteroids
  const asteroids = new THREE.Group();
  const asteroidGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const asteroidMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true,
  });

  for (let i = 0; i < wld_ASTEROID_COUNT; i++) {
    const mesh = new THREE.Mesh(asteroidGeo, asteroidMat);
    const dist = prng.range(52, 92);
    const angle = (i / wld_ASTEROID_COUNT) * Math.PI * 2 + prng.range(-0.2, 0.2);
    const y = prng.range(-18, -3);
    const s = prng.range(0.5, 1.6);

    mesh.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
    mesh.scale.set(s, s * prng.range(0.75, 1.25), s);
    mesh.userData = {
      orbitRadius: dist,
      orbitSpeed: prng.range(0.015, 0.04) * (prng.bool() ? 1 : -1),
      orbitAngle: angle,
      rotSpeedX: prng.range(0.08, 0.25),
      rotSpeedY: prng.range(0.08, 0.3),
    };
    asteroids.add(mesh);
  }
  group.add(asteroids);

  // 4. Balanced 3-Point Celestial & Studio Lighting (prevents dark/black terrain)
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(0, 0, 0);
  group.add(lightTarget);

  const dirLight = new THREE.DirectionalLight(0xfff9f0, 2.1);
  dirLight.position.set(34, 48, 28);
  dirLight.target = lightTarget;
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 140;
  dirLight.shadow.camera.left = -34;
  dirLight.shadow.camera.right = 34;
  dirLight.shadow.camera.top = 34;
  dirLight.shadow.camera.bottom = -34;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;
  group.add(dirLight);

  // Cool opposite fill light so shadowed slopes remain crisp and legible
  const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.85);
  fillLight.position.set(-32, 26, -24);
  group.add(fillLight);

  // Strong hemisphere sky/ground bounce light
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x64748b, 1.25);
  group.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.75);
  group.add(ambientLight);

  function dispose(): void {
    starGeo.dispose();
    starMat.dispose();
    asteroidGeo.dispose();
    asteroidMat.dispose();
    nebulae.children.forEach((c) => {
      if (c instanceof THREE.Sprite) {
        c.material.dispose();
      }
    });
    nebulaTextures.forEach((t) => t.dispose());
  }

  return {
    group,
    starfield,
    nebulae,
    asteroids,
    dirLight,
    fillLight,
    hemiLight,
    ambientLight,
    lightTarget,
    dispose,
  };
}

export function updateSpaceEnvironment(
  env: SpaceEnvironment,
  celestialTime: number,
  _preset: WorldPreset,
  ambience: AmbienceOverride | null,
  delta: number
): void {
  const angle = celestialTime * Math.PI * 2;
  const radius = 55;
  const height = Math.sin(angle) * 34 + 18;
  env.dirLight.position.set(
    Math.cos(angle) * radius,
    Math.max(height, 14),
    Math.sin(angle) * radius
  );

  const baseIntensity = ambience?.lightIntensity ?? 2.0;
  const dayFactor = Math.max(0.45, (Math.sin(angle) + 1) * 0.5);
  env.dirLight.intensity = baseIntensity * (0.7 + dayFactor * 0.35);

  if (ambience?.skyTint) {
    env.dirLight.color.set(ambience.skyTint);
  } else {
    env.dirLight.color.set(dayFactor < 0.5 ? '#fde68a' : '#fffaf0');
  }

  env.nebulae.rotation.y += delta * 0.005;

  env.asteroids.children.forEach((child) => {
    const data = child.userData as {
      orbitRadius: number;
      orbitSpeed: number;
      orbitAngle: number;
      rotSpeedX: number;
      rotSpeedY: number;
    };
    if (data) {
      data.orbitAngle += data.orbitSpeed * delta;
      child.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
      child.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
      child.rotation.x += data.rotSpeedX * delta;
      child.rotation.y += data.rotSpeedY * delta;
    }
  });
}
