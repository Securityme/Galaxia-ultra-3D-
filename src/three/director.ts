/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Master 3D WebGL Director (Blender-Grade Pipeline v6.0.0)
 * Integrates:
 * - Vague A (PT-17, PT-18, PT-19): EffectComposer + Controlled UnrealBloomPass + Vignette/Grain ShaderPass
 * - Vague B (PT-20, PT-21): Sobel Normal Maps, Biome Roughness Maps & Entity PBR Textures
 * - Vague C (PT-22, PT-23, PT-24): Cosmic Equirectangular HDRI via PMREMGenerator & Deterministic Solar Rig
 * - Vague F (PT-31, PT-32): Quality Presets (Cinéma / Équilibré / Performance), prefers-reduced-motion gating & GPU Perf Telemetry
 */

import * as THREE from 'three';
import {
  BuildingType,
  CameraMode,
  WeatherType,
  WorldViewMode,
  cam_GESTURE_PAN_SENSITIVITY,
  cam_GESTURE_PINCH_SENSITIVITY,
  cam_GESTURE_ROTATE_SENSITIVITY,
  cam_GESTURE_TAP_THRESHOLD,
  cam_GESTURE_TWIST_SENSITIVITY,
  cam_MODE_ARRIVAL,
  cam_MODE_GLOBE,
  cam_MODE_ORBIT,
  evt_TICK_INTERVAL_SEC,
  view_MODE_PLANET_3D,
  view_MODE_PLATEAU,
  wld_CELESTIAL_CYCLE_RATE,
  wtr_CALM,
} from '../config/constants';
import { PlacedBuilding, PlacedNpc, WorldPreset } from '../contracts/schemas';
import { DEFAULT_PRESET } from '../config/presets';
import { DEFAULT_GAME_CONFIG } from '../config/gameDefaults';
import { CustomNpcAssignment } from '../config/rpgCatalogs';
import {
  AmbienceOverride,
  GraphicsQualityMode,
  RenderPerfMetrics,
} from '../stores/worldStore';
import { configureTerrain } from '../core/terrainMath';
import {
  createSpaceEnvironment,
  updateSpaceEnvironment,
  SpaceEnvironment,
} from './world/spaceEnvironment';
import { createPlateauTerrain, PlateauTerrain } from './world/plateauTerrain';
import { createPlanetGlobe, PlanetGlobe } from './world/planetGlobe';
import { createArrivalZone3D, ArrivalZone3D } from './world/arrivalZone';
import { createAtmosphericParticles, AtmosphericParticles } from './world/particles';
import { createWeatherSystem, WeatherSystemManager } from './world/weatherSystem';
import { createBuildingsManager, BuildingsManager } from './entities/buildings';
import { createNpcManager, NpcManager } from './entities/npcs';
import { createArchitectHologramManager, ArchitectHologramManager } from './world/architectHologram';
import { createCameraRig, CameraRig } from './camera/cameraRig';
import {
  BlenderPostPipeline,
  createBlenderPostPipeline,
} from './postfx/blenderComposer';
import {
  buildCosmicEnvironmentScene,
  lgt_COSMIC_ENV_BLUR,
} from './lighting/cosmicEnvironment';
import {
  createQualityDirector,
  QualityDirector,
} from './quality/qualityDirector';

export interface SceneDirectorState {
  isBootScreenOpen: boolean;
  seed: string;
  activeZoneId: string;
  reliefScale: number;
  preset: WorldPreset;
  worldViewMode: WorldViewMode;
  cameraMode: CameraMode;
  celestialTime: number;
  autoCycleTime: boolean;
  ambience: AmbienceOverride | null;
  buildings: PlacedBuilding[];
  npcs: PlacedNpc[];
  npcAssignments: Record<string, CustomNpcAssignment>;
  selectedNpcId: string | null;
  selectedBuildingId: string | null;
  isArrivalZoneSelected: boolean;
  architectSandboxType?: BuildingType | null;
  graphicsQualityPreset: GraphicsQualityMode;
  reducedMotion: boolean;
}

