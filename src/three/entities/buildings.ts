/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Blender-Grade Principled BSDF 3D Architectural Landmarks
 * Every building uses multi-channel 512x512 PBR textures:
 * - Albedo Map (sRGB veined marble / obsidian basalt / imperial porphyry / lapis ceramic / travertine)
 * - Tangent-Space 3x3 Sobel Normal Map (beveled ashlar joints, fluted friezes, coffered domes, curved barrel tiles)
 * - Linear Roughness Map (polished stone faces vs matte mortar joints)
 * - Clearcoat & Emissive Mullioned Arch Windows
 */

import * as THREE from 'three';
import { PlacedBuilding } from '../../contracts/schemas';
import {
  BuildingType,
  bld_TYPE_OBSERVATION,
  bld_TYPE_BIO_DOME,
  bld_TYPE_RELAY_TOWER,
  bld_TYPE_HABITAT,
  bld_TYPE_GREENHOUSE,
} from '../../config/constants';
import { ARCHITECTURAL_CATALOG, NOBLE_HOUSES_CATALOG } from '../../config/rpgCatalogs';
import { getTerrainHeight, getTerrainNormal } from '../../core/terrainMath';
import {
  BUILDING_PBR_MATERIAL_SPECS,
  BuildingPbrMaterialId,
  createArchWindowPbrTexture,
  createBronzeFiligreePbrMaps,
  createBuildingPbrMaterialMaps,
  createCliffStrataTexture,
  createRoofTilePbrMaps,
  createTerrainBumpTexture,
} from '../textures/proceduralTextures';

export interface BuildingsManager {
  group: THREE.Group;
  sync: (buildings: PlacedBuilding[], selectedId: string | null) => void;
  update: (time: number, dt: number) => void;
  getInteractiveMeshes: () => THREE.Object3D[];
  dispose: () => void;
}

interface BuildingPbrBundle {
  presetId: BuildingPbrMaterialId;
  facadeMat: THREE.MeshPhysicalMaterial;
  roofMat: THREE.MeshStandardMaterial;
  bronzeMat: THREE.MeshPhysicalMaterial;
}

interface BuildingNode {
  id: string;
  instance: PlacedBuilding;
  appliedMaterialPreset: BuildingPbrMaterialId;
  root: THREE.Group;
  tier2WingsGroup: THREE.Group;
  tier3CrownGroup: THREE.Group;
  animatedParts: THREE.Object3D[];
  brazierFlames: THREE.Mesh[];
  beaconMat: THREE.MeshStandardMaterial;
  houseBannerMat: THREE.MeshStandardMaterial;
  selectionRing: THREE.Mesh;
  spawnProgress: number;
}

export function resolveDefaultBuildingMaterialPreset(
  buildingType: BuildingType
): BuildingPbrMaterialId {
  switch (buildingType) {
    case bld_TYPE_OBSERVATION:
      return 'celestial_azure';
    case bld_TYPE_BIO_DOME:
    case bld_TYPE_GREENHOUSE:
      return 'emerald_travertine';
    case bld_TYPE_RELAY_TOWER:
      return 'obsidian_bronze';
    case bld_TYPE_HABITAT:
    default:
      return 'carrara_gold';
  }
}

