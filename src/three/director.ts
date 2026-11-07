import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraMode,
  WeatherType,
  WorldViewMode,
  cam_MODE_ARRIVAL,
  cam_MODE_GLOBE,
  view_MODE_PLANET_3D,
  wld_CELESTIAL_CYCLE_RATE,
  wtr_CALM,
} from '../config/constants';
import { PlacedBuilding, PlacedNpc, WorldPreset } from '../contracts/schemas';
import { DEFAULT_PRESET } from '../config/presets';
import { DEFAULT_GAME_CONFIG } from '../config/gameDefaults';
import { AmbienceOverride } from '../stores/worldStore';
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
import { createCameraRig, CameraRig } from './camera/cameraRig';

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
  selectedNpcId: string | null;
  selectedBuildingId: string | null;
  isArrivalZoneSelected: boolean;
}

export interface SceneDirectorCallbacks {
  onSelectNpc: (id: string | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onSelectArrivalZone: (selected: boolean) => void;
  onSelectPlanetZone: (zoneId: string) => void;
}

/**
 * Master 3D WebGL Director for Pax Historia 3D.
 * Supports:
 * - Cinematic 3D Orbital Planet + Flagship Arrival during Boot, Auth & Main Menu
 * - 1-finger swipe to advance Forward/Backward/Left/Right across the curved plateau
 * - 2-finger twist (rotation en sens inverse) + 2-finger tilt + pinch zoom
 * - Organic 3D Urban Districts & RPG GLTF/Articulated NPCs
 */
export class SceneDirector {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private pmremGenerator: THREE.PMREMGenerator;
  private envMapRT: THREE.WebGLRenderTarget;

  private spaceEnv: SpaceEnvironment;
  private plateauTerrain: PlateauTerrain;
  private arrivalZone: ArrivalZone3D;
  private planetGlobe: PlanetGlobe;
  private particles: AtmosphericParticles;
  private weatherSystem: WeatherSystemManager;
  private buildingsManager: BuildingsManager;
  private npcManager: NpcManager;
  private cameraRig: CameraRig;

  private callbacks: SceneDirectorCallbacks;
  private state: SceneDirectorState | null = null;

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

  private pressedKeys = new Set<string>();

  private lastPlateauKey = '';
  private lastGlobeKey = '';

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
    this.scene.background = new THREE.Color(DEFAULT_PRESET.fogColor);
    this.scene.fog = new THREE.FogExp2(DEFAULT_PRESET.fogColor, 0.0028);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.envMapRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envMapRT.texture;
    this.scene.environmentIntensity = 0.75;

    configureTerrain(DEFAULT_GAME_CONFIG.seed, DEFAULT_GAME_CONFIG.reliefScale);

    this.spaceEnv = createSpaceEnvironment(DEFAULT_PRESET, DEFAULT_GAME_CONFIG.seed);
    this.scene.add(this.spaceEnv.group);

    this.plateauTerrain = createPlateauTerrain(DEFAULT_PRESET, DEFAULT_GAME_CONFIG.seed);
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

    this.cameraRig = createCameraRig(width, height);

    this.bindEvents();
    this.startLoop();
  }

  public syncState(next: SceneDirectorState) {
    const prev = this.state;
    this.state = next;

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
      this.arrivalZone.triggerLandingAnimation();

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

    // During Cinematic Boot / Auth / Main Menu OR when Planet 3D view is selected, show the 3D Planet Globe & Flagship!
    const isPlanet3D =
      next.isBootScreenOpen || next.worldViewMode === view_MODE_PLANET_3D;

    this.plateauTerrain.group.visible = !isPlanet3D;
    this.arrivalZone.group.visible = !isPlanet3D;
    this.buildingsManager.group.visible = !isPlanet3D;
    this.npcManager.group.visible = !isPlanet3D;
    this.particles.group.visible = !isPlanet3D;
    this.weatherSystem.group.visible = !isPlanet3D;
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
      this.arrivalZone.triggerLandingAnimation();
      this.cameraRig.setMode(
        next.cameraMode === cam_MODE_GLOBE ? cam_MODE_ARRIVAL : next.cameraMode
      );
    } else {
      this.cameraRig.setMode(next.cameraMode);
    }