export interface SceneDirectorCallbacks {
  onSelectNpc: (id: string | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onSelectArrivalZone: (selected: boolean) => void;
  onSelectPlanetZone: (zoneId: string | null) => void;
  onUpdatePerfMetrics?: (metrics: RenderPerfMetrics) => void;
  onUpdateWeather?: (weather: WeatherType) => void;
  onChangeCameraMode?: (mode: CameraMode) => void;
  onChangeWorldViewMode?: (mode: WorldViewMode) => void;
}

export class SceneDirector {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private pmremGenerator: THREE.PMREMGenerator;
  private envMapRT: THREE.WebGLRenderTarget;
  private postPipeline: BlenderPostPipeline;

  private spaceEnv: SpaceEnvironment;
  private plateauTerrain: PlateauTerrain;
  private arrivalZone: ArrivalZone3D;
  private planetGlobe: PlanetGlobe;
  private particles: AtmosphericParticles;
  private weatherSystem: WeatherSystemManager;
  private buildingsManager: BuildingsManager;
  private npcManager: NpcManager;
  private architectHologram: ArchitectHologramManager;
  private cameraRig: CameraRig;
  private qualityDirector: QualityDirector;

  private callbacks: SceneDirectorCallbacks;
  private state: SceneDirectorState | null = null;
  private lastNotifiedWeather: WeatherType | null = null;

  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private isPaused = false;
  private isSoftwareGl = false;

  private raycaster = new THREE.Raycaster();
  private pointerDownPos = { x: 0, y: 0 };
  private isDragging = false;
  private dragButton = 0;
  private lastPointer = { x: 0, y: 0 };

  private activeTouchCount = 0;
  private lastSingleTouch = { x: 0, y: 0 };
  private lastTwoTouchDist: number | null = null;
  private lastTwoTouchAngle: number | null = null;
  private lastTwoTouchMid: { x: number; y: number } | null = null;

  private lastPlateauKey = '';
  private lastGlobeKey = '';
  private lastEnvPresetId = '';
  private perfSampleAccumSec = 0;
  private perfFrameCount = 0;
  private fixedTickAccumSec = 0;
  private tickIndex = 0;

  constructor(container: HTMLElement, callbacks: SceneDirectorCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : '';
    this.isSoftwareGl = /SwiftShader|Software|llvmpipe/i.test(rendererStr);

    this.qualityDirector = createQualityDirector('cinema', this.isSoftwareGl);

    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.name = 'GalaxiaUltra_BioDomeScene';
    this.scene.background = new THREE.Color(DEFAULT_PRESET.fogColor);
    this.scene.fog = new THREE.FogExp2(DEFAULT_PRESET.fogColor, 0.0028);

    // PT-22: Cosmic Equirectangular HDRI Environment via PMREMGenerator
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const cosmicEnvScene = buildCosmicEnvironmentScene(DEFAULT_PRESET);
    this.envMapRT = this.pmremGenerator.fromScene(cosmicEnvScene, lgt_COSMIC_ENV_BLUR);
    this.scene.environment = this.envMapRT.texture;
    this.scene.environmentIntensity = 0.82;
    this.lastEnvPresetId = DEFAULT_PRESET.id;

    configureTerrain(DEFAULT_GAME_CONFIG.seed, DEFAULT_GAME_CONFIG.reliefScale);

    this.spaceEnv = createSpaceEnvironment(DEFAULT_PRESET, DEFAULT_GAME_CONFIG.seed);
    this.scene.add(this.spaceEnv.group);

    this.plateauTerrain = createPlateauTerrain(
      DEFAULT_PRESET,
      DEFAULT_GAME_CONFIG.seed,
      this.isSoftwareGl
    );
    this.scene.add(this.plateauTerrain.group);

    this.arrivalZone = createArrivalZone3D();
    this.scene.add(this.arrivalZone.group);

    this.planetGlobe = createPlanetGlobe(DEFAULT_PRESET, DEFAULT_GAME_CONFIG.seed);
    this.planetGlobe.group.visible = true;
    this.scene.add(this.planetGlobe.group);

    this.buildingsManager = createBuildingsManager();
    this.scene.add(this.buildingsManager.group);

    this.npcManager = createNpcManager();
    this.scene.add(this.npcManager.group);

    this.particles = createAtmosphericParticles(90);
    this.scene.add(this.particles.group);

    this.weatherSystem = createWeatherSystem();
    this.scene.add(this.weatherSystem.group);

    this.architectHologram = createArchitectHologramManager();
    this.scene.add(this.architectHologram.group);

    this.cameraRig = createCameraRig(width, height);

    // PT-17, PT-18, PT-19: Blender-grade Post-Processing Composer
    this.postPipeline = createBlenderPostPipeline(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
      width,
      height,
      this.isSoftwareGl
    );

    this.bindEvents();
    this.startLoop();
  }

