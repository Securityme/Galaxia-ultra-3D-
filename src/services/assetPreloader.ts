/**
 * PAX HISTORIA 3D • Boot Asset & World Pre-computation Service
 * Uses the boot sequence to synthesize high-resolution procedural PBR textures,
 * continental world maps, and topography tables before entering the 3D scene.
 */

import { WorldPreset } from '../contracts/schemas';
import { configureTerrain } from '../core/terrainMath';
import {
  createSoftCircularParticleTexture,
  createTerrainBumpTexture,
  createPlateauAlbedoTexture,
  createPlanetWorldMapTexture,
  createPlanetCloudTexture,
} from '../three/textures/proceduralTextures';

export interface BootProgressStep {
  percent: number;
  stageTitle: string;
  detail: string;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 65));
  });
}

export async function runWorldBootPrecomputation(
  seed: string | number,
  reliefScale: number,
  preset: WorldPreset,
  onProgress: (step: BootProgressStep) => void
): Promise<void> {
  onProgress({
    percent: 12,
    stageTitle: 'Initialisation du Moteur Topographique',
    detail: `Amorçage PRNG Mulberry32 (${seed}) & bruit fractal 3D...`,
  });
  await nextFrame();
  configureTerrain(seed, reliefScale);

  onProgress({
    percent: 32,
    stageTitle: 'Synthèse des Micro-Reliefs & Strates',
    detail: 'Calcul de la carte de normales rocheuses et des shaders optiques...',
  });
  await nextFrame();
  createSoftCircularParticleTexture();
  createTerrainBumpTexture();

  onProgress({
    percent: 58,
    stageTitle: 'Génération de la Texture d’Albédo du Plateau',
    detail: `Colorimétrie lumineuse sRGB (${preset.name}) & courbes de niveau...`,
  });
  await nextFrame();
  createPlateauAlbedoTexture(preset, seed);

  onProgress({
    percent: 84,
    stageTitle: 'Cartographie du Globe Planétaire 3D',
    detail: 'Projection équirectangulaire des continents, océans et méridiens...',
  });
  await nextFrame();
  createPlanetWorldMapTexture(preset, seed);
  createPlanetCloudTexture(seed);

  onProgress({
    percent: 100,
    stageTitle: 'Atlas & Chroniques Prêts',
    detail: 'Synchronisation des systèmes de commandement terminée.',
  });
  await nextFrame();
}
