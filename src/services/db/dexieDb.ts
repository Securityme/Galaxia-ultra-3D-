/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * Local Offline Storage via Dexie.js (IndexedDB)
 * Stores imperial save slots, event chronicles, and deterministic simulation snapshots.
 */

import Dexie, { Table } from 'dexie';
import { ChronicleEntry, SaveSlot, TurnLedgerRecord } from '../../contracts/schemas';

export interface DexieSaveRecord extends SaveSlot {
  updatedAt: number;
}

export interface DexieChronicleRecord extends ChronicleEntry {
  worldSeed: string;
}

export class BioDomeDatabase extends Dexie {
  saves!: Table<DexieSaveRecord, string>;
  chronicles!: Table<DexieChronicleRecord, string>;
  ledgers!: Table<TurnLedgerRecord, string>;

  constructor() {
    super('BioDomeImperialDB_v4');
    this.version(1).stores({
      saves: 'slotId, label, savedAt, updatedAt',
      chronicles: 'id, turnNumber, category, threadId, worldSeed',
      ledgers: 'id, turnNumber, hash',
    });
  }
}

export const bioDomeDb = new BioDomeDatabase();

/**
 * Persists save slot to Dexie IndexedDB.
 */
export async function saveSlotToDexie(slot: SaveSlot): Promise<void> {
  try {
    await bioDomeDb.saves.put({
      ...slot,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[DexieDB] Failed to save slot to IndexedDB:', err);
  }
}

/**
 * Loads save slot from Dexie IndexedDB.
 */
export async function loadSlotFromDexie(slotId: string): Promise<SaveSlot | null> {
  try {
    const rec = await bioDomeDb.saves.get(slotId);
    return rec ?? null;
  } catch (err) {
    console.warn('[DexieDB] Failed to load slot from IndexedDB:', err);
    return null;
  }
}

/**
 * Lists all save slots stored in Dexie IndexedDB.
 */
export async function listDexieSaves(): Promise<DexieSaveRecord[]> {
  try {
    return await bioDomeDb.saves.toArray();
  } catch (err) {
    console.warn('[DexieDB] Failed to list slots from IndexedDB:', err);
    return [];
  }
}
