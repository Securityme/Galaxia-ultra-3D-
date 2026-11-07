import * as THREE from 'three';
import { PlacedBuilding } from '../../contracts/schemas';
import {
  bld_TYPE_OBSERVATION,
  bld_TYPE_BIO_DOME,
  bld_TYPE_RELAY_TOWER,
  bld_TYPE_HABITAT,
  bld_TYPE_GREENHOUSE,
} from '../../config/constants';
import { getTerrainHeight, getTerrainNormal } from '../../core/terrainMath';

export interface BuildingsManager {
  group: THREE.Group;
  sync: (buildings: PlacedBuilding[], selectedId: string | null) => void;
  update: (time: number, dt: number) => void;
  getInteractiveMeshes: () => THREE.Object3D[];
  dispose: () => void;
}

interface BuildingNode {
  id: string;
  instance: PlacedBuilding;
  root: THREE.Group;
  animatedParts: THREE.Object3D[];
  beaconMat: THREE.MeshStandardMaterial;
  selectionRing: THREE.Mesh;
  spawnProgress: number;
}

/**
 * High-detail multi-part classical-imperial & bio-architectural landmarks for Pax Historia 3D.
 * Includes colonnade pillars, warm illuminated windows, courtyard gardens, and rotating astrolabes.
 */
