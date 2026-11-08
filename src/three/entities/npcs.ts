import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlacedBuilding, PlacedNpc } from '../../contracts/schemas';
import {
  getLocalReliefElevation,
  getTerrainHeight,
} from '../../core/terrainMath';
import { createPRNG } from '../../core/prng';
import { npc_ROLE_SOVEREIGN } from '../../config/constants';
import {
  CustomNpcAssignment,
  resolveNpcRpgProfile,
} from '../../config/rpgCatalogs';
import {
  createBronzeFiligreeTexture,
  createNpcGarmentTexture,
} from '../textures/proceduralTextures';

export interface NpcManager {
  group: THREE.Group;
  sync: (
    npcs: PlacedNpc[],
    selectedId: string | null,
    buildings?: PlacedBuilding[],
    customAssignments?: Record<string, CustomNpcAssignment>
  ) => void;
  update: (
    time: number,
    dt: number,
    buildings: PlacedBuilding[],
    customAssignments?: Record<string, CustomNpcAssignment>
  ) => void;
  getInteractiveMeshes: () => THREE.Object3D[];
  getNpcPosition: (id: string) => THREE.Vector3 | null;
  dispose: () => void;
}

interface NpcRuntimeNode {
  id: string;
  data: PlacedNpc;
  root: THREE.Group;
  proceduralBodyGroup: THREE.Group;
  gltfInstanceGroup: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  walkAction: THREE.AnimationAction | null;
  idleAction: THREE.AnimationAction | null;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  capeMesh: THREE.Mesh;
  crownMesh: THREE.Mesh;
  pauldronLeft: THREE.Mesh;
  pauldronRight: THREE.Mesh;
  accessoryMesh: THREE.Mesh;
  cloakMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  selectionRing: THREE.Mesh;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  commuteToWorkNext: boolean;
  waitTimer: number;
  walkPhase: number;
}

// Official Three.js / Khronos CDN rigged human GLB asset
const WEB_GLB_CHARACTER_URL =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';

/**
 * Blender-Organized Articulated RPG 3D Citizens & Sovereign Figure with:
 * - Asynchronous Web GLTF/GLB rigged character loader + AnimationMixer (Idle / Walk)
 * - Dedicated Brocade Garment & Brushed Bronze PBR Textures (`createNpcGarmentTexture`, `createBronzeFiligreeTexture`)
 * - Commuting AI between player-assigned Home Residence (Maison) and Work Building (Lieu de Travail)
 */
