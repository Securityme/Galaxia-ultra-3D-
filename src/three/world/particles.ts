import * as THREE from 'three';
import { createSoftCircularParticleTexture } from '../textures/proceduralTextures';

/**
 * Subtle natural atmospheric mist & golden dust motes above the plateau.
 * Uses soft circular radial sprite textures — strictly zero square or multicolored particles.
 */
export interface AtmosphericParticles {
  group: THREE.Group;
  update: (time: number, dt: number, density: number, accentHex: string) => void;
  dispose: () => void;
}

export function createAtmosphericParticles(maxCount = 90): AtmosphericParticles {
  const group = new THREE.Group();
  group.name = 'AtmosphericMistGroup';

  const positions = new Float32Array(maxCount * 3);
  const velocities = new Float32Array(maxCount * 3);
  const phases = new Float32Array(maxCount);

  for (let i = 0; i < maxCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 28;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 1.2 + Math.random() * 9.5;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    velocities[i * 3] = (Math.random() - 0.5) * 0.35;
    velocities[i * 3 + 1] = 0.08 + Math.random() * 0.18;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const softCircleMap = createSoftCircularParticleTexture();
  const mat = new THREE.PointsMaterial({
    color: 0xfff3d6,
    size: 0.55,
    map: softCircleMap,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  group.add(points);

  let targetColor = new THREE.Color(0xfff3d6);

  function update(time: number, dt: number, density: number, accentHex: string) {
    const activeCount = Math.floor(maxCount * Math.max(0, Math.min(1, density)));
    geo.setDrawRange(0, activeCount);

    // Keep warm natural tone slightly tinted by biome accent (no harsh neon confetti)
    targetColor.set(accentHex).lerp(new THREE.Color(0xfff5e0), 0.65);
    mat.color.lerp(targetColor, 0.05);

    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < activeCount; i++) {
      const idx = i * 3;
      arr[idx] += (velocities[idx] + Math.sin(time * 0.4 + phases[i]) * 0.12) * dt;
      arr[idx + 1] += velocities[idx + 1] * dt;
      arr[idx + 2] += (velocities[idx + 2] + Math.cos(time * 0.35 + phases[i]) * 0.12) * dt;

      if (arr[idx + 1] > 12.5) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 27;
        arr[idx] = Math.cos(angle) * radius;
        arr[idx + 1] = 1.0;
        arr[idx + 2] = Math.sin(angle) * radius;
      }
    }

    posAttr.needsUpdate = true;
  }

  function dispose() {
    geo.dispose();
    mat.dispose();
  }

  return { group, update, dispose };
}