  public syncState(next: SceneDirectorState) {
    const prev = this.state;
    this.state = next;

    // PT-31, PT-32, PT-49 & Lot Alpha (PT-25 / PT-27): Sync Quality Preset & Reduced Motion
    this.qualityDirector.setPreset(next.graphicsQualityPreset, this.isSoftwareGl);
    this.postPipeline.setQualityPreset(next.graphicsQualityPreset, next.reducedMotion);
    this.plateauTerrain.setQualityPreset(next.graphicsQualityPreset, next.reducedMotion);
    if (!this.isSoftwareGl) {
      const targetRatio =
        next.graphicsQualityPreset === 'performance'
          ? 1
          : next.graphicsQualityPreset === 'balanced'
          ? Math.min(window.devicePixelRatio || 1, 1.5)
          : Math.min(window.devicePixelRatio || 1, 2);
      if (this.renderer.getPixelRatio() !== targetRatio) {
        this.renderer.setPixelRatio(targetRatio);
      }
    }

    // PT-22: Refresh Cosmic HDRI when planetary biome preset changes
    if (next.preset.id !== this.lastEnvPresetId) {
      this.lastEnvPresetId = next.preset.id;
      const nextCosmicScene = buildCosmicEnvironmentScene(next.preset);
      const nextRT = this.pmremGenerator.fromScene(nextCosmicScene, lgt_COSMIC_ENV_BLUR);
      this.envMapRT.dispose();
      this.envMapRT = nextRT;
      this.scene.environment = this.envMapRT.texture;
    }

    const globeKey = `${next.seed}_${next.preset.id}`;
    if (globeKey !== this.lastGlobeKey) {
      this.lastGlobeKey = globeKey;
      configureTerrain(next.seed, next.reliefScale);
      this.planetGlobe.rebuildPlanet(next.preset, next.seed);
    }

    const zoneCompositeSeed = `${next.seed}_${next.activeZoneId}`;
    const plateauKey = `${zoneCompositeSeed}_${next.reliefScale.toFixed(2)}_${next.preset.id}`;
    if (plateauKey !== this.lastPlateauKey) {
      this.lastPlateauKey = plateauKey;
      configureTerrain(
        zoneCompositeSeed,
        next.reliefScale * next.preset.reliefMultiplier * 0.75
      );
      this.plateauTerrain.updateTheme(next.preset, zoneCompositeSeed);
      this.arrivalZone.syncPositionAndSelection(
        next.isArrivalZoneSelected,
        next.preset.edgeColor
      );
      if (!next.reducedMotion) {
        this.arrivalZone.triggerLandingAnimation();
      }

      const bg = new THREE.Color(next.preset.fogColor);
      this.scene.background = bg;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(bg);
      }
    } else {
      this.arrivalZone.syncPositionAndSelection(
        next.isArrivalZoneSelected,
        next.preset.edgeColor
      );
    }

    this.planetGlobe.setActiveZone(next.activeZoneId);

    const isPlanet3D =
      next.isBootScreenOpen || next.worldViewMode === view_MODE_PLANET_3D;

    this.plateauTerrain.group.visible = !isPlanet3D;
    this.arrivalZone.group.visible = !isPlanet3D;
    this.buildingsManager.group.visible = !isPlanet3D;
    this.npcManager.group.visible = !isPlanet3D;
    this.particles.group.visible = !isPlanet3D;
    this.weatherSystem.group.visible = !isPlanet3D;
    this.architectHologram.setBuilding(next.architectSandboxType ?? null, 4.0, 4.0);
    this.planetGlobe.group.visible = isPlanet3D;

