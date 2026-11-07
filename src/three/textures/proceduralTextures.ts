/**
 * PAX HISTORIA 3D • High-Resolution Procedural PBR Texture Engine
 * Synthesizes luminous sRGB albedo maps with:
 * - Golden sandy beaches & coastal foam transitions
 * - Horizontal Micro-Climate Biome tinting (Sylvan Grove, Amber Steppe, Alpine Massif, Coastal Lagoon)
 * - Paved Imperial Urban District flagstones & forum plazas
 * - High rocky mountain ridges & eternal snow peaks
 */

import * as THREE from 'three';
import { WorldPreset } from '../../contracts/schemas';
import {
  getLocalReliefElevation,
  getPlanetSphereElevation,
  getPlateauMicroClimateZone,
} from '../../core/terrainMath';
import { createNoise2D } from '../../core/noise';
import { wld_PLATEAU_WIDTH, wld_PLATEAU_LENGTH } from '../../config/constants';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Soft circular radial glow sprite for stars and atmospheric motes.
 * Eliminates harsh square OpenGL points.
 */
export function createSoftCircularParticleTexture(): THREE.CanvasTexture {
  const cacheKey = 'soft_circle_sprite';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.28, 'rgba(255, 252, 245, 0.85)');
    grad.addColorStop(0.65, 'rgba(220, 235, 255, 0.25)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Generates a crisp cartographic label sprite for a Plateau Zone directly on the 3D Planet Globe.
 */
export function createZoneBannerSpriteTexture(
  zoneName: string,
  regionCode: string,
  accentHex: string
): THREE.CanvasTexture {
  const cacheKey = `zone_banner_${zoneName}_${accentHex}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(9, 17, 32, 0.88)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;

    const r = 24;
    const x = 16;
    const y = 14;
    const w = width - 32;
    const h = height - 28;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'center';
    ctx.fillText(`◆ ${regionCode} ◆`, width / 2, 48);

    ctx.font = '600 28px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#fffbeb';
    ctx.fillText(zoneName, width / 2, 88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Generates a luminous 512x512 Albedo + Micro-Climate Biome + Urban District Texture for the Plateau.
 */
export function createPlateauAlbedoTexture(
  preset: WorldPreset,
  seed: string | number
): THREE.CanvasTexture {
  const cacheKey = `plateau_albedo_v4_${preset.id}_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const cLow = new THREE.Color(preset.groundLowColor);
    const cBase = new THREE.Color(preset.groundBaseColor);
    const cAccent = new THREE.Color(preset.groundAccentColor);
    const cPeak = new THREE.Color(preset.groundPeakColor);
    const cShallow = new THREE.Color(preset.oceanShallowColor);

    const cSandDry = new THREE.Color('#f6d799');
    const cSandWet = new THREE.Color('#d9b372');
    const cUrbanMarble = new THREE.Color('#dfd7c8');
    const cUrbanGold = new THREE.Color('#c9b38c');
    const cMountainRock = new THREE.Color('#64748b');
    const cSnowPure = new THREE.Color('#f8fafc');
    const cAmberTint = new THREE.Color('#d97706');
    const cTemp = new THREE.Color();

    const detailNoise = createNoise2D(`${seed}_albedo_detail`);

    for (let py = 0; py < size; py++) {
      const wz = (py / size - 0.5) * wld_PLATEAU_LENGTH;
      for (let px = 0; px < size; px++) {
        const wx = (px / size - 0.5) * wld_PLATEAU_WIDTH;
        const h = getLocalReliefElevation(wx, wz);
        const zone = getPlateauMicroClimateZone(wx, wz);
        const micro = detailNoise(wx * 0.35, wz * 0.35) * 0.055;

        // 1. Vertical Elevation Base Color (Lagoon -> Sandy Beach -> Plain -> Mountain -> Snow)
        if (h < -0.02) {
          // Underwater shallow lagoon & white coastal foam line
          const foam = h > -0.08 ? 0.28 : 0.0;
          cTemp.lerpColors(cShallow, cSandWet, Math.max(0, (h + 0.55) / 0.53));
          if (foam > 0) cTemp.lerp(cSnowPure, foam);
        } else if (h < 0.24) {
          // Golden sandy beach shoreline
          const t = (h + 0.02) / 0.26;
          cTemp.lerpColors(cSandWet, cSandDry, Math.min(1, t * 1.4));
          if (t > 0.65) {
            cTemp.lerp(cLow, (t - 0.65) / 0.35);
          }
        } else if (h < 1.25) {
          // Fertile plains & horizontal micro-climate biome tint
          const t = (h - 0.24) / 1.01;
          cTemp.lerpColors(cBase, cAccent, Math.max(0, Math.min(1, t)));
          if (zone.id === 'amber_steppe') {
            cTemp.lerp(cAmberTint, 0.26);
          } else if (zone.id === 'coastal_lagoon') {
            cTemp.lerp(cSandDry, 0.25);
          }
        } else if (h < 2.25) {
          // Steep rocky mountain slopes
          const t = (h - 1.25) / 1.0;
          cTemp.lerpColors(cAccent, cMountainRock, Math.min(1, t));
        } else {
          // High alpine snow-capped peaks
          const t = Math.min(1, (h - 2.25) / 1.1);
          cTemp.lerpColors(cPeak, cSnowPure, t);
        }

        // 2. Blend Paved Urban Forum & Imperial Causeway Flagstones
        if (zone.urbanWeight > 0.15 && h > 0.05) {
          const gridPattern =
            (Math.abs(Math.floor(wx * 1.5)) + Math.abs(Math.floor(wz * 1.5))) % 2 === 0;
          const paverColor = gridPattern ? cUrbanMarble : cUrbanGold;
          cTemp.lerp(paverColor, zone.urbanWeight * 0.72);
        }

        // Subtle cartographic contour lines
        const contourMod = Math.abs((((h * 3.0) % 1) + 1) % 1 - 0.5);
        const isContour = contourMod < 0.036 && h > 0.08;
        const contourBoost = isContour ? 0.89 : 1.0;

        const r = Math.min(
          255,
          Math.max(48, Math.floor((cTemp.r + micro) * 255 * contourBoost))
        );
        const g = Math.min(
          255,
          Math.max(50, Math.floor((cTemp.g + micro) * 255 * contourBoost))
        );
        const b = Math.min(
          255,
          Math.max(54, Math.floor((cTemp.b + micro) * 255 * contourBoost))
        );

        const idx = (py * size + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Subtle radial Forum inlaid rings in the center
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.075, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.115, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates a fine-grained rocky bump map for realistic grazing-angle relief.
 */
export function createTerrainBumpTexture(): THREE.CanvasTexture {
  const cacheKey = 'terrain_bump_512';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const noise = createNoise2D('bump_detail_seed');

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = noise.fractal(x * 0.06, y * 0.06, 3, 0.5, 2.0);
        const val = Math.max(0, Math.min(255, Math.floor(128 + n * 95)));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates an equirectangular World Map Texture (1024x512) for the 3D Planetary Globe.
 */
export function createPlanetWorldMapTexture(
  preset: WorldPreset,
  seed: string | number
): THREE.CanvasTexture {
  const cacheKey = `planet_worldmap_${preset.id}_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const cOceanDeep = new THREE.Color(preset.oceanDeepColor);
    const cOceanShallow = new THREE.Color(preset.oceanShallowColor);
    const cCoast = new THREE.Color('#f6d799');
    const cPlain = new THREE.Color(preset.groundBaseColor);
    const cHighland = new THREE.Color(preset.groundAccentColor);
    const cPeak = new THREE.Color(preset.groundPeakColor);
    const cPolar = new THREE.Color('#f8fafc');
    const cOut = new THREE.Color();

    for (let py = 0; py < height; py++) {
      const v = py / height;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const latitudeAbs = Math.abs(v - 0.5) * 2.0;

      for (let px = 0; px < width; px++) {
        const u = px / width;
        const theta = u * Math.PI * 2.0;

        const nx = -sinPhi * Math.cos(theta);
        const ny = cosPhi;
        const nz = sinPhi * Math.sin(theta);

        const elev = getPlanetSphereElevation(nx, ny, nz);

        if (elev < -0.18) {
          const t = Math.max(0, Math.min(1, (elev + 0.85) / 0.67));
          cOut.lerpColors(cOceanDeep, cOceanShallow, t * 0.65);
        } else if (elev < 0.0) {
          const t = (elev + 0.18) / 0.18;
          cOut.lerpColors(cOceanShallow, cCoast, t * 0.5);
        } else if (elev < 0.09) {
          const t = elev / 0.09;
          cOut.lerpColors(cCoast, cPlain, t);
        } else if (elev < 0.48) {
          const t = (elev - 0.09) / 0.39;
          cOut.lerpColors(cPlain, cHighland, t);
        } else {
          const t = Math.min(1, (elev - 0.48) / 0.55);
          cOut.lerpColors(cHighland, cPeak, t);
        }

        if (latitudeAbs > 0.82) {
          const iceT = Math.min(1, (latitudeAbs - 0.82) / 0.14);
          cOut.lerp(cPolar, iceT * 0.85);
        }

        const isCoastline = Math.abs(elev) < 0.014;
        const boost = isCoastline ? 1.15 : 1.0;

        const idx = (py * width + px) * 4;
        data[idx] = Math.min(255, Math.floor(cOut.r * 255 * boost));
        data[idx + 1] = Math.min(255, Math.floor(cOut.g * 255 * boost));
        data[idx + 2] = Math.min(255, Math.floor(cOut.b * 255 * boost));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const lonSteps = 12;
    const latSteps = 6;
    for (let i = 1; i < lonSteps; i++) {
      const x = (i / lonSteps) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let j = 1; j < latSteps; j++) {
      const y = (j / latSteps) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates a soft translucent planetary cloud layer texture (512x256).
 */
export function createPlanetCloudTexture(seed: string | number): THREE.CanvasTexture {
  const cacheKey = `planet_clouds_${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const cloudNoise = createNoise2D(`${seed}_clouds`);

    for (let py = 0; py < height; py++) {
      const phi = (py / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let px = 0; px < width; px++) {
        const theta = (px / width) * Math.PI * 2.0;
        const nx = -sinPhi * Math.cos(theta);
        const ny = cosPhi;
        const nz = sinPhi * Math.sin(theta);

        const n = cloudNoise.fractal3D(nx * 2.6, ny * 3.4, nz * 2.6, 4, 0.5, 2.0);
        const alpha = Math.max(0, Math.min(1, (n - 0.08) * 2.2));

        const idx = (py * width + px) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 175);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}
