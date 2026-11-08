/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-49: Directeur de Qualité Adaptatif
 * Mesure le frametime (moyenne glissante), ajuste le pixelRatio dynamiquement dans les bornes
 * du preset (Cinéma / Équilibré / Performance), pilote les distances LOD et expose les plafonds
 * explicites par preset (draw calls, triangles, mémoire de textures).
 * Ne connaît ni le store ni le gameplay — lit uniquement des budgets.
 */

import { GraphicsQualityPreset } from '../postfx/blenderComposer';

export interface QualityPresetBudget {
  preset: GraphicsQualityPreset;
  minPixelRatio: number;
  maxPixelRatio: number;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMemoryBytes: number;
  forestLodDistance: number;
  targetFrameTimeMs: number;
}

export const QUALITY_PRESET_BUDGETS: Record<GraphicsQualityPreset, QualityPresetBudget> = {
  cinema: {
    preset: 'cinema',
    minPixelRatio: 1.25,
    maxPixelRatio: 2.0,
    maxDrawCalls: 260,
    maxTriangles: 220000,
    maxTextureMemoryBytes: 48 * 1024 * 1024,
    forestLodDistance: 68,
    targetFrameTimeMs: 16.6,
  },
  balanced: {
    preset: 'balanced',
    minPixelRatio: 1.0,
    maxPixelRatio: 1.5,
    maxDrawCalls: 180,
    maxTriangles: 145000,
    maxTextureMemoryBytes: 32 * 1024 * 1024,
    forestLodDistance: 52,
    targetFrameTimeMs: 16.6,
  },
  performance: {
    preset: 'performance',
    minPixelRatio: 0.85,
    maxPixelRatio: 1.0,
    maxDrawCalls: 110,
    maxTriangles: 85000,
    maxTextureMemoryBytes: 18 * 1024 * 1024,
    forestLodDistance: 36,
    targetFrameTimeMs: 16.6,
  },
};

export interface QualityDirectorSnapshot {
  rollingFrameTimeMs: number;
  rollingFps: number;
  recommendedPixelRatio: number;
  recommendedLodDistance: number;
  budgetExceeded: boolean;
  budget: QualityPresetBudget;
}

export interface QualityDirector {
  setPreset: (preset: GraphicsQualityPreset, isSoftwareGl: boolean) => void;
  recordFrame: (dtSeconds: number, currentDrawCalls: number, currentTriangles: number) => QualityDirectorSnapshot;
  getBudget: () => QualityPresetBudget;
}

export function createQualityDirector(
  initialPreset: GraphicsQualityPreset = 'cinema',
  initialSoftwareGl = false
): QualityDirector {
  let activePreset: GraphicsQualityPreset = initialPreset;
  let isSoftwareGl = initialSoftwareGl;
  const windowSize = 30;
  const samples: number[] = [];
  let currentPixelRatio = initialSoftwareGl ? 1.0 : 1.5;

  function getDeviceMaxRatio(budget: QualityPresetBudget): number {
    if (isSoftwareGl) return 1.0;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.min(dpr, budget.maxPixelRatio);
  }

  function setPreset(preset: GraphicsQualityPreset, softwareGl: boolean): void {
    activePreset = preset;
    isSoftwareGl = softwareGl;
    const budget = QUALITY_PRESET_BUDGETS[activePreset];
    currentPixelRatio = getDeviceMaxRatio(budget);
  }

  function recordFrame(
    dtSeconds: number,
    currentDrawCalls: number,
    currentTriangles: number
  ): QualityDirectorSnapshot {
    const frameMs = Math.max(1.0, Math.min(100.0, dtSeconds * 1000));
    samples.push(frameMs);
    if (samples.length > windowSize) {
      samples.shift();
    }

    const sum = samples.reduce((acc, v) => acc + v, 0);
    const rollingFrameTimeMs = sum / Math.max(1, samples.length);
    const rollingFps = Math.min(120, Math.round(1000 / Math.max(1, rollingFrameTimeMs)));

    const budget = QUALITY_PRESET_BUDGETS[activePreset];
    const maxAllowedRatio = getDeviceMaxRatio(budget);

    // Dynamic resolution scaling within preset bounds
    if (!isSoftwareGl && samples.length >= 15) {
      if (rollingFrameTimeMs > budget.targetFrameTimeMs * 1.35) {
        currentPixelRatio = Math.max(budget.minPixelRatio, currentPixelRatio - 0.1);
      } else if (rollingFrameTimeMs < budget.targetFrameTimeMs * 0.85) {
        currentPixelRatio = Math.min(maxAllowedRatio, currentPixelRatio + 0.05);
      }
    } else if (isSoftwareGl) {
      currentPixelRatio = 1.0;
    }

    const budgetExceeded =
      currentDrawCalls > budget.maxDrawCalls || currentTriangles > budget.maxTriangles;

    return {
      rollingFrameTimeMs: Number(rollingFrameTimeMs.toFixed(1)),
      rollingFps,
      recommendedPixelRatio: Number(currentPixelRatio.toFixed(2)),
      recommendedLodDistance: budget.forestLodDistance,
      budgetExceeded,
      budget,
    };
  }

  function getBudget(): QualityPresetBudget {
    return QUALITY_PRESET_BUDGETS[activePreset];
  }

  return {
    setPreset,
    recordFrame,
    getBudget,
  };
}
