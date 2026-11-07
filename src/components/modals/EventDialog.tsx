import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ScrollText, Sparkles, X } from 'lucide-react';
import {
  activePresetIdAtom,
  ambienceOverrideAtom,
  buildingsAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  chroniclesAtom,
  currentTurnEventAtom,
  npcsAtom,
  reliefScaleAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import { TurnChoice } from '../../contracts/schemas';
import { getTerrainHeight } from '../../core/terrainMath';
import { AUTO_SAVE_SLOT_ID, saveGameToSlot } from '../../services/saveService';
import { GlassPanel } from '../ui/GlassPanel';

const NPC_COLORS = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a855f7', '#fb7185'];

/**
 * Interactive Pax Historia 3D imperial council event & decree modal.
 * Applies world mutations (BUILD, SPAWN_NPC, AMBIENCE) and auto-saves the chronicle state.
 */
export const EventDialog: React.FC = () => {
  const [turnEvent, setTurnEvent] = useAtom(currentTurnEventAtom);
  const [buildings, setBuildings] = useAtom(buildingsAtom);
  const [npcs, setNpcs] = useAtom(npcsAtom);
  const [chronicles, setChronicles] = useAtom(chroniclesAtom);
  const [turnNumber, setTurnNumber] = useAtom(turnNumberAtom);
  const setAmbience = useSetAtom(ambienceOverrideAtom);

  const worldName = useAtomValue(worldNameAtom);
  const seed = useAtomValue(worldSeedAtom);
  const presetId = useAtomValue(activePresetIdAtom);
  const reliefScale = useAtomValue(reliefScaleAtom);
  const celestialTime = useAtomValue(celestialTimeAtom);
  const autoCycleTime = useAtomValue(celestialAutoCycleAtom);

  if (!turnEvent) return null;

  const findValidDryCoord = (): { x: number; z: number } => {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4.5 + Math.random() * 16;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (getTerrainHeight(x, z) > 0.15) {
        return { x, z };
      }
    }
    return { x: 4.5, z: 4.5 };
  };

  const handleSelectChoice = (choice: TurnChoice) => {
    const nextBuildings = [...buildings];
    const nextNpcs = [...npcs];
    const mutationsSummary: string[] = [];

    for (const mut of choice.mutations) {
      if (mut.type === 'BUILD') {
        const pos =
          mut.x !== undefined && mut.z !== undefined
            ? { x: mut.x, z: mut.z }
            : findValidDryCoord();
        nextBuildings.push({
          id: `bld_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          buildingType: mut.buildingType,
          name: mut.name,
          description: mut.description,
          x: pos.x,
          z: pos.z,
          rotation: Math.random() * Math.PI * 2,
          scale: 0.95 + Math.random() * 0.2,
          assembledAt: Date.now(),
        });
        mutationsSummary.push(`Fondation : ${mut.name}`);
      } else if (mut.type === 'SPAWN_NPC') {
        const pos =
          mut.x !== undefined && mut.z !== undefined
            ? { x: mut.x, z: mut.z }
            : findValidDryCoord();
        const target = findValidDryCoord();
        nextNpcs.push({
          id: `npc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: mut.name,
          role: mut.role,
          bio: mut.bio,
          mood: mut.mood || 'Déterminé',
          x: pos.x,
          z: pos.z,
          targetX: target.x,
          targetZ: target.z,
          colorHex: NPC_COLORS[nextNpcs.length % NPC_COLORS.length],
          spawnedAt: Date.now(),
        });
        mutationsSummary.push(`Arrivée : ${mut.name} (${mut.role})`);
      } else if (mut.type === 'AMBIENCE') {
        setAmbience({
          skyTint: mut.skyTint,
          lightIntensity: mut.lightIntensity,
          particleDensity: mut.particleDensity,
          weatherEffect: mut.weatherEffect,
          stormIntensity: mut.stormIntensity,
          note: mut.eventNote,
        });
        mutationsSummary.push(`Climat : ${mut.eventNote}`);
      }
    }

    const nextTurn = turnNumber + 1;
    const newChronicle = {
      id: `chr_${Date.now()}`,
      timestamp: Date.now(),
      turnNumber: nextTurn,
      title: turnEvent.title,
      narrative: turnEvent.narrative,
      chosenChoiceLabel: choice.label,
      mutationsSummary,
    };

    const nextChronicles = [newChronicle, ...chronicles];

    setBuildings(nextBuildings);
    setNpcs(nextNpcs);
    setTurnNumber(nextTurn);
    setChronicles(nextChronicles);
    setTurnEvent(null);

    // Auto-save after each historical decree
    saveGameToSlot({
      slotId: AUTO_SAVE_SLOT_ID,
      label: 'Sauvegarde Automatique',
      savedAt: Date.now(),
      config: {
        worldName,
        seed,
        presetId,
        reliefScale,
        initialCrewCount: nextNpcs.length,
        autoCycleTime,
        weatherDynamic: true,
      },
      turnNumber: nextTurn,
      celestialTime,
      buildings: nextBuildings,
      npcs: nextNpcs,
      chronicles: nextChronicles,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-xl p-6 sm:p-7 border-amber-300/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 text-amber-300">
            <ScrollText className="w-5 h-5 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">
              Audience du Conseil • {turnEvent.sectorCode}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTurnEvent(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-amber-50">
          {turnEvent.title}
        </h2>

        <p className="mt-4 text-sm text-slate-200/95 leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-4">
          {turnEvent.narrative}
        </p>

        <div className="mt-5 space-y-2.5">
          {turnEvent.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleSelectChoice(choice)}
              className="w-full text-left rounded-xl border border-amber-200/20 bg-amber-400/5 hover:bg-amber-400/15 hover:border-amber-300/45 p-3.5 transition group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-amber-100 group-hover:text-amber-50">
                  {choice.label}
                </span>
                <Sparkles className="w-4 h-4 text-amber-300 opacity-75 group-hover:opacity-100 shrink-0" />
              </div>
              <p className="mt-1 text-xs text-slate-300/90 leading-relaxed">
                {choice.summary}
              </p>
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};
