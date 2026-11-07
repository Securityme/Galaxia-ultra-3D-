/**
 * PAX HISTORIA 3D • Save & Load Persistence Service
 * Multi-slot local storage persistence, Auto-Save, and JSON export/import validated by Zod.
 */

import { SaveSlot, saveSlotSchema } from '../contracts/schemas';

const STORAGE_KEY_PREFIX = 'pax_historia_save_slot_';
export const AUTO_SAVE_SLOT_ID = 'autosave';
export const MANUAL_SLOT_IDS = ['slot_1', 'slot_2', 'slot_3'] as const;

export function saveGameToSlot(slot: SaveSlot): boolean {
  try {
    const validated = saveSlotSchema.parse(slot);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot.slotId}`, JSON.stringify(validated));
    }
    return true;
  } catch (err) {
    console.error('Failed to save slot:', err);
    return false;
  }
}

export function loadGameFromSlot(slotId: string): SaveSlot | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = saveSlotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slotId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotId}`);
}

export function listAllSaveSlots(): { slotId: string; title: string; data: SaveSlot | null }[] {
  const allIds = [AUTO_SAVE_SLOT_ID, ...MANUAL_SLOT_IDS];
  return allIds.map((id) => ({
    slotId: id,
    title: id === AUTO_SAVE_SLOT_ID ? 'Sauvegarde Automatique' : `Emplacement ${id.replace('slot_', '#')}`,
    data: loadGameFromSlot(id),
  }));
}

export function exportSaveAsJsonFile(slot: SaveSlot): void {
  const blob = new Blob([JSON.stringify(slot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = slot.config.worldName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `pax-historia-${safeName}-cycle-${slot.turnNumber}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importSaveFromJsonFile(file: File): Promise<SaveSlot | null> {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = saveSlotSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
