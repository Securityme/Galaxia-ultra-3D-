/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Blender-Grade Post-Processing Pipeline (Vague A: PT-17, PT-18, PT-19, PT-31)
 * Implements:
 * - PT-17: EffectComposer with RenderPass + OutputPass, single-boolean bypass & SwiftShader fallback
 * - PT-18: Controlled UnrealBloomPass (high threshold so only true emissives bloom, never terrain albedo)
 * - PT-19: Subtle Cinematic Vignette & Photographic Grain ShaderPass (gated by prefers-reduced-motion)
 * - PT-31: Quality Presets ('cinema' | 'balanced' | 'performance')
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type GraphicsQualityPreset = 'cinema' | 'balanced' | 'performance';

export const GRAPHICS_PRESET_SPECS: Record<
  GraphicsQualityPreset,
  { label: string; subtitle: string }
> = {
  cinema: {
    label: 'Cinéma (Blender)',
    subtitle: 'Bloom sélectif + Vignette + Grain photo + PBR Sobel',
  },
  balanced: {
    label: 'Équilibré',
    subtitle: 'Bloom maîtrisé demi-résolution + PBR Sobel',
  },
  performance: {
    label: 'Performance',
    subtitle: 'Rendu direct rapide sans post-processing',
  },
};

export const fx_BLOOM_THRESHOLD_CINEMA = 0.82;
export const fx_BLOOM_STRENGTH_CINEMA = 0.36;
export const fx_BLOOM_RADIUS_CINEMA = 0.42;

export const fx_BLOOM_THRESHOLD_BALANCED = 0.86;
export const fx_BLOOM_STRENGTH_BALANCED = 0.26;
export const fx_BLOOM_RADIUS_BALANCED = 0.32;

export const fx_VIGNETTE_INTENSITY = 0.22;
export const fx_GRAIN_INTENSITY = 0.018;

const CinematicAtmosphereShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: fx_VIGNETTE_INTENSITY },
    uGrain: { value: fx_GRAIN_INTENSITY },
    uTime: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3  = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - vec2(0.5);
      float distSq = dot(centered, centered);
      float vig = 1.0 - distSq * uVignette * 2.1;

      float noise = (hash12(vUv * 512.0 + vec2(uTime * 0.7, uTime * 0.3)) - 0.5) * uGrain;
      vec3 finalColor = clamp(texel.rgb * vig + vec3(noise), 0.0, 1.0);
      gl_FragColor = vec4(finalColor, texel.a);
    }
  `,
};

export interface BlenderPostPipeline {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  atmospherePass: ShaderPass;
  isEnabled: () => boolean;
  setQualityPreset: (preset: GraphicsQualityPreset, reducedMotion: boolean) => void;
  resize: (width: number, height: number) => void;
  render: (elapsedTime: number) => void;
  dispose: () => void;
}

export function createBlenderPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  isSoftwareGl: boolean
): BlenderPostPipeline {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, Math.floor(width * 0.5)), Math.max(1, Math.floor(height * 0.5))),
    fx_BLOOM_STRENGTH_CINEMA,
    fx_BLOOM_RADIUS_CINEMA,
    fx_BLOOM_THRESHOLD_CINEMA
  );
  composer.addPass(bloomPass);

  const atmospherePass = new ShaderPass(CinematicAtmosphereShader);
  composer.addPass(atmospherePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  let currentPreset: GraphicsQualityPreset = isSoftwareGl ? 'performance' : 'cinema';
  let currentReducedMotion = false;

  function applySettings(): void {
    if (isSoftwareGl || currentPreset === 'performance') {
      bloomPass.enabled = false;
      atmospherePass.enabled = false;
      return;
    }

    if (currentPreset === 'cinema') {
      bloomPass.enabled = true;
      bloomPass.threshold = fx_BLOOM_THRESHOLD_CINEMA;
      bloomPass.strength = fx_BLOOM_STRENGTH_CINEMA;
      bloomPass.radius = fx_BLOOM_RADIUS_CINEMA;
      atmospherePass.enabled = true;
      atmospherePass.uniforms.uVignette.value = fx_VIGNETTE_INTENSITY;
      atmospherePass.uniforms.uGrain.value = currentReducedMotion ? 0.0 : fx_GRAIN_INTENSITY;
    } else {
      bloomPass.enabled = true;
      bloomPass.threshold = fx_BLOOM_THRESHOLD_BALANCED;
      bloomPass.strength = fx_BLOOM_STRENGTH_BALANCED;
      bloomPass.radius = fx_BLOOM_RADIUS_BALANCED;
      atmospherePass.enabled = false;
    }
  }

  applySettings();

  function setQualityPreset(preset: GraphicsQualityPreset, reducedMotion: boolean): void {
    if (preset === currentPreset && reducedMotion === currentReducedMotion) return;
    currentPreset = preset;
    currentReducedMotion = reducedMotion;
    applySettings();
  }

  function isEnabled(): boolean {
    return !isSoftwareGl && currentPreset !== 'performance';
  }

  function resize(w: number, h: number): void {
    composer.setSize(w, h);
    bloomPass.resolution.set(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
  }

  function render(elapsedTime: number): void {
    if (!isEnabled()) {
      renderer.render(scene, camera);
      return;
    }
    if (atmospherePass.enabled && !currentReducedMotion) {
      atmospherePass.uniforms.uTime.value = elapsedTime % 100.0;
    }
    composer.render();
  }

  function dispose(): void {
    bloomPass.dispose();
    outputPass.dispose();
    composer.dispose();
  }

  return {
    composer,
    bloomPass,
    atmospherePass,
    isEnabled,
    setQualityPreset,
    resize,
    render,
    dispose,
  };
}