export function createNpcManager(): NpcManager {
  const group = new THREE.Group();
  group.name = 'Collection_04_NpcCitizens';

  const npcRng = createPRNG('GALAXIA-NPCS-COMMUTE-V4');
  const nodes = new Map<string, NpcRuntimeNode>();
  let currentBuildings: PlacedBuilding[] = [];
  let cachedNpcs: PlacedNpc[] = [];
  let currentAssignments: Record<string, CustomNpcAssignment> = {};

  const garmentTex = createNpcGarmentTexture();
  const bronzeTex = createBronzeFiligreeTexture();

  // Web GLB template cache
  let glbTemplateScene: THREE.Group | null = null;
  let glbAnimations: THREE.AnimationClip[] = [];

  const loader = new GLTFLoader();
  loader.load(
    WEB_GLB_CHARACTER_URL,
    (gltf) => {
      glbTemplateScene = gltf.scene;
      glbAnimations = gltf.animations || [];
      for (const node of nodes.values()) {
        attachGltfCloneToNode(node);
      }
    },
    undefined,
    () => {
      // Offline or blocked CDN: procedural articulated RPG rig remains active seamlessly
    }
  );

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf3d4b8,
    roughness: 0.48,
    metalness: 0.04,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x3b281e,
    roughness: 0.65,
  });

  const darkBootMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.25,
  });

  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.56, 12);
  const headGeo = new THREE.SphereGeometry(0.175, 16, 16);
  const hairCapGeo = new THREE.SphereGeometry(0.182, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const collarGeo = new THREE.TorusGeometry(0.21, 0.045, 8, 18);
  const pauldronGeo = new THREE.SphereGeometry(0.11, 10, 10);
  const limbGeo = new THREE.CapsuleGeometry(0.065, 0.29, 6, 10);
  const capeGeo = new THREE.BoxGeometry(0.38, 0.62, 0.045);
  const crownGeo = new THREE.TorusGeometry(0.155, 0.036, 8, 18);
  const scepterGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8);
  const orbAccessoryGeo = new THREE.OctahedronGeometry(0.12, 1);

  function attachGltfCloneToNode(node: NpcRuntimeNode) {
    if (!glbTemplateScene || node.gltfInstanceGroup) return;
    try {
      const cloned = SkeletonUtils.clone(glbTemplateScene) as THREE.Group;
      cloned.scale.setScalar(0.68);
      cloned.rotation.y = Math.PI;

      const isSovereign = node.data.role === npc_ROLE_SOVEREIGN;
      const tintColor = new THREE.Color(node.data.colorHex || '#38bdf8');

      cloned.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          if (m.material) {
            const mat = (m.material as THREE.MeshStandardMaterial).clone();
            mat.color.lerp(tintColor, 0.48);
            m.material = mat;
          }
          m.userData = { entityType: 'npc', entityId: node.id };
        }
      });

      node.root.add(cloned);
      node.gltfInstanceGroup = cloned;

      node.proceduralBodyGroup.visible = false;
      node.crownMesh.visible = isSovereign;
      node.capeMesh.visible = true;

      if (glbAnimations.length > 0) {
        const mixer = new THREE.AnimationMixer(cloned);
        const idleClip =
          THREE.AnimationClip.findByName(glbAnimations, 'Idle') || glbAnimations[0];
        const walkClip =
          THREE.AnimationClip.findByName(glbAnimations, 'Walk') ||
          THREE.AnimationClip.findByName(glbAnimations, 'Run') ||
          glbAnimations[1] ||
          glbAnimations[0];

        if (idleClip) {
          node.idleAction = mixer.clipAction(idleClip);
          node.idleAction.play();
        }
        if (walkClip) {
          node.walkAction = mixer.clipAction(walkClip);
        }
        node.mixer = mixer;
      }
    } catch {
      // Keep articulated procedural body if clone fails
    }
  }

  function pickNextDestination(node: NpcRuntimeNode, buildings: PlacedBuilding[]) {
    if (buildings.length > 0) {
      const rpg = resolveNpcRpgProfile(
        node.data,
        buildings,
        cachedNpcs,
        currentAssignments
      );
      const targetBldId = node.commuteToWorkNext
        ? rpg.workBuildingId
        : rpg.homeBuildingId;
      node.commuteToWorkNext = !node.commuteToWorkNext;

      const targetBld =
        buildings.find((b) => b.id === targetBldId) ??
        buildings[Math.floor(npcRng() * buildings.length)];

      if (targetBld && npcRng() < 0.85) {
        const angle = npcRng() * Math.PI * 2;
        const dist = 2.2 + npcRng() * 1.9;
        node.targetX = targetBld.x + Math.cos(angle) * dist;
        node.targetZ = targetBld.z + Math.sin(angle) * dist;
        return;
      }
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = npcRng() * Math.PI * 2;
      const radius = 3.5 + npcRng() * 28;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      if (getLocalReliefElevation(tx, tz) > 0.08) {
        node.targetX = tx;
        node.targetZ = tz;
        return;
      }
    }
    node.targetX = 0;
    node.targetZ = 0;
  }

  function sync(
    npcs: PlacedNpc[],
    selectedId: string | null,
    buildings: PlacedBuilding[] = currentBuildings,
    customAssignments: Record<string, CustomNpcAssignment> = currentAssignments
  ) {
    currentBuildings = buildings;
    cachedNpcs = npcs;
    currentAssignments = customAssignments;
    const incomingIds = new Set(npcs.map((n) => n.id));

    for (const [id, node] of nodes.entries()) {
      if (!incomingIds.has(id)) {
        group.remove(node.root);
        node.cloakMat.dispose();
        node.trimMat.dispose();
        node.selectionRing.geometry.dispose();
        nodes.delete(id);
      }
    }

    for (const npc of npcs) {
      let node = nodes.get(npc.id);
      const isSovereign = npc.role === npc_ROLE_SOVEREIGN;
      const rpg = resolveNpcRpgProfile(
        npc,
        currentBuildings,
        npcs,
        currentAssignments
      );

      if (!node) {
        const cloakMat = new THREE.MeshStandardMaterial({
          color: npc.colorHex || rpg.outfit.tunicColor,
          map: garmentTex,
          bumpMap: garmentTex,
          bumpScale: 0.03,
          roughness: 0.42,
          metalness: 0.18,
        });

        const trimMat = new THREE.MeshStandardMaterial({
          color: rpg.outfit.trimColor || '#fbbf24',
          map: bronzeTex,
          emissive: rpg.house.primaryColor,
          emissiveIntensity: 0.28,
          roughness: 0.28,
          metalness: 0.78,
        });

        const root = new THREE.Group();
        root.userData = { entityType: 'npc', entityId: npc.id };

        const proceduralBodyGroup = new THREE.Group();
        root.add(proceduralBodyGroup);

        // Legs
        const leftLeg = new THREE.Mesh(limbGeo, darkBootMat);
        leftLeg.position.set(-0.09, 0.24, 0);
        leftLeg.castShadow = true;
        proceduralBodyGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(limbGeo, darkBootMat);
        rightLeg.position.set(0.09, 0.24, 0);
        rightLeg.castShadow = true;
        proceduralBodyGroup.add(rightLeg);

        // Torso tunic
        const torsoMesh = new THREE.Mesh(torsoGeo, cloakMat);
        torsoMesh.position.y = 0.62;
        torsoMesh.castShadow = true;
        proceduralBodyGroup.add(torsoMesh);

        // Arms
        const leftArm = new THREE.Mesh(limbGeo, cloakMat);
        leftArm.position.set(-0.24, 0.62, 0);
        leftArm.castShadow = true;
        proceduralBodyGroup.add(leftArm);

        const rightArm = new THREE.Mesh(limbGeo, cloakMat);
        rightArm.position.set(0.24, 0.62, 0);
        rightArm.castShadow = true;
        proceduralBodyGroup.add(rightArm);

        // Pauldrons (Shoulder armor for Sovereign / Guard / Engineer)
        const pauldronLeft = new THREE.Mesh(pauldronGeo, trimMat);
        pauldronLeft.position.set(-0.24, 0.82, 0);
        pauldronLeft.visible = rpg.outfit.hasPauldrons;
        proceduralBodyGroup.add(pauldronLeft);

        const pauldronRight = new THREE.Mesh(pauldronGeo, trimMat);
        pauldronRight.position.set(0.24, 0.82, 0);
        pauldronRight.visible = rpg.outfit.hasPauldrons;
        proceduralBodyGroup.add(pauldronRight);

        // Held Accessory (Scepter / Astrolabe / Halberd / Orb) attached to Right Arm
        const isStaff =
          rpg.outfit.heldAccessory === 'scepter' ||
          rpg.outfit.heldAccessory === 'halberd';
        const accessoryMesh = new THREE.Mesh(
          isStaff ? scepterGeo : orbAccessoryGeo,
          trimMat
        );
        accessoryMesh.position.set(0, -0.14, 0.14);
        if (isStaff) accessoryMesh.rotation.x = Math.PI * 0.35;
        rightArm.add(accessoryMesh);

        // Gold Collar
        const collar = new THREE.Mesh(collarGeo, trimMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.88;
        proceduralBodyGroup.add(collar);

        // Head & Hair
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.position.y = 1.08;
        headMesh.castShadow = true;
        proceduralBodyGroup.add(headMesh);

        const hairMesh = new THREE.Mesh(hairCapGeo, hairMat);
        hairMesh.position.y = 1.1;
        proceduralBodyGroup.add(hairMesh);

        // Flowing Cape (kept at root level so it also adorns GLB models)
        const capeMesh = new THREE.Mesh(capeGeo, cloakMat);
        capeMesh.position.set(0, 0.58, -0.19);
        capeMesh.rotation.x = 0.18;
        capeMesh.visible = rpg.outfit.hasCape;
        capeMesh.castShadow = true;
        root.add(capeMesh);

        // Imperial Crown / Halo Laurel
        const crownMesh = new THREE.Mesh(crownGeo, trimMat);
        crownMesh.rotation.x = Math.PI / 2;
        crownMesh.position.y = 1.24;
        crownMesh.visible = isSovereign || rpg.outfit.hasCrownOrLaurel;
        root.add(crownMesh);

        const selectionRing = new THREE.Mesh(
          new THREE.RingGeometry(0.48, 0.65, 28),
          new THREE.MeshBasicMaterial({
            color: 0xf5c869,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92,
          })
        );
        selectionRing.rotation.x = -Math.PI / 2;
        selectionRing.position.y = 0.08;
        selectionRing.visible = false;
        root.add(selectionRing);

        root.traverse((obj) => {
          obj.userData = { entityType: 'npc', entityId: npc.id };
        });

        const y = getTerrainHeight(npc.x, npc.z);
        root.position.set(npc.x, y, npc.z);
        if (isSovereign) {
          root.scale.setScalar(1.22);
        }
        group.add(root);

        node = {
          id: npc.id,
          data: npc,
          root,
          proceduralBodyGroup,
          gltfInstanceGroup: null,
          mixer: null,
          walkAction: null,
          idleAction: null,
          leftArm,
          rightArm,
          leftLeg,
          rightLeg,
          capeMesh,
          crownMesh,
          pauldronLeft,
          pauldronRight,
          accessoryMesh,
          cloakMat,
          trimMat,
          selectionRing,
          x: npc.x,
          z: npc.z,
          targetX: npc.targetX,
          targetZ: npc.targetZ,
          commuteToWorkNext: true,
          waitTimer: npcRng() * 2,
          walkPhase: npcRng() * Math.PI * 2,
        };
        nodes.set(npc.id, node);

        if (glbTemplateScene) {
          attachGltfCloneToNode(node);
        }
      }

      node.data = npc;
      node.cloakMat.color.set(npc.colorHex || rpg.outfit.tunicColor);
      node.crownMesh.visible = isSovereign || rpg.outfit.hasCrownOrLaurel;
      node.root.scale.setScalar(isSovereign ? 1.22 : 1.0);
      node.selectionRing.visible = npc.id === selectedId;
    }
  }

  function update(
    time: number,
    dt: number,
    buildings: PlacedBuilding[],
    customAssignments?: Record<string, CustomNpcAssignment>
  ) {
    currentBuildings = buildings;
    if (customAssignments) {
      currentAssignments = customAssignments;
    }

    for (const node of nodes.values()) {
      const dx = node.targetX - node.x;
      const dz = node.targetZ - node.z;
      const dist = Math.hypot(dx, dz);
      const isMoving = dist >= 0.45;

      if (node.mixer) {
        node.mixer.update(dt);
        if (isMoving) {
          if (node.walkAction && !node.walkAction.isRunning()) {
            node.idleAction?.fadeOut(0.2);
            node.walkAction.reset().fadeIn(0.2).play();
          }
        } else {
          if (node.idleAction && !node.idleAction.isRunning()) {
            node.walkAction?.fadeOut(0.2);
            node.idleAction.reset().fadeIn(0.2).play();
          }
        }
      }

      if (!isMoving) {
        node.waitTimer -= dt;
        node.leftArm.rotation.x = THREE.MathUtils.lerp(node.leftArm.rotation.x, 0, dt * 6);
        node.rightArm.rotation.x = THREE.MathUtils.lerp(node.rightArm.rotation.x, 0, dt * 6);
        node.leftLeg.rotation.x = THREE.MathUtils.lerp(node.leftLeg.rotation.x, 0, dt * 6);
        node.rightLeg.rotation.x = THREE.MathUtils.lerp(node.rightLeg.rotation.x, 0, dt * 6);

        if (node.waitTimer <= 0) {
          pickNextDestination(node, buildings);
          node.waitTimer = 1.8 + npcRng() * 3.0;
        }
      } else {
        const speed = 1.68;
        const step = Math.min(dist, speed * dt);
        const nx = node.x + (dx / dist) * step;
        const nz = node.z + (dz / dist) * step;
        const nextLocalElev = getLocalReliefElevation(nx, nz);

        if (nextLocalElev <= -0.02) {
          pickNextDestination(node, buildings);
        } else {
          node.x = nx;
          node.z = nz;
          node.walkPhase += dt * 8.5;
          const targetYaw = Math.atan2(dx, dz);
          node.root.rotation.y = targetYaw;

          const swing = Math.sin(node.walkPhase) * 0.55;
          node.leftLeg.rotation.x = swing;
          node.rightLeg.rotation.x = -swing;
          node.leftArm.rotation.x = -swing * 0.8;
          node.rightArm.rotation.x = swing * 0.8;
          node.capeMesh.rotation.x = 0.22 + Math.abs(swing) * 0.18;
        }
      }

      const groundY = getTerrainHeight(node.x, node.z);
      const bob = isMoving && !node.mixer ? Math.abs(Math.sin(node.walkPhase)) * 0.065 : 0;
      node.root.position.set(node.x, groundY + bob, node.z);

      if (node.selectionRing.visible) {
        node.selectionRing.rotation.z = time * 1.4;
      }
    }
  }

  function getInteractiveMeshes(): THREE.Object3D[] {
    return Array.from(nodes.values()).map((n) => n.root);
  }

  function getNpcPosition(id: string): THREE.Vector3 | null {
    const node = nodes.get(id);
    if (!node) return null;
    return node.root.position.clone();
  }

  function dispose() {
    skinMat.dispose();
    hairMat.dispose();
    darkBootMat.dispose();
    torsoGeo.dispose();
    headGeo.dispose();
    hairCapGeo.dispose();
    collarGeo.dispose();
    pauldronGeo.dispose();
    limbGeo.dispose();
    capeGeo.dispose();
    crownGeo.dispose();
    scepterGeo.dispose();
    orbAccessoryGeo.dispose();
    for (const node of nodes.values()) {
      node.cloakMat.dispose();
      node.trimMat.dispose();
      node.selectionRing.geometry.dispose();
    }
    nodes.clear();
  }

  return {
    group,
    sync,
    update,
    getInteractiveMeshes,
    getNpcPosition,
    dispose,
  };
}