    if (isPlanet3D) {
      this.cameraRig.setMode(cam_MODE_GLOBE);
      if (
        prev?.activeZoneId !== next.activeZoneId ||
        prev?.worldViewMode !== view_MODE_PLANET_3D
      ) {
        const markerPos = this.planetGlobe.getZoneMarkerWorldPosition(next.activeZoneId);
        if (markerPos) {
          this.cameraRig.focusGlobeOnWorldVector(markerPos);
        }
      }
    } else if (
      prev?.worldViewMode === view_MODE_PLANET_3D ||
      prev?.isBootScreenOpen
    ) {
      if (!next.reducedMotion) {
        this.arrivalZone.triggerLandingAnimation();
      }
      this.cameraRig.setMode(
        next.cameraMode === cam_MODE_GLOBE ? cam_MODE_ARRIVAL : next.cameraMode
      );
    } else {
      this.cameraRig.setMode(next.cameraMode);
    }

    this.plateauTerrain.syncUrbanDistricts(next.buildings);
    this.buildingsManager.sync(next.buildings, next.selectedBuildingId);
    this.npcManager.sync(
      next.npcs,
      next.selectedNpcId,
      next.buildings,
      next.npcAssignments
    );

    const activeSelection =
      next.selectedBuildingId ||
      next.selectedNpcId ||
      (next.isArrivalZoneSelected ? 'arrival_gate' : null);
    const prevSelection = prev
      ? prev.selectedBuildingId ||
        prev.selectedNpcId ||
        (prev.isArrivalZoneSelected ? 'arrival_gate' : null)
      : null;

    if (!isPlanet3D && activeSelection !== prevSelection) {
      if (next.isArrivalZoneSelected) {
        this.cameraRig.setMode(cam_MODE_ARRIVAL);
      } else if (next.selectedBuildingId) {
        const bld = next.buildings.find((b) => b.id === next.selectedBuildingId);
        if (bld) {
          this.cameraRig.setFocusPoint(new THREE.Vector3(bld.x, 2.0, bld.z));
        }
      } else if (next.selectedNpcId) {
        const npcPos = this.npcManager.getNpcPosition(next.selectedNpcId);
        if (npcPos) {
          this.cameraRig.setFocusPoint(npcPos);
        }
      } else {
        this.cameraRig.setFocusPoint(null);
      }
    }

    const nextWeather = next.ambience?.weatherEffect ?? wtr_CALM;
    const prevWeather = prev?.ambience?.weatherEffect ?? wtr_CALM;
    if (nextWeather !== prevWeather) {
      this.weatherSystem.setWeather(nextWeather, 50);
    }
  }

  public triggerArrivalShuttleLanding() {
    if (!this.state?.reducedMotion) {
      this.arrivalZone.triggerLandingAnimation();
    }
  }

  public triggerWeather(weather: WeatherType, durationSec = 45) {
    this.weatherSystem.setWeather(weather, durationSec);
  }

  public panCamera(dRight: number, dForward: number) {
    this.cameraRig.panDelta(dRight, dForward);
  }

  public rotateCamera(dAzimuth: number, dPolar: number) {
    this.cameraRig.rotateDelta(dAzimuth, dPolar);
  }

