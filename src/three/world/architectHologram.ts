/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * Holographic 3D Architect Preview Mesh (Cyan / Amber Wireframe Visualizer)
 */

import * as THREE from 'three';
import { BuildingType, bld_TYPE_HABITAT, bld_TYPE_GREENHOUSE, bld_TYPE_OBSERVATION, bld_TYPE_BIO_DOME } from '../../config/constants';
import { getSphericalCurvatureDrop, getTerrainHeight } from '../../core/terrainMath';

export interface ArchitectHologramManager {
  group: THREE.Group;
  setBuilding: (type: BuildingType | null, x?: number, z?: number) => void;
  update: (time: number) => void;
  dispose: () => void;
}

export function createArchitectHologramManager(): ArchitectHologramManager {
  const group = new THREE.Group();
  group.visible = false;

  // Base hologram material
  const matWire = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });

  const matFill = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });

  // Base Ring
  const ringGeo = new THREE.RingGeometry(2.0, 2.5, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, matFill);
  group.add(ringMesh);

  // Main Structure mesh
  let currentStructureMesh: THREE.Group | null = null;

  function buildHologramGeometry(type: BuildingType): THREE.Group {
    const struct = new THREE.Group();
    let bodyGeo: THREE.BufferGeometry;

    if (type === bld_TYPE_HABITAT) {
      bodyGeo = new THREE.CylinderGeometry(1.6, 2.2, 3.2, 8);
    } else if (type === bld_TYPE_GREENHOUSE) {
      bodyGeo = new THREE.SphereGeometry(2.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    } else if (type === bld_TYPE_OBSERVATION) {
      bodyGeo = new THREE.CylinderGeometry(0.8, 1.4, 5.0, 12);
    } else if (type === bld_TYPE_BIO_DOME) {
      bodyGeo = new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    } else {
      bodyGeo = new THREE.BoxGeometry(2.5, 3.5, 2.5);
    }

    const meshWire = new THREE.Mesh(bodyGeo, matWire);
    const meshSolid = new THREE.Mesh(bodyGeo, matFill);

    struct.add(meshWire);
    struct.add(meshSolid);
    return struct;
  }

  function setBuilding(type: BuildingType | null, x = 0, z = 0) {
    if (!type) {
      group.visible = false;
      return;
    }

    if (currentStructureMesh) {
      group.remove(currentStructureMesh);
    }

    currentStructureMesh = buildHologramGeometry(type);
    group.add(currentStructureMesh);

    const y = getTerrainHeight(x, z) - getSphericalCurvatureDrop(x, z);
    group.position.set(x, y + 0.1, z);
    group.visible = true;
  }

  function update(time: number) {
    if (!group.visible) return;
    matWire.opacity = 0.65 + Math.sin(time * 6.0) * 0.25;
    matFill.opacity = 0.25 + Math.sin(time * 4.0) * 0.1;
    group.rotation.y = time * 0.5;
  }

  function dispose() {
    matWire.dispose();
    matFill.dispose();
    ringGeo.dispose();
  }

  return {
    group,
    setBuilding,
    update,
    dispose,
  };
}
