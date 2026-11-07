import React, { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Cloud,
  CloudUpload,
  Download,
  FolderOpen,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  activePresetIdAtom,
  activeZoneIdAtom,
  buildingsAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  chroniclesAtom,
  commanderAuthUserAtom,
  isSaveModalOpenAtom,
  npcsAtom,
  reliefScaleAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import {
  deleteSaveSlot,
  exportSaveAsJsonFile,
  importSaveFromJsonFile,
  listAllSaveSlots,
  loadGameFromSlot,
  saveGameToSlot,
} from '../../services/saveService';
import {
  CloudWorldSaveSummary,
  deleteCloudWorldSave,
  fetchCloudWorldSaves,
  saveWorldSlotToCloud,
} from '../../services/firebaseService';
import { SaveSlot } from '../../contracts/schemas';
import { GlassPanel } from '../ui/GlassPanel';

const MANUAL_SLOTS = [
  { id: 'slot_1', label: 'Archive Impériale I' },
  { id: 'slot_2', label: 'Archive Impériale II' },
  { id: 'slot_3', label: 'Archive Impériale III' },
];

export const SaveManagerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isSaveModalOpenAtom);
  const authUser = useAtomValue(commanderAuthUserAtom);
  const activeZoneId = useAtomValue(activeZoneIdAtom);

  const [worldName, setWorldName] = useAtom(worldNameAtom);
  const [seed, setSeed] = useAtom(worldSeedAtom);
  const [presetId, setPresetId] = useAtom(activePresetIdAtom);
  const [reliefScale, setReliefScale] = useAtom(reliefScaleAtom);
  const [celestialTime, setCelestialTime] = useAtom(celestialTimeAtom);
  const [autoCycleTime, setAutoCycleTime] = useAtom(celestialAutoCycleAtom);
  const [turnNumber, setTurnNumber] = useAtom(turnNumberAtom);
  const [buildings, setBuildings] = useAtom(buildingsAtom);
  const [npcs, setNpcs] = useAtom(npcsAtom);
  const [chronicles, setChronicles] = useAtom(chroniclesAtom);

  const [slotEntries, setSlotEntries] = useState<
    { slotId: string; title: string; data: SaveSlot | null }[]
  >([]);
  const [cloudSaves, setCloudSaves] = useState<CloudWorldSaveSummary[]>([]);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSlots = async () => {
    setSlotEntries(listAllSaveSlots());
    if (authUser && !authUser.isLocalFallback) {
      try {
        const list = await fetchCloudWorldSaves();
        setCloudSaves(list);
      } catch {
        // Ignore cloud fetch error if offline
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setStatusMessage(null);
    }
  }, [isOpen, authUser]);

  if (!isOpen) return null;

  const buildCurrentSaveSlot = (slotId: string, label: string): SaveSlot => ({
    slotId,
    label,
    savedAt: Date.now(),
    config: {
      worldName,
      seed,
      presetId,
      reliefScale,
      initialCrewCount: Math.max(1, Math.min(8, npcs.length)),
      autoCycleTime,
      weatherDynamic: true,
    },
    turnNumber,
    celestialTime,
    buildings,
    npcs,
    chronicles,
  });

  const applyLoadedSlot = (slot: SaveSlot) => {
    setWorldName(slot.config.worldName);
    setSeed(slot.config.seed);
    setPresetId(slot.config.presetId);
    setReliefScale(slot.config.reliefScale);
    setAutoCycleTime(slot.config.autoCycleTime);
    setTurnNumber(slot.turnNumber);
    setCelestialTime(slot.celestialTime);
    setBuildings(slot.buildings);
    setNpcs(slot.npcs);
    setChronicles(slot.chronicles);
    setStatusMessage(`Archive « ${slot.label} » (${slot.config.worldName}) chargée avec succès.`);
  };

  const handleSaveToSlot = async (slotId: string, slotLabel: string) => {
    const slot = buildCurrentSaveSlot(slotId, slotLabel);
    saveGameToSlot(slot);

    if (authUser && !authUser.isLocalFallback) {
      setIsSyncingCloud(true);
      try {
        await saveWorldSlotToCloud(slot, activeZoneId);
        setStatusMessage(`Monde sauvegardé dans « ${slotLabel} » et synchronisé sur Cloud Firestore.`);
      } catch {
        setStatusMessage(`Monde sauvegardé localement dans « ${slotLabel} ».`);
      } finally {
        setIsSyncingCloud(false);
      }
    } else {
      setStatusMessage(`Monde sauvegardé dans « ${slotLabel} ».`);
    }
    refreshSlots();
  };

  const handleLoadSlot = (slotId: string) => {
    const loaded = loadGameFromSlot(slotId);
    if (loaded) {
      applyLoadedSlot(loaded);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    deleteSaveSlot(slotId);
    refreshSlots();
    setStatusMessage('Archive locale supprimée.');
  };

  const handleDeleteCloudSlot = async (saveId: string) => {
    await deleteCloudWorldSave(saveId);
    refreshSlots();
    setStatusMessage('Archive Cloud Firestore supprimée.');
  };

  const handleExportCurrent = () => {
    const slot = buildCurrentSaveSlot('export', worldName);
    exportSaveAsJsonFile(slot);
    setStatusMessage('Fichier JSON exporté.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imported = await importSaveFromJsonFile(file);
    if (imported) {
      applyLoadedSlot(imported);
      saveGameToSlot({ ...imported, slotId: 'slot_1', label: 'Archive Importée' });
      refreshSlots();
    } else {
      setStatusMessage('Fichier de sauvegarde invalide.');
    }
    e.target.value = '';
  };

  const autoSaveEntry = slotEntries.find((s) => s.slotId === 'autosave')?.data ?? null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-2xl max-h-[85vh] flex flex-col p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-sky-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Archives Locales & Cloud Google Firestore
              </h2>
              <p className="text-xs text-slate-400">
                Sauvegardez ou restaurez votre civilisation sur ce navigateur et dans votre Cloud Firebase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2 text-xs text-emerald-200">
            {statusMessage}
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Cloud Firestore Section */}
          {authUser && !authUser.isLocalFallback && (
            <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" />
                  Cloud Firestore ({cloudSaves.length} archive(s) synchronisée(s))
                </span>
                <button
                  type="button"
                  disabled={isSyncingCloud}
                  onClick={() => handleSaveToSlot('cloud_primary', `Cloud • ${worldName}`)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300 transition cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{isSyncingCloud ? 'Sync Cloud...' : 'Sauvegarder sur Firestore'}</span>
                </button>
              </div>

              {cloudSaves.map((cs) => (
                <div
                  key={cs.saveId}
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-amber-50">{cs.worldName}</span>{' '}
                    <span className="text-slate-400 font-mono text-[11px]">
                      (Tour {cs.turnNumber} • {cs.name})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyLoadedSlot(cs.payload)}
                      className="rounded bg-emerald-400/20 border border-emerald-300/35 px-2.5 py-1 text-[11px] text-emerald-100 hover:bg-emerald-400/30 cursor-pointer"
                    >
                      Charger Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCloudSlot(cs.saveId)}
                      className="p-1 rounded border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Auto-save Slot */}
          <div className="rounded-xl border border-amber-300/25 bg-amber-400/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                Sauvegarde Automatique (Après chaque décret)
              </span>
              <h3 className="font-serif text-base font-semibold text-amber-50">
                {autoSaveEntry ? autoSaveEntry.config.worldName : 'Aucune sauvegarde auto'}
              </h3>
              <p className="text-xs text-slate-400">
                {autoSaveEntry
                  ? `Tour ${autoSaveEntry.turnNumber} • Graine ${autoSaveEntry.config.seed}`
                  : 'Promulguez un décret pour créer une sauvegarde automatique.'}
              </p>
            </div>
            {autoSaveEntry && (
              <button
                type="button"
                onClick={() => handleLoadSlot('autosave')}
                className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 transition cursor-pointer"
              >
                Charger l’Auto-Save
              </button>
            )}
          </div>

          {/* 3 Manual Slots */}
          {MANUAL_SLOTS.map((manual) => {
            const existing = slotEntries.find((s) => s.slotId === manual.id)?.data ?? null;
            return (
              <div
                key={manual.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {manual.label}
                  </span>
                  <h3 className="font-serif text-base font-semibold text-slate-100">
                    {existing ? existing.config.worldName : 'Emplacement Disponible'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {existing
                      ? `Tour ${existing.turnNumber} • ${existing.buildings.length} édifices`
                      : 'Aucune archive enregistrée dans ce registre.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToSlot(manual.id, manual.label)}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-400/20 border border-sky-300/35 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-400/30 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauver</span>
                  </button>

                  {existing && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleLoadSlot(manual.id)}
                        className="rounded-lg bg-emerald-400/20 border border-emerald-300/35 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-400/30 transition cursor-pointer"
                      >
                        Charger
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(manual.id)}
                        className="p-1.5 rounded-lg border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 transition cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* JSON Export / Import */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleExportCurrent}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Exporter Partie (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-300" />
            <span>Importer Fichier (.JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </GlassPanel>
    </div>
  );
};
