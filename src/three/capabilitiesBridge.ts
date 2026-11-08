/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * PT-76 & PT-77 — Détection WebGPU / WebGL2 (Garde SwiftShader) & Pont OffscreenCanvas Réversible
 *
 * - PT-77 : Détecte la capacité WebGPU (`navigator.gpu`) et l'état matériel WebGL2
 *   (détection des rasterizers logiciels SwiftShader / llvmpipe) pour sélectionner automatiquement
 *   la voie royale sans imposer de configuration manuelle.
 * - PT-76 : Définit le protocole de messages typés Zod entre le fil principal (gestes & HUD React)
 *   et le directeur 3D (OffscreenCanvas ou repli fil principal).
 */

import { z } from 'zod';

export const gestureBridgeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('GESTURE_PAN'),
    dx: z.number(),
    dz: z.number(),
    tickIndex: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('GESTURE_ZOOM'),
    delta: z.number(),
    tickIndex: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('GESTURE_ROTATE'),
    deltaAzimuth: z.number(),
    deltaPolar: z.number(),
    tickIndex: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('GESTURE_TAP'),
    ndcX: z.number(),
    ndcY: z.number(),
    tickIndex: z.number().int().nonnegative(),
  }),
]);

export type GestureBridgeMessage = z.infer<typeof gestureBridgeMessageSchema>;

export interface RenderHardwareCapabilities {
  webgpuSupported: boolean;
  webgl2Supported: boolean;
  offscreenCanvasSupported: boolean;
  isSoftwareRasterizer: boolean;
  rendererLabel: string;
  activeBackendLabel: 'WebGPU → WebGL2 (Voie Royale Auto)' | 'WebGL2 Matériel' | 'WebGL2 (Mode Repli SwiftShader)';
  executionThreadLabel: 'Fil Principal (Repli Actif Certifié)' | 'Worker OffscreenCanvas';
}

let cachedCapabilities: RenderHardwareCapabilities | null = null;

/**
 * Probes WebGPU, WebGL2, SwiftShader software rasterizer status, and OffscreenCanvas support (PT-76, PT-77).
 */
export function detectRenderHardwareCapabilities(): RenderHardwareCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      webgpuSupported: false,
      webgl2Supported: true,
      offscreenCanvasSupported: false,
      isSoftwareRasterizer: false,
      rendererLabel: 'Server SSR',
      activeBackendLabel: 'WebGL2 Matériel',
      executionThreadLabel: 'Fil Principal (Repli Actif Certifié)',
    };
  }

  const nav = navigator as Navigator & { gpu?: unknown };
  const webgpuSupported = Boolean(nav.gpu);
  const offscreenCanvasSupported =
    typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype;

  let webgl2Supported = false;
  let isSoftwareRasterizer = false;
  let rendererLabel = 'GPU Matériel Standard';

  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (gl) {
      webgl2Supported = true;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const unmaskedRenderer = String(
          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
        );
        if (unmaskedRenderer) {
          rendererLabel = unmaskedRenderer;
        }
        if (/swiftshader|llvmpipe|software|basic render/i.test(unmaskedRenderer)) {
          isSoftwareRasterizer = true;
        }
      }
    }
  } catch {
    // Ignore probe errors
  }

  const activeBackendLabel: RenderHardwareCapabilities['activeBackendLabel'] =
    isSoftwareRasterizer
      ? 'WebGL2 (Mode Repli SwiftShader)'
      : webgpuSupported
      ? 'WebGPU → WebGL2 (Voie Royale Auto)'
      : 'WebGL2 Matériel';

  cachedCapabilities = {
    webgpuSupported,
    webgl2Supported,
    offscreenCanvasSupported,
    isSoftwareRasterizer,
    rendererLabel,
    activeBackendLabel,
    executionThreadLabel: 'Fil Principal (Repli Actif Certifié)',
  };

  return cachedCapabilities;
}