    this.plateauTerrain.syncUrbanDistricts(next.buildings);
    this.buildingsManager.sync(next.buildings, next.selectedBuildingId);
    this.npcManager.sync(next.npcs, next.selectedNpcId, next.buildings);

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
    this.arrivalZone.triggerLandingAnimation();
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
    window.addEventListener('keyup', this.onKeyUp);
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
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (
      document.activeElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
    ) {
      return;
    }
    this.pressedKeys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.pressedKeys.delete(e.key.toLowerCase());
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
      this.cameraRig.rotateDelta(dx * 0.0065, -dy * 0.0055);
    } else if (this.dragButton === 2 || e.altKey) {
      this.cameraRig.rotateDelta(dx * 0.0065, -dy * 0.0055);
    } else {
      this.cameraRig.panDelta(-dx * 0.055, dy * 0.055);
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
    if (moveDist < 6 && e.button === 0) {
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
        this.cameraRig.rotateDelta(dx * 0.007, -dy * 0.006);
      } else {
        this.cameraRig.panDelta(-dx * 0.065, dy * 0.065);
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
        this.cameraRig.rotateDelta(dAngle * 1.85, 0);
      }

      if (this.lastTwoTouchMid !== null) {
        const dMidY = nextMid.y - this.lastTwoTouchMid.y;
        this.cameraRig.rotateDelta(0, -dMidY * 0.005);
      }

      if (this.lastTwoTouchDist !== null) {
        const dDist = this.lastTwoTouchDist - nextDist;
        this.cameraRig.zoomDelta(dDist * 0.11);
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
      if (moveDist < 8) {
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
    if (!this.state || this.state.isBootScreenOpen) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.cameraRig.camera);

    if (this.state.worldViewMode === view_MODE_PLANET_3D) {
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
  };

  private onVisibilityChange = () => {
    this.isPaused = document.hidden;
    if (!this.isPaused) {
      this.clock.getDelta();
    }
  };

  private updateKeyboardNavigation(dt: number) {
    if (this.pressedKeys.size === 0) return;
    const moveSpeed = 24 * dt;
    const rotSpeed = 1.6 * dt;

    if (
      this.pressedKeys.has('w') ||
      this.pressedKeys.has('z') ||
      this.pressedKeys.has('arrowup')
    ) {
      this.cameraRig.panDelta(0, moveSpeed);
    }
    if (this.pressedKeys.has('s') || this.pressedKeys.has('arrowdown')) {
      this.cameraRig.panDelta(0, -moveSpeed);
    }
    if (
      this.pressedKeys.has('a') ||
      this.pressedKeys.has('q') ||
      this.pressedKeys.has('arrowleft')
    ) {
      this.cameraRig.panDelta(-moveSpeed, 0);
    }
    if (this.pressedKeys.has('d') || this.pressedKeys.has('arrowright')) {
      this.cameraRig.panDelta(moveSpeed, 0);
    }
    if (this.pressedKeys.has('e')) {
      this.cameraRig.rotateDelta(rotSpeed, 0);
    }
    if (this.pressedKeys.has('r')) {
      this.cameraRig.rotateDelta(-rotSpeed, 0);
    }
  }

  private startLoop() {
    const tick = () => {
      this.animationFrameId = requestAnimationFrame(tick);
      if (this.isPaused || !this.state) return;

      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();

      this.updateKeyboardNavigation(dt);

      const celestialTime = this.state.autoCycleTime
        ? (this.state.celestialTime + elapsed * wld_CELESTIAL_CYCLE_RATE * 0.2) % 1.0
        : this.state.celestialTime;

      updateSpaceEnvironment(
        this.spaceEnv,
        celestialTime,
        this.state.preset,
        this.state.ambience,
        dt
      );

      if (this.state.isBootScreenOpen) {
        // Gentle orbital rotation around the 3D planet during Cinematic Boot & Main Menu
        this.cameraRig.rotateDelta(dt * 0.08, 0);
        this.planetGlobe.update(elapsed, dt, true);
      } else if (this.state.worldViewMode === view_MODE_PLANET_3D) {
        this.planetGlobe.update(elapsed, dt, false);
      } else {
        this.plateauTerrain.updateWaterAnimation(elapsed);
        this.arrivalZone.update(elapsed, dt);
        this.buildingsManager.update(elapsed, dt);
        this.npcManager.update(elapsed, dt, this.state.buildings);
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
          this.state.preset.edgeColor
        );
      }

      this.cameraRig.update(dt);
      this.renderer.render(this.scene, this.cameraRig.camera);
    };

    tick();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
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