export function createBuildingsManager(): BuildingsManager {
  const group = new THREE.Group();
  group.name = 'BuildingsGroup';

  const nodes = new Map<string, BuildingNode>();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6dcc8,
    roughness: 0.62,
    metalness: 0.08,
  });

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf6f2e9,
    roughness: 0.42,
    metalness: 0.14,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc59b52,
    roughness: 0.32,
    metalness: 0.76,
  });

  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0xb85a3a,
    roughness: 0.58,
    metalness: 0.08,
  });

  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a0,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const glassDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff5ff,
    roughness: 0.14,
    metalness: 0.05,
    transmission: 0.65,
    transparent: true,
    opacity: 0.86,
  });

  function buildArchitecturalMesh(
    instance: PlacedBuilding,
    beaconMat: THREE.MeshStandardMaterial,
    animatedParts: THREE.Object3D[]
  ): THREE.Group {
    const root = new THREE.Group();
    root.userData = { entityType: 'building', entityId: instance.id };

    // Stepped stone foundation plinth + grand staircase
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.98, 0.95, 16), stoneMat);
    plinth.position.y = 0.25;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    root.add(plinth);

    const upperPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.58, 0.36, 16), marbleMat);
    upperPlinth.position.y = 0.78;
    upperPlinth.castShadow = true;
    upperPlinth.receiveShadow = true;
    root.add(upperPlinth);

    const stairBlock = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.95), marbleMat);
    stairBlock.position.set(0, 0.52, 1.45);
    stairBlock.castShadow = true;
    root.add(stairBlock);

    switch (instance.buildingType) {
      case bld_TYPE_OBSERVATION: {
        // Grand Imperial Observatory Citadel: Peristyle colonnade + fluted tower + illuminated windows + brass dome + armillary
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 1.02, 2.35, 16), marbleMat);
        tower.position.y = 2.0;
        tower.castShadow = true;
        tower.receiveShadow = true;
        root.add(tower);

        // 8 Peristyle Columns around the lower gallery
        for (let c = 0; c < 8; c++) {
          const ang = (c / 8) * Math.PI * 2;
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 1.25, 8),
            marbleMat
          );
          col.position.set(Math.cos(ang) * 1.24, 1.52, Math.sin(ang) * 1.24);
          col.castShadow = true;
          root.add(col);
        }

        // Illuminated arched windows around upper tower
        for (let w = 0; w < 6; w++) {
          const ang = (w / 6) * Math.PI * 2;
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.42, 0.08),
            warmWindowMat
          );
          win.position.set(Math.cos(ang) * 0.86, 2.45, Math.sin(ang) * 0.86);
          win.rotation.y = -ang + Math.PI / 2;
          root.add(win);
        }

        const cornice = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 0.96, 0.26, 16), bronzeMat);
        cornice.position.y = 3.22;
        root.add(cornice);

        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
          bronzeMat
        );
        dome.position.y = 3.3;
        dome.castShadow = true;
        root.add(dome);

        const armillaryGroup = new THREE.Group();
        armillaryGroup.position.y = 4.55;
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.048, 10, 28), bronzeMat);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.038, 10, 24), bronzeMat);
        ring2.rotation.x = Math.PI / 3;
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), beaconMat);
        armillaryGroup.add(ring1, ring2, core);
        root.add(armillaryGroup);
        animatedParts.push(armillaryGroup);
        break;
      }

      case bld_TYPE_BIO_DOME: {
        // Grand Bio-Conservatory: colonnade ring + crystal geodesic glass dome + inner garden trees
        const ringWall = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.32, 0.88, 16), marbleMat);
        ringWall.position.y = 1.28;
        ringWall.castShadow = true;
        root.add(ringWall);

        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const pilaster = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.95, 0.14),
            bronzeMat
          );
          pilaster.position.set(Math.cos(ang) * 1.3, 1.32, Math.sin(ang) * 1.3);
          pilaster.rotation.y = -ang;
          root.add(pilaster);
        }

        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.24, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
          glassDomeMat
        );
        dome.position.y = 1.68;
        root.add(dome);

        const ribRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.045, 8, 28), bronzeMat);
        ribRing.rotation.x = Math.PI / 2;
        ribRing.position.y = 1.7;
        root.add(ribRing);

        const meridianArc = new THREE.Mesh(
          new THREE.TorusGeometry(1.24, 0.035, 8, 28, Math.PI),
          bronzeMat
        );
        meridianArc.position.y = 1.68;
        root.add(meridianArc);

        const innerFoliage = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.62, 1),
          new THREE.MeshStandardMaterial({ color: 0x349e6b, roughness: 0.65 })
        );
        innerFoliage.position.y = 1.95;
        root.add(innerFoliage);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), beaconMat);
        finial.position.y = 3.05;
        root.add(finial);
        break;
      }

      case bld_TYPE_RELAY_TOWER: {
        // Prometheus Energy Obelisk: stepped buttresses + tapered marble obelisk + bronze coils + levitating crystal
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.78, 3.0, 8), marbleMat);
        shaft.position.y = 2.35;
        shaft.castShadow = true;
        root.add(shaft);

        for (let b = 0; b < 4; b++) {
          const ang = (b / 4) * Math.PI * 2;
          const buttress = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 1.3, 0.65),
            bronzeMat
          );
          buttress.position.set(Math.cos(ang) * 0.72, 1.45, Math.sin(ang) * 0.72);
          buttress.rotation.y = -ang + Math.PI / 2;
          buttress.castShadow = true;
          root.add(buttress);
        }

        for (let c = 0; c < 3; c++) {
          const collar = new THREE.Mesh(
            new THREE.TorusGeometry(0.6 - c * 0.09, 0.055, 8, 24),
            bronzeMat
          );
          collar.rotation.x = Math.PI / 2;
          collar.position.y = 1.75 + c * 0.7;
          root.add(collar);
        }

        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), beaconMat);
        crystal.position.y = 4.35;
        root.add(crystal);
        animatedParts.push(crystal);
        break;
      }

      case bld_TYPE_HABITAT: {
        // Aurelia Sovereign Quarter: main peristyle palace + side wing + terracotta roofs + warm windows
        const mainHall = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.25, 1.42), marbleMat);
        mainHall.position.y = 1.52;
        mainHall.castShadow = true;
        mainHall.receiveShadow = true;
        root.add(mainHall);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.48, 0.92, 4), terracottaMat);
        roof.position.y = 2.55;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        root.add(roof);

        // Warm palace windows
        for (let wx = -0.5; wx <= 0.5; wx += 0.5) {
          const winFront = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.38, 0.06),
            warmWindowMat
          );
          winFront.position.set(wx, 1.6, 0.72);
          root.add(winFront);
        }

        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), beaconMat);
        lantern.position.y = 3.08;
        root.add(lantern);
        break;
      }

      case bld_TYPE_GREENHOUSE:
      default: {
        // Helios Hanging Gardens & Sun Spire: tiered botanical terraces + golden helios mirror
        const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.32, 0.65, 12), stoneMat);
        tier1.position.y = 1.22;
        tier1.castShadow = true;
        root.add(tier1);

        const gardenRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.05, 0.16, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0x349e6b, roughness: 0.7 })
        );
        gardenRing.rotation.x = Math.PI / 2;
        gardenRing.position.y = 1.56;
        root.add(gardenRing);

        const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.98, 0.68, 12), marbleMat);
        tier2.position.y = 1.88;
        tier2.castShadow = true;
        root.add(tier2);

        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.45, 12), bronzeMat);
        column.position.y = 2.85;
        root.add(column);

        const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24), beaconMat);
        sunDisc.rotation.x = Math.PI / 3;
        sunDisc.position.y = 3.82;
        root.add(sunDisc);
        animatedParts.push(sunDisc);
        break;
      }
    }

    root.traverse((obj) => {
      obj.userData = { entityType: 'building', entityId: instance.id };
    });

    return root;
  }

  function sync(buildings: PlacedBuilding[], selectedId: string | null) {
    const incomingIds = new Set(buildings.map((b) => b.id));

    for (const [id, node] of nodes.entries()) {
      if (!incomingIds.has(id)) {
        group.remove(node.root);
        node.beaconMat.dispose();
        node.selectionRing.geometry.dispose();
        nodes.delete(id);
      }
    }

    for (const bld of buildings) {
      let node = nodes.get(bld.id);

      if (!node) {
        const beaconMat = new THREE.MeshStandardMaterial({
          color: '#f4c56c',
          emissive: '#f4c56c',
          emissiveIntensity: 0.75,
          roughness: 0.22,
          metalness: 0.3,
        });

        const animatedParts: THREE.Object3D[] = [];
        const root = buildArchitecturalMesh(bld, beaconMat, animatedParts);

        const selectionRing = new THREE.Mesh(
          new THREE.RingGeometry(1.95, 2.25, 36),
          new THREE.MeshBasicMaterial({
            color: 0xf5c869,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          })
        );
        selectionRing.rotation.x = -Math.PI / 2;
        selectionRing.position.y = 0.38;
        selectionRing.visible = false;
        root.add(selectionRing);

        group.add(root);
        node = {
          id: bld.id,
          instance: bld,
          root,
          animatedParts,
          beaconMat,
          selectionRing,
          spawnProgress: 0.01,
        };
        nodes.set(bld.id, node);
      }

      node.instance = bld;
      node.selectionRing.visible = bld.id === selectedId;

      const y = getTerrainHeight(bld.x, bld.z);
      const normal = getTerrainNormal(bld.x, bld.z);
      node.root.position.set(bld.x, y, bld.z);

      const up = new THREE.Vector3(0, 1, 0);
      const targetNormal = new THREE.Vector3(normal.x, normal.y, normal.z)
        .lerp(up, 0.45)
        .normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, targetNormal);
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(up, bld.rotation);
      node.root.quaternion.copy(quat).multiply(rotQuat);
    }
  }

  function update(time: number, dt: number) {
    for (const node of nodes.values()) {
      if (node.spawnProgress < 1) {
        node.spawnProgress = Math.min(1, node.spawnProgress + dt * 3.2);
        const s = node.instance.scale * (0.2 + 0.8 * node.spawnProgress);
        node.root.scale.setScalar(s);
      } else {
        node.root.scale.setScalar(node.instance.scale);
      }

      for (const part of node.animatedParts) {
        part.rotation.y = time * 0.85;
      }

      if (node.selectionRing.visible) {
        node.selectionRing.rotation.z = time * 0.9;
      }
    }
  }

  function getInteractiveMeshes(): THREE.Object3D[] {
    return Array.from(nodes.values()).map((n) => n.root);
  }

  function dispose() {
    stoneMat.dispose();
    marbleMat.dispose();
    bronzeMat.dispose();
    terracottaMat.dispose();
    warmWindowMat.dispose();
    glassDomeMat.dispose();
    for (const node of nodes.values()) {
      node.beaconMat.dispose();
      node.selectionRing.geometry.dispose();
    }
    nodes.clear();
  }

  return {
    group,
    sync,
    update,
    getInteractiveMeshes,
    dispose,
  };
}