  public zoomCamera(dZoom: number) {
    this.cameraRig.zoomDelta(dZoom);
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', this.onContextMenu);

    dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
    dom.addEventListener('touchend', this.onTouchEnd, { passive: true });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private unbindEvents() {
    const dom = this.renderer.domElement;

    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('contextmenu', this.onContextMenu);

    dom.removeEventListener('touchstart', this.onTouchStart);
    dom.removeEventListener('touchmove', this.onTouchMove);
    dom.removeEventListener('touchend', this.onTouchEnd);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  /**
   * R-PT-59: Clavier directionnel (ZQSD/WASD/Flèches) supprimé pour respecter l'invariant Spectateur Pur.
   * Seuls subsistent les raccourcis d'accessibilité de vue (1 = Orbite, 2 = Astroport, 3 = Globe, Escape = Désélection).
   */
  private onKeyDown = (e: KeyboardEvent) => {
    if (
      document.activeElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
    ) {
      return;
    }
    if (!this.state || this.state.isBootScreenOpen) return;

    if (e.key === '1') {
      this.callbacks.onChangeWorldViewMode?.(view_MODE_PLATEAU);
      this.callbacks.onChangeCameraMode?.(cam_MODE_ORBIT);
    } else if (e.key === '2') {
      this.callbacks.onChangeWorldViewMode?.(view_MODE_PLATEAU);
      this.callbacks.onChangeCameraMode?.(cam_MODE_ARRIVAL);
    } else if (e.key === '3') {
      this.callbacks.onChangeWorldViewMode?.(view_MODE_PLANET_3D);
    } else if (e.key === 'Escape') {
      this.callbacks.onSelectArrivalZone(false);
      this.callbacks.onSelectNpc(null);
      this.callbacks.onSelectBuilding(null);
      this.callbacks.onSelectPlanetZone(null);
      this.cameraRig.setFocusPoint(null);
    }
  };

  private onContextMenu = (e: Event) => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.isDragging = true;
    this.dragButton = e.button;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !this.isDragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };

    const isPlanet3D =
      this.state?.isBootScreenOpen ||
      this.state?.worldViewMode === view_MODE_PLANET_3D;

    if (isPlanet3D) {
      this.cameraRig.rotateDelta(
        dx * cam_GESTURE_ROTATE_SENSITIVITY,
        -dy * (cam_GESTURE_ROTATE_SENSITIVITY * 0.85)
      );
    } else if (this.dragButton === 2 || e.altKey) {
      this.cameraRig.rotateDelta(
        dx * cam_GESTURE_ROTATE_SENSITIVITY,
        -dy * (cam_GESTURE_ROTATE_SENSITIVITY * 0.85)
      );
    } else {
      this.cameraRig.panDelta(
        -dx * cam_GESTURE_PAN_SENSITIVITY,
        dy * cam_GESTURE_PAN_SENSITIVITY
      );
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!this.isDragging) return;
    this.isDragging = false;

    const moveDist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y
    );
    if (moveDist < cam_GESTURE_TAP_THRESHOLD && e.button === 0) {
      this.handleRaycastSelection(e.clientX, e.clientY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraRig.zoomDelta(e.deltaY * 0.035);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.activeTouchCount = e.touches.length;
    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      this.pointerDownPos = { x: t0.clientX, y: t0.clientY };
      this.lastSingleTouch = { x: t0.clientX, y: t0.clientY };
    } else if (e.touches.length >= 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      this.lastTwoTouchDist = Math.hypot(dx, dy);
      this.lastTwoTouchAngle = Math.atan2(dy, dx);
      this.lastTwoTouchMid = {
        x: (t0.clientX + t1.clientX) * 0.5,
        y: (t0.clientY + t1.clientY) * 0.5,
      };
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const isPlanet3D =
      this.state?.isBootScreenOpen ||
      this.state?.worldViewMode === view_MODE_PLANET_3D;

    if (e.touches.length === 1 && this.activeTouchCount === 1) {
      const t0 = e.touches[0];
      const dx = t0.clientX - this.lastSingleTouch.x;
      const dy = t0.clientY - this.lastSingleTouch.y;
      this.lastSingleTouch = { x: t0.clientX, y: t0.clientY };

      if (isPlanet3D) {
        this.cameraRig.rotateDelta(
          dx * cam_GESTURE_ROTATE_SENSITIVITY,
          -dy * cam_GESTURE_ROTATE_SENSITIVITY
        );
      } else {
        this.cameraRig.panDelta(
          -dx * cam_GESTURE_PAN_SENSITIVITY,
          dy * cam_GESTURE_PAN_SENSITIVITY
        );
      }
    } else if (e.touches.length >= 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;

      const nextDist = Math.hypot(dx, dy);
      const nextAngle = Math.atan2(dy, dx);
      const nextMid = {
        x: (t0.clientX + t1.clientX) * 0.5,
        y: (t0.clientY + t1.clientY) * 0.5,
      };

      if (this.lastTwoTouchAngle !== null) {
        let dAngle = nextAngle - this.lastTwoTouchAngle;
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
        this.cameraRig.rotateDelta(dAngle * cam_GESTURE_TWIST_SENSITIVITY, 0);
      }

      if (this.lastTwoTouchMid !== null) {
        const dMidY = nextMid.y - this.lastTwoTouchMid.y;
        this.cameraRig.rotateDelta(0, -dMidY * 0.005);
      }

      if (this.lastTwoTouchDist !== null) {
        const dDist = this.lastTwoTouchDist - nextDist;
        this.cameraRig.zoomDelta(dDist * cam_GESTURE_PINCH_SENSITIVITY);
      }

      this.lastTwoTouchDist = nextDist;
      this.lastTwoTouchAngle = nextAngle;
      this.lastTwoTouchMid = nextMid;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.activeTouchCount === 1 && e.changedTouches.length === 1) {
      const t0 = e.changedTouches[0];
      const moveDist = Math.hypot(
        t0.clientX - this.pointerDownPos.x,
        t0.clientY - this.pointerDownPos.y
      );
      if (moveDist < cam_GESTURE_TAP_THRESHOLD) {
        this.handleRaycastSelection(t0.clientX, t0.clientY);
      }
    }

    this.activeTouchCount = e.touches.length;
    if (e.touches.length < 2) {
      this.lastTwoTouchDist = null;
      this.lastTwoTouchAngle = null;
      this.lastTwoTouchMid = null;
    }
    if (e.touches.length === 1) {
      this.lastSingleTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  private handleRaycastSelection(clientX: number, clientY: number) {
    if (!this.state) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.cameraRig.camera);

    const isPlanet3D =
      this.state.isBootScreenOpen ||
      this.state.worldViewMode === view_MODE_PLANET_3D;

    if (isPlanet3D) {
      const zoneTargets = this.planetGlobe.getInteractiveZoneMarkers();
      const zoneHits = this.raycaster.intersectObjects(zoneTargets, true);
      if (zoneHits.length > 0) {
        let obj: THREE.Object3D | null = zoneHits[0].object;
        while (obj && !obj.userData?.entityId) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.entityType === 'planet_zone' && obj.userData.entityId) {
          this.callbacks.onSelectPlanetZone(obj.userData.entityId);
          const worldPos = this.planetGlobe.getZoneMarkerWorldPosition(obj.userData.entityId);
          if (worldPos) {
            this.cameraRig.focusGlobeOnWorldVector(worldPos);
          }
          return;
        }
      }
      if (!this.state.isBootScreenOpen) {
        this.callbacks.onSelectPlanetZone(null);
      }
      return;
    }

    const targets = [
      this.arrivalZone.getInteractiveObject(),
      ...this.npcManager.getInteractiveMeshes(),
      ...this.buildingsManager.getInteractiveMeshes(),
    ];

    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.entityId) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.entityId) {
        if (obj.userData.entityType === 'arrival_zone') {
          this.callbacks.onSelectNpc(null);
          this.callbacks.onSelectBuilding(null);
          this.callbacks.onSelectArrivalZone(true);
        } else if (obj.userData.entityType === 'npc') {
          this.callbacks.onSelectArrivalZone(false);
          this.callbacks.onSelectBuilding(null);
          this.callbacks.onSelectNpc(obj.userData.entityId);
        } else {
          this.callbacks.onSelectArrivalZone(false);
          this.callbacks.onSelectNpc(null);
          this.callbacks.onSelectBuilding(obj.userData.entityId);
        }
        return;
      }
    }

    this.callbacks.onSelectArrivalZone(false);
    this.callbacks.onSelectNpc(null);
    this.callbacks.onSelectBuilding(null);
  }

  private onResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.cameraRig.resize(width, height);
    this.postPipeline.resize(width, height);
  };

  private onVisibilityChange = () => {
    this.isPaused = document.hidden;
    if (!this.isPaused) {
      this.clock.getDelta();
    }
  };

  private startLoop() {
    const tick = () => {
      this.animationFrameId = requestAnimationFrame(tick);
      if (this.isPaused || !this.state) return;

      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();

      // PT-47: Fixed-tick 10 Hz deterministic accumulator (0.1s per tick)
      this.fixedTickAccumSec += dt;
      while (this.fixedTickAccumSec >= evt_TICK_INTERVAL_SEC) {
        this.fixedTickAccumSec -= evt_TICK_INTERVAL_SEC;
        if (!this.state.reducedMotion) {
          this.tickIndex += 1;
        }
      }

      const celestialTime =
        this.state.autoCycleTime && !this.state.reducedMotion
          ? (this.state.celestialTime + this.tickIndex * evt_TICK_INTERVAL_SEC * wld_CELESTIAL_CYCLE_RATE * 0.2) % 1.0
          : this.state.celestialTime;

      updateSpaceEnvironment(
        this.spaceEnv,
        celestialTime,
        this.state.preset,
        this.state.ambience,
        dt
      );

      const isPlanet3D =
        this.state.isBootScreenOpen ||
        this.state.worldViewMode === view_MODE_PLANET_3D;

      if (this.state.isBootScreenOpen) {
        if (!this.state.reducedMotion) {
          this.cameraRig.rotateDelta(dt * 0.08, 0);
        }
        this.planetGlobe.update(elapsed, dt, true);
      } else if (isPlanet3D) {
        this.planetGlobe.update(elapsed, dt, false);
      } else {
        const sunDir = this.spaceEnv.dirLight.position.clone().normalize();
        this.plateauTerrain.updateWaterAnimation(
          elapsed,
          celestialTime,
          sunDir,
          this.cameraRig.camera.position,
          this.tickIndex,
          isPlanet3D
        );
        this.arrivalZone.update(elapsed, dt);
        this.buildingsManager.update(elapsed, dt);
        this.npcManager.update(
          elapsed,
          dt,
          this.state.buildings,
          this.state.npcAssignments
        );
        this.particles.update(
          elapsed,
          dt,
          this.state.ambience?.particleDensity ?? 0.5,
          this.state.preset.edgeColor
        );
        this.weatherSystem.update(
          elapsed,
          dt,
          this.state.buildings,
          this.state.preset,
          isPlanet3D
        );
        this.architectHologram.update(elapsed);
        const curWeather = this.weatherSystem.getActiveWeather();
        if (curWeather !== this.lastNotifiedWeather) {
          this.lastNotifiedWeather = curWeather;
          this.callbacks.onUpdateWeather?.(curWeather);
        }
      }

      this.cameraRig.update(dt);
      this.postPipeline.render(elapsed);

      // PT-32 & PT-49: Record frame in Adaptive Quality Director & sample GPU telemetry
      const info = this.renderer.info;
      const qSnapshot = this.qualityDirector.recordFrame(
        dt,
        info.render.calls,
        info.render.triangles
      );

      this.perfSampleAccumSec += dt;
      this.perfFrameCount += 1;
      if (this.perfSampleAccumSec >= 1.0 && this.callbacks.onUpdatePerfMetrics) {
        if (
          !this.isSoftwareGl &&
          Math.abs(this.renderer.getPixelRatio() - qSnapshot.recommendedPixelRatio) >= 0.1
        ) {
          this.renderer.setPixelRatio(qSnapshot.recommendedPixelRatio);
        }

        const avgFrameMs = (this.perfSampleAccumSec * 1000) / Math.max(1, this.perfFrameCount);
        const fps = Math.round(this.perfFrameCount / this.perfSampleAccumSec);
        this.callbacks.onUpdatePerfMetrics({
          frameTimeMs: Number(avgFrameMs.toFixed(1)),
          fps,
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          textures: info.memory.textures,
          geometries: info.memory.geometries,
        });
        this.perfSampleAccumSec = 0;
        this.perfFrameCount = 0;
      }
    };

    tick();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
    this.postPipeline.dispose();
    this.spaceEnv.dispose();
    this.plateauTerrain.dispose();
    this.arrivalZone.dispose();
    this.planetGlobe.dispose();
    this.buildingsManager.dispose();
    this.npcManager.dispose();
    this.particles.dispose();
    this.weatherSystem.dispose();
    this.envMapRT.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
