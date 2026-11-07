import * as THREE from 'three';
import {
  CameraMode,
  cam_MODE_ORBIT,
  cam_MODE_PLATEAU,
  cam_MODE_ARRIVAL,
  cam_MODE_GLOBE,
  cam_INERTIA_DAMPING,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
} from '../../config/constants';
import { getTerrainHeight } from '../../core/terrainMath';

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  setMode: (mode: CameraMode) => void;
  setFocusPoint: (point: THREE.Vector3 | null) => void;
  focusGlobeOnWorldVector: (worldPos: THREE.Vector3) => void;
  rotateDelta: (dAzimuth: number, dPolar: number) => void;
  panDelta: (dRight: number, dForward: number) => void;
  zoomDelta: (dZoom: number) => void;
  update: (dt: number) => void;
  resize: (width: number, height: number) => void;
}

/**
 * Exponentially damped camera rig supporting:
 * - Free movement across the 112x112 curved planetary plateau (forward/backward/left/right)
 * - 2-finger twist rotation & pinch zoom
 * - Orbit 360°, Surface Plunge, Arrival Zone framing, and 3D Planet Globe framing
 */
export function createCameraRig(width: number, height: number): CameraRig {
  const camera = new THREE.PerspectiveCamera(45, width / Math.max(1, height), 0.5, 550);

  let currentMode: CameraMode = cam_MODE_ORBIT;

  let targetAzimuth = 0.55;
  let currentAzimuth = 0.55;

  let targetPolar = 0.92;
  let currentPolar = 0.92;

  let targetDistance = 58;
  let currentDistance = 58;

  const targetLookAt = new THREE.Vector3(0, 1.5, 0);
  const currentLookAt = new THREE.Vector3(0, 1.5, 0);
  let explicitFocus: THREE.Vector3 | null = null;

  function setMode(mode: CameraMode) {
    currentMode = mode;

    if (mode === cam_MODE_GLOBE) {
      explicitFocus = null;
      targetLookAt.set(0, 0, 0);
      targetDistance = 54;
      targetPolar = 1.18;
    } else if (mode === cam_MODE_ARRIVAL) {
      explicitFocus = null;
      const arrY = getTerrainHeight(wld_ARRIVAL_ZONE_X, wld_ARRIVAL_ZONE_Z);
      targetLookAt.set(wld_ARRIVAL_ZONE_X, arrY + 1.5, wld_ARRIVAL_ZONE_Z - 1.2);
      targetAzimuth = 0.25;
      targetPolar = 1.16;
      targetDistance = 16.5;
    } else if (mode === cam_MODE_PLATEAU) {
      targetDistance = 22;
      targetPolar = 1.18;
      if (!explicitFocus) {
        targetLookAt.y = getTerrainHeight(targetLookAt.x, targetLookAt.z) + 1.6;
      }
    } else {
      targetDistance = 58;
      targetPolar = 0.92;
      if (!explicitFocus) {
        targetLookAt.y = getTerrainHeight(targetLookAt.x, targetLookAt.z) + 1.5;
      }
    }
  }

  function setFocusPoint(point: THREE.Vector3 | null) {
    explicitFocus = point ? point.clone() : null;
    if (explicitFocus && currentMode !== cam_MODE_GLOBE) {
      targetLookAt.copy(explicitFocus);
      targetDistance = Math.min(targetDistance, 24);
    } else if (currentMode === cam_MODE_GLOBE) {
      targetLookAt.set(0, 0, 0);
    }
  }

  function focusGlobeOnWorldVector(worldPos: THREE.Vector3) {
    const dir = worldPos.clone().normalize();
    const polar = Math.acos(THREE.MathUtils.clamp(dir.y, -0.95, 0.95));
    const azimuth = Math.atan2(dir.x, dir.z);
    targetPolar = THREE.MathUtils.clamp(polar, 0.4, 2.7);
    targetAzimuth = azimuth;
    targetDistance = 48;
  }

  function rotateDelta(dAzimuth: number, dPolar: number) {
    targetAzimuth -= dAzimuth;
    const minPolar = 0.32;
    const maxPolar = currentMode === cam_MODE_GLOBE ? 2.75 : 1.42;
    targetPolar = THREE.MathUtils.clamp(targetPolar + dPolar, minPolar, maxPolar);
  }

  /**
   * Advances the camera target across the curved plateau along the camera's local
   * Right/Left (`dRight`) and Forward/Backward (`dForward`) axes.
   */
  function panDelta(dRight: number, dForward: number) {
    if (currentMode === cam_MODE_GLOBE) return;
    explicitFocus = null;

    // Camera looks from (sin(az), cos(az)) toward targetLookAt, so forward on the plateau is (-sin(az), -cos(az))
    const forward = new THREE.Vector3(
      -Math.sin(currentAzimuth),
      0,
      -Math.cos(currentAzimuth)
    ).normalize();

    const right = new THREE.Vector3(
      Math.cos(currentAzimuth),
      0,
      -Math.sin(currentAzimuth)
    ).normalize();

    targetLookAt.addScaledVector(right, dRight);
    targetLookAt.addScaledVector(forward, dForward);

    const maxPan = 44;
    targetLookAt.x = THREE.MathUtils.clamp(targetLookAt.x, -maxPan, maxPan);
    targetLookAt.z = THREE.MathUtils.clamp(targetLookAt.z, -maxPan, maxPan);
    targetLookAt.y = getTerrainHeight(targetLookAt.x, targetLookAt.z) + 1.4;
  }

  function zoomDelta(dZoom: number) {
    if (currentMode === cam_MODE_GLOBE) {
      targetDistance = THREE.MathUtils.clamp(targetDistance + dZoom, 32, 92);
    } else if (currentMode === cam_MODE_PLATEAU || currentMode === cam_MODE_ARRIVAL) {
      targetDistance = THREE.MathUtils.clamp(targetDistance + dZoom, 10, 48);
    } else {
      targetDistance = THREE.MathUtils.clamp(targetDistance + dZoom, 16, 115);
    }
  }

  function update(dt: number) {
    const alpha = 1 - Math.exp(-cam_INERTIA_DAMPING * 60 * Math.min(dt, 0.1));

    currentAzimuth = THREE.MathUtils.lerp(currentAzimuth, targetAzimuth, alpha);
    currentPolar = THREE.MathUtils.lerp(currentPolar, targetPolar, alpha);
    currentDistance = THREE.MathUtils.lerp(currentDistance, targetDistance, alpha);

    if (currentMode === cam_MODE_GLOBE) {
      targetLookAt.set(0, 0, 0);
    } else if (explicitFocus) {
      targetLookAt.copy(explicitFocus);
    }

    currentLookAt.lerp(targetLookAt, alpha);

    const sinP = Math.sin(currentPolar);
    const cosP = Math.cos(currentPolar);
    const x = currentLookAt.x + currentDistance * sinP * Math.sin(currentAzimuth);
    const y = currentLookAt.y + currentDistance * cosP;
    const z = currentLookAt.z + currentDistance * sinP * Math.cos(currentAzimuth);

    if (currentMode !== cam_MODE_GLOBE) {
      const groundAtCam = getTerrainHeight(x, z) + 2.2;
      camera.position.set(x, Math.max(groundAtCam, y), z);
    } else {
      camera.position.set(x, y, z);
    }

    camera.lookAt(currentLookAt);
  }

  function resize(w: number, h: number) {
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  return {
    camera,
    setMode,
    setFocusPoint,
    focusGlobeOnWorldVector,
    rotateDelta,
    panDelta,
    zoomDelta,
    update,
    resize,
  };
}
