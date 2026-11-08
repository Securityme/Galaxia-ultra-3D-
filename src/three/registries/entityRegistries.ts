/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-48: Registres d'Entités & Réconciliation par Diff
 * Maintient une carte `Map<entityId, SceneHandle>` par famille d'entités (bâtiments, PNJ, props).
 * À chaque injection d'état, calcule uniquement le delta `{ created, updated, removed }`,
 * recycle les handles via un pool pré-alloué et appelle `dispose()` systématiquement.
 */

import * as THREE from 'three';

export interface SceneHandle<TData> {
  id: string;
  object3D: THREE.Object3D;
  signature: string;
  data: TData;
}

export interface DiffResult<TData> {
  created: TData[];
  updated: TData[];
  removedIds: string[];
}

export interface EntityRegistry<TData extends { id: string }> {
  readonly handles: ReadonlyMap<string, SceneHandle<TData>>;
  computeDiff: (targetList: readonly TData[], computeSignature: (item: TData) => string) => DiffResult<TData>;
  registerHandle: (id: string, object3D: THREE.Object3D, signature: string, data: TData) => void;
  updateHandle: (id: string, signature: string, data: TData) => void;
  removeHandle: (id: string, parentGroup: THREE.Group, onDispose?: (obj: THREE.Object3D) => void) => void;
  clearAll: (parentGroup: THREE.Group, onDispose?: (obj: THREE.Object3D) => void) => void;
  getPoolSize: () => number;
}

export function createEntityRegistry<TData extends { id: string }>(
  maxPoolCapacity = 32
): EntityRegistry<TData> {
  const handles = new Map<string, SceneHandle<TData>>();
  const recycledPool: THREE.Object3D[] = [];

  function computeDiff(
    targetList: readonly TData[],
    computeSignature: (item: TData) => string
  ): DiffResult<TData> {
    const created: TData[] = [];
    const updated: TData[] = [];
    const targetIds = new Set<string>();

    for (const item of targetList) {
      targetIds.add(item.id);
      const existing = handles.get(item.id);
      const nextSig = computeSignature(item);
      if (!existing) {
        created.push(item);
      } else if (existing.signature !== nextSig) {
        updated.push(item);
      }
    }

    const removedIds: string[] = [];
    handles.forEach((_handle, existingId) => {
      if (!targetIds.has(existingId)) {
        removedIds.push(existingId);
      }
    });

    return { created, updated, removedIds };
  }

  function registerHandle(
    id: string,
    object3D: THREE.Object3D,
    signature: string,
    data: TData
  ): void {
    handles.set(id, { id, object3D, signature, data });
  }

  function updateHandle(id: string, signature: string, data: TData): void {
    const existing = handles.get(id);
    if (existing) {
      existing.signature = signature;
      existing.data = data;
    }
  }

  function disposeObjectHierarchy(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }

  function removeHandle(
    id: string,
    parentGroup: THREE.Group,
    onDispose?: (obj: THREE.Object3D) => void
  ): void {
    const existing = handles.get(id);
    if (!existing) return;

    parentGroup.remove(existing.object3D);
    handles.delete(id);

    if (recycledPool.length < maxPoolCapacity) {
      existing.object3D.visible = false;
      recycledPool.push(existing.object3D);
    }

    if (onDispose) {
      onDispose(existing.object3D);
    } else {
      disposeObjectHierarchy(existing.object3D);
    }
  }

  function clearAll(
    parentGroup: THREE.Group,
    onDispose?: (obj: THREE.Object3D) => void
  ): void {
    const allIds = Array.from(handles.keys());
    for (const id of allIds) {
      removeHandle(id, parentGroup, onDispose);
    }
    recycledPool.length = 0;
  }

  function getPoolSize(): number {
    return recycledPool.length;
  }

  return {
    handles,
    computeDiff,
    registerHandle,
    updateHandle,
    removeHandle,
    clearAll,
    getPoolSize,
  };
}
