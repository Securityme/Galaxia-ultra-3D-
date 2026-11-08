/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Procedural Cosmic HDRI Environment (Vague C: PT-22)
 * Generates an equirectangular cosmic & planetary horizon scene for PMREMGenerator,
 * replacing the generic indoor studio reflection with an authentic orbital sky dome,
 * galactic band, solar zenith, and planetary rim bounce light.
 */

import * as THREE from 'three';
import { WorldPreset } from '../../contracts/schemas';

export const lgt_COSMIC_ENV_BLUR = 0.045;

export function buildCosmicEnvironmentScene(preset: WorldPreset): THREE.Scene {
  const envScene = new THREE.Scene();

  // 1. Sky / Ground gradient hemisphere shell
  const skyGeo = new THREE.SphereGeometry(40, 32, 16);
  const pos = skyGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const zenithCol = new THREE.Color('#dbeafe');
  const horizonCol = new THREE.Color(preset.atmosphereColor).lerp(new THREE.Color('#fffbeb'), 0.45);
  const nadirCol = new THREE.Color(preset.groundBaseColor).lerp(new THREE.Color('#94a3b8'), 0.4);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / 40;
    if (ny >= 0) {
      tmpCol.lerpColors(horizonCol, zenithCol, Math.pow(ny, 0.65));
    } else {
      tmpCol.lerpColors(horizonCol, nadirCol, Math.min(1, -ny * 1.4));
    }
    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }

  skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const skyMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(skyDome);

  // 2. Solar Key Disc for crisp metallic & water specular reflections
  const sunGeo = new THREE.SphereGeometry(4.2, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.set(22, 24, 16);
  envScene.add(sunMesh);

  // 3. Cool Rim / Nebula Fill Disc opposite the sun
  const rimGeo = new THREE.SphereGeometry(5.5, 16, 16);
  const rimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(preset.atmosphereColor).lerp(new THREE.Color('#e0f2fe'), 0.6),
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.set(-24, 14, -18);
  envScene.add(rimMesh);

  return envScene;
}