export function createBuildingsManager(): BuildingsManager {
  const group = new THREE.Group();
  group.name = 'Collection_03_ArchitecturalLandmarks';

  const nodes = new Map<string, BuildingNode>();
  const pbrBundles = new Map<BuildingPbrMaterialId, BuildingPbrBundle>();

  const stoneTex = createCliffStrataTexture();
  const bumpTex = createTerrainBumpTexture();
  const windowTex = createArchWindowPbrTexture();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6dcc8,
    map: stoneTex,
    bumpMap: bumpTex,
    bumpScale: 0.09,
    roughness: 0.68,
    metalness: 0.08,
  });

  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: windowTex,
    emissive: 0xf59e0b,
    emissiveMap: windowTex,
    emissiveIntensity: 1.15,
    roughness: 0.16,
    metalness: 0.2,
  });

  const brazierEmberMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf97316,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  const glassDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff5ff,
    roughness: 0.08,
    metalness: 0.06,
    transmission: 0.72,
    ior: 1.52,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.88,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x3b8c58,
    bumpMap: bumpTex,
    bumpScale: 0.05,
    roughness: 0.62,
  });

  function getOrCreatePbrBundle(presetId: BuildingPbrMaterialId): BuildingPbrBundle {
    const existing = pbrBundles.get(presetId);
    if (existing) return existing;

    const spec =
      BUILDING_PBR_MATERIAL_SPECS[presetId] ?? BUILDING_PBR_MATERIAL_SPECS.carrara_gold;
    const facadeMaps = createBuildingPbrMaterialMaps(spec.id);
    const roofMaps = createRoofTilePbrMaps(spec.roofHex);
    const bronzeMaps = createBronzeFiligreePbrMaps(spec.trimHex);

    const facadeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: facadeMaps.albedoMap,
      normalMap: facadeMaps.normalMap,
      normalScale: new THREE.Vector2(spec.normalScale, spec.normalScale),
      roughnessMap: facadeMaps.roughnessMap,
      roughness: 1.0,
      metalness: spec.metalness,
      clearcoat: spec.clearcoat,
      clearcoatRoughness: 0.24,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roofMaps.albedoMap,
      normalMap: roofMaps.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: roofMaps.roughnessMap,
      roughness: 0.95,
      metalness: 0.1,
    });

    const bronzeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: bronzeMaps.albedoMap,
      normalMap: bronzeMaps.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: bronzeMaps.roughnessMap,
      roughness: 0.85,
      metalness: 0.84,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
    });

    const bundle: BuildingPbrBundle = {
      presetId: spec.id,
      facadeMat,
      roofMat,
      bronzeMat,
    };
    pbrBundles.set(presetId, bundle);
    return bundle;
  }

  function applyPbrBundleToHierarchy(root: THREE.Group, bundle: BuildingPbrBundle): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const slot = obj.userData?.pbrSlot as string | undefined;
      if (slot === 'facade') {
        obj.material = bundle.facadeMat;
      } else if (slot === 'roof') {
        obj.material = bundle.roofMat;
      } else if (slot === 'bronze') {
        obj.material = bundle.bronzeMat;
      }
    });
  }

  function tagSlot(mesh: THREE.Mesh, slot: 'facade' | 'roof' | 'bronze'): THREE.Mesh {
    mesh.userData = { ...mesh.userData, pbrSlot: slot };
    return mesh;
  }

  function buildArchitecturalMesh(
    instance: PlacedBuilding,
    bundle: BuildingPbrBundle,
    beaconMat: THREE.MeshStandardMaterial,
    houseBannerMat: THREE.MeshStandardMaterial,
    animatedParts: THREE.Object3D[],
    brazierFlames: THREE.Mesh[]
  ): {
    root: THREE.Group;
    tier2WingsGroup: THREE.Group;
    tier3CrownGroup: THREE.Group;
  } {
    const root = new THREE.Group();
    root.name = `Bld_${instance.buildingType}_${instance.id}`;

    const { facadeMat, roofMat, bronzeMat } = bundle;

    // 1. Stepped Stone Foundation Plinth + Carved Balustrade Rim + Classical Portico Entrance
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 2.08, 0.95, 16), stoneMat);
    plinth.position.y = 0.25;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    root.add(plinth);

    const upperPlinth = tagSlot(
      new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.68, 0.38, 16), facadeMat),
      'facade'
    );
    upperPlinth.position.y = 0.78;
    upperPlinth.castShadow = true;
    upperPlinth.receiveShadow = true;
    root.add(upperPlinth);

    const balustradeRing = tagSlot(
      new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.045, 8, 24), bronzeMat),
      'bronze'
    );
    balustradeRing.rotation.x = Math.PI / 2;
    balustradeRing.position.y = 0.98;
    root.add(balustradeRing);

    // Grand Staircase + Classical Portico Pediment
    const stairBlock = tagSlot(
      new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.56, 1.12), facadeMat),
      'facade'
    );
    stairBlock.position.set(0, 0.52, 1.52);
    stairBlock.castShadow = true;
    root.add(stairBlock);

    for (const side of [-0.34, 0.34]) {
      const porticoCol = tagSlot(
        new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.95, 10), facadeMat),
        'facade'
      );
      porticoCol.position.set(side, 1.24, 1.32);
      porticoCol.castShadow = true;
      root.add(porticoCol);
    }

    const pediment = tagSlot(
      new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.36, 4), roofMat),
      'roof'
    );
    pediment.position.set(0, 1.85, 1.32);
    pediment.rotation.y = Math.PI / 4;
    root.add(pediment);

    // Noble House Standards + Corner Imperial Braziers
    for (const side of [-0.56, 0.56]) {
      const pole = tagSlot(
        new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.48, 6), bronzeMat),
        'bronze'
      );
      pole.position.set(side, 1.35, 1.56);
      root.add(pole);

      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.03), houseBannerMat);
      banner.position.set(side, 1.55, 1.59);
      banner.castShadow = true;
      root.add(banner);
    }

    for (let b = 0; b < 4; b++) {
      const ang = (b / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(ang) * 1.46;
      const bz = Math.sin(ang) * 1.46;

      const brazierBowl = tagSlot(
        new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.24, 8), bronzeMat),
        'bronze'
      );
      brazierBowl.position.set(bx, 1.06, bz);
      root.add(brazierBowl);

      const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), brazierEmberMat);
      ember.position.set(bx, 1.22, bz);
      root.add(ember);
      brazierFlames.push(ember);
    }

    // 2. Specialized Monumental Superstructure per Building Type
    switch (instance.buildingType) {
      case bld_TYPE_OBSERVATION: {
        const tower = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.06, 2.38, 16), facadeMat),
          'facade'
        );
        tower.position.y = 2.0;
        tower.castShadow = true;
        tower.receiveShadow = true;
        root.add(tower);

        for (let c = 0; c < 8; c++) {
          const ang = (c / 8) * Math.PI * 2;
          const col = tagSlot(
            new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.28, 10), facadeMat),
            'facade'
          );
          col.position.set(Math.cos(ang) * 1.26, 1.52, Math.sin(ang) * 1.26);
          col.castShadow = true;
          root.add(col);
        }

        const entablatureRing = tagSlot(
          new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.07, 8, 24), bronzeMat),
          'bronze'
        );
        entablatureRing.rotation.x = Math.PI / 2;
        entablatureRing.position.y = 2.18;
        root.add(entablatureRing);

        for (let w = 0; w < 6; w++) {
          const ang = (w / 6) * Math.PI * 2;
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.08), warmWindowMat);
          win.position.set(Math.cos(ang) * 0.9, 2.52, Math.sin(ang) * 0.9);
          win.rotation.y = -ang + Math.PI / 2;
          root.add(win);
        }

        const cornice = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.96, 0.28, 16), bronzeMat),
          'bronze'
        );
        cornice.position.y = 3.22;
        root.add(cornice);

        const dome = tagSlot(
          new THREE.Mesh(
            new THREE.SphereGeometry(0.94, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
            bronzeMat
          ),
          'bronze'
        );
        dome.position.y = 3.3;
        dome.castShadow = true;
        root.add(dome);

        const armillaryGroup = new THREE.Group();
        armillaryGroup.position.y = 4.58;
        const ring1 = tagSlot(
          new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 10, 28), bronzeMat),
          'bronze'
        );
        const ring2 = tagSlot(
          new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 10, 24), bronzeMat),
          'bronze'
        );
        ring2.rotation.x = Math.PI / 3;
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), beaconMat);
        armillaryGroup.add(ring1, ring2, core);
        root.add(armillaryGroup);
        animatedParts.push(armillaryGroup);
        break;
      }

      case bld_TYPE_BIO_DOME: {
        const ringWall = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.34, 0.9, 16), facadeMat),
          'facade'
        );
        ringWall.position.y = 1.28;
        ringWall.castShadow = true;
        root.add(ringWall);

        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const pilaster = tagSlot(
            new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.98, 0.15), bronzeMat),
            'bronze'
          );
          pilaster.position.set(Math.cos(ang) * 1.31, 1.32, Math.sin(ang) * 1.31);
          pilaster.rotation.y = -ang;
          root.add(pilaster);
        }

        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
          glassDomeMat
        );
        dome.position.y = 1.68;
        root.add(dome);

        const ribRing = tagSlot(
          new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 28), bronzeMat),
          'bronze'
        );
        ribRing.rotation.x = Math.PI / 2;
        ribRing.position.y = 1.7;
        root.add(ribRing);

        for (let m = 0; m < 2; m++) {
          const meridianArc = tagSlot(
            new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.038, 8, 28, Math.PI), bronzeMat),
            'bronze'
          );
          meridianArc.position.y = 1.68;
          meridianArc.rotation.y = (m * Math.PI) / 2;
          root.add(meridianArc);
        }

        const innerFoliage = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.64, 1),
          foliageMat
        );
        innerFoliage.position.y = 1.95;
        root.add(innerFoliage);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), beaconMat);
        finial.position.y = 3.06;
        root.add(finial);
        break;
      }

      case bld_TYPE_RELAY_TOWER: {
        const shaft = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.8, 3.05, 8), facadeMat),
          'facade'
        );
        shaft.position.y = 2.35;
        shaft.castShadow = true;
        root.add(shaft);

        for (let b = 0; b < 4; b++) {
          const ang = (b / 4) * Math.PI * 2;
          const buttress = tagSlot(
            new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.35, 0.68), bronzeMat),
            'bronze'
          );
          buttress.position.set(Math.cos(ang) * 0.72, 1.45, Math.sin(ang) * 0.72);
          buttress.rotation.y = -ang + Math.PI / 2;
          buttress.castShadow = true;
          root.add(buttress);
        }

        for (let c = 0; c < 3; c++) {
          const collar = tagSlot(
            new THREE.Mesh(new THREE.TorusGeometry(0.62 - c * 0.09, 0.06, 8, 24), bronzeMat),
            'bronze'
          );
          collar.rotation.x = Math.PI / 2;
          collar.position.y = 1.75 + c * 0.7;
          root.add(collar);
        }

        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), beaconMat);
        crystal.position.y = 4.38;
        root.add(crystal);
        animatedParts.push(crystal);
        break;
      }

      case bld_TYPE_HABITAT: {
        const mainHall = tagSlot(
          new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.28, 1.46), facadeMat),
          'facade'
        );
        mainHall.position.y = 1.52;
        mainHall.castShadow = true;
        mainHall.receiveShadow = true;
        root.add(mainHall);

        const roof = tagSlot(
          new THREE.Mesh(new THREE.ConeGeometry(1.52, 0.95, 4), roofMat),
          'roof'
        );
        roof.position.y = 2.56;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        root.add(roof);

        const roofCrest = tagSlot(
          new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.08, 1.54), bronzeMat),
          'bronze'
        );
        roofCrest.position.y = 2.12;
        root.add(roofCrest);

        for (let wx = -0.52; wx <= 0.52; wx += 0.52) {
          const winFront = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.42, 0.07),
            warmWindowMat
          );
          winFront.position.set(wx, 1.6, 0.74);
          root.add(winFront);

          const winBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.42, 0.07),
            warmWindowMat
          );
          winBack.position.set(wx, 1.6, -0.74);
          root.add(winBack);
        }

        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), beaconMat);
        lantern.position.y = 3.1;
        root.add(lantern);
        break;
      }

      case bld_TYPE_GREENHOUSE:
      default: {
        const tier1 = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.34, 0.68, 12), facadeMat),
          'facade'
        );
        tier1.position.y = 1.22;
        tier1.castShadow = true;
        root.add(tier1);

        const gardenRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.06, 0.17, 8, 20),
          foliageMat
        );
        gardenRing.rotation.x = Math.PI / 2;
        gardenRing.position.y = 1.56;
        root.add(gardenRing);

        const tier2 = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(0.84, 1.0, 0.7, 12), facadeMat),
          'facade'
        );
        tier2.position.y = 1.88;
        tier2.castShadow = true;
        root.add(tier2);

        const column = tagSlot(
          new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.48, 12), bronzeMat),
          'bronze'
        );
        column.position.y = 2.86;
        root.add(column);

        const sunDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.64, 0.64, 0.12, 24),
          beaconMat
        );
        sunDisc.rotation.x = Math.PI / 3;
        sunDisc.position.y = 3.84;
        root.add(sunDisc);
        animatedParts.push(sunDisc);
        break;
      }
    }

    // 3. TIER II EXPANSION: Flanking Classical Pavilions & Colonnade Wings
    const tier2WingsGroup = new THREE.Group();
    tier2WingsGroup.name = 'SubCollection_Tier2_Wings';
    for (const side of [-1, 1]) {
      const wingBox = tagSlot(
        new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.96, 1.08), facadeMat),
        'facade'
      );
      wingBox.position.set(side * 1.46, 1.32, -0.1);
      wingBox.castShadow = true;
      tier2WingsGroup.add(wingBox);

      const wingRoof = tagSlot(
        new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.56, 4), roofMat),
        'roof'
      );
      wingRoof.position.set(side * 1.46, 2.04, -0.1);
      wingRoof.rotation.y = Math.PI / 4;
      tier2WingsGroup.add(wingRoof);

      const wingWin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.06), warmWindowMat);
      wingWin.position.set(side * 1.46, 1.38, 0.45);
      tier2WingsGroup.add(wingWin);
    }
    root.add(tier2WingsGroup);

    // 4. TIER III EXPANSION: Monumental Imperial Solar Halo & Grand Obelisks
    const tier3CrownGroup = new THREE.Group();
    tier3CrownGroup.name = 'SubCollection_Tier3_ImperialCrown';
    const grandHalo = tagSlot(
      new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.058, 10, 36), bronzeMat),
      'bronze'
    );
    grandHalo.rotation.x = Math.PI / 2;
    grandHalo.position.y = 3.88;
    tier3CrownGroup.add(grandHalo);
    animatedParts.push(grandHalo);

    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const spire = tagSlot(
        new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.98, 6), bronzeMat),
        'bronze'
      );
      spire.position.set(Math.cos(ang) * 1.56, 1.46, Math.sin(ang) * 1.56);
      tier3CrownGroup.add(spire);
    }
    root.add(tier3CrownGroup);

    root.traverse((obj) => {
      obj.userData = {
        ...obj.userData,
        entityType: 'building',
        entityId: instance.id,
      };
    });

    return { root, tier2WingsGroup, tier3CrownGroup };
  }

  function sync(buildings: PlacedBuilding[], selectedId: string | null) {
    const incomingIds = new Set(buildings.map((b) => b.id));

    for (const [id, node] of nodes.entries()) {
      if (!incomingIds.has(id)) {
        group.remove(node.root);
        node.beaconMat.dispose();
        node.houseBannerMat.dispose();
        node.selectionRing.geometry.dispose();
        nodes.delete(id);
      }
    }

    for (const bld of buildings) {
      let node = nodes.get(bld.id);
      const desiredPreset: BuildingPbrMaterialId =
        bld.materialPreset ?? resolveDefaultBuildingMaterialPreset(bld.buildingType);
      const bundle = getOrCreatePbrBundle(desiredPreset);

      const catEntry =
        ARCHITECTURAL_CATALOG.find((c) => c.buildingType === bld.buildingType) ??
        ARCHITECTURAL_CATALOG[0];
      const patronHouse =
        NOBLE_HOUSES_CATALOG.find((h) => h.id === catEntry.patronHouseId) ??
        NOBLE_HOUSES_CATALOG[0];

      if (!node) {
        const beaconMat = new THREE.MeshStandardMaterial({
          color: patronHouse.primaryColor,
          emissive: patronHouse.primaryColor,
          emissiveIntensity: 0.92,
          roughness: 0.2,
          metalness: 0.35,
        });

        const houseBannerMat = new THREE.MeshStandardMaterial({
          color: patronHouse.primaryColor,
          roughness: 0.42,
          metalness: 0.22,
        });

        const animatedParts: THREE.Object3D[] = [];
        const brazierFlames: THREE.Mesh[] = [];
        const { root, tier2WingsGroup, tier3CrownGroup } = buildArchitecturalMesh(
          bld,
          bundle,
          beaconMat,
          houseBannerMat,
          animatedParts,
          brazierFlames
        );

        const selectionRing = new THREE.Mesh(
          new THREE.RingGeometry(2.05, 2.38, 36),
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
          appliedMaterialPreset: desiredPreset,
          root,
          tier2WingsGroup,
          tier3CrownGroup,
          animatedParts,
          brazierFlames,
          beaconMat,
          houseBannerMat,
          selectionRing,
          spawnProgress: 0.01,
        };
        nodes.set(bld.id, node);
      } else if (node.appliedMaterialPreset !== desiredPreset) {
        applyPbrBundleToHierarchy(node.root, bundle);
        node.appliedMaterialPreset = desiredPreset;
      }

      node.instance = bld;
      const tier = bld.tier ?? 1;
      node.tier2WingsGroup.visible = tier >= 2;
      node.tier3CrownGroup.visible = tier >= 3;
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
      const tierScaleBoost = 1 + ((node.instance.tier ?? 1) - 1) * 0.08;
      if (node.spawnProgress < 1) {
        node.spawnProgress = Math.min(1, node.spawnProgress + dt * 3.2);
        const s =
          node.instance.scale *
          tierScaleBoost *
          (0.2 + 0.8 * node.spawnProgress);
        node.root.scale.setScalar(s);
      } else {
        node.root.scale.setScalar(node.instance.scale * tierScaleBoost);
      }

      for (const part of node.animatedParts) {
        part.rotation.y = time * 0.85;
      }

      for (let i = 0; i < node.brazierFlames.length; i++) {
        const ember = node.brazierFlames[i];
        ember.rotation.y = time * 1.6 + i;
        const pulse = 0.92 + Math.sin(time * 4.5 + i * 1.4) * 0.14;
        ember.scale.setScalar(pulse);
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
    warmWindowMat.dispose();
    brazierEmberMat.dispose();
    glassDomeMat.dispose();
    foliageMat.dispose();
    for (const bundle of pbrBundles.values()) {
      bundle.facadeMat.dispose();
      bundle.roofMat.dispose();
      bundle.bronzeMat.dispose();
    }
    pbrBundles.clear();
    for (const node of nodes.values()) {
      node.beaconMat.dispose();
      node.houseBannerMat.dispose();
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
