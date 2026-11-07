import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Compass,
  Globe2,
  MapPin,
  Rocket,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  activeZoneConvoysAtom,
  activeZoneDefAtom,
  chroniclesAtom,
  isArrivalZoneSelectedAtom,
  isZonesDrawerOpenAtom,
  npcsAtom,
  turnNumberAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import {
  npc_ROLES,
  view_MODE_PLANET_3D,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

export interface ArrivalZoneInspectorModalProps {
  onTriggerShuttleLanding: () => void;
}

const ENVOY_NAMES = [
  'Légat Cassian Vane',
  'Archonte Sélène D’Or',
  'Consul Théocharis',
  'Exploratrice Lyra Solis',
  'Maître-Cartographe Alaric',
  'Dame Valéria Kael',
];

const ENVOY_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a855f7'];

/**
 * 3D Arrival Zone Inspector Card positioned strictly ABOVE the footer and BELOW the header.
 */
export const ArrivalZoneInspectorModal: React.FC<ArrivalZoneInspectorModalProps> = ({
  onTriggerShuttleLanding,
}) => {
  const [isSelected, setIsSelected] = useAtom(isArrivalZoneSelectedAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const [convoysCount, addConvoy] = useAtom(activeZoneConvoysAtom);
  const [npcs, setNpcs] = useAtom(npcsAtom);
  const [chronicles, setChronicles] = useAtom(chroniclesAtom);
  const turnNumber = useAtomValue(turnNumberAtom);

  const setWorldViewMode = useSetAtom(worldViewModeAtom);
  const setIsZonesDrawerOpen = useSetAtom(isZonesDrawerOpenAtom);

  if (!isSelected) return null;

  const handleSummonOrbitalConvoy = () => {
    onTriggerShuttleLanding();
    addConvoy(1);

    const idx = (npcs.length + convoysCount) % ENVOY_NAMES.length;
    const role = npc_ROLES[(npcs.length + convoysCount) % npc_ROLES.length];
    const name = ENVOY_NAMES[idx];

    const newEnvoy = {
      id: `npc_convoy_${Date.now()}`,
      name,
      role,
      bio: `Débarqué à la ${activeZone.arrivalPortName} lors du convoi orbital #${convoysCount + 1}.`,
      mood: 'Enthousiaste à l’arrivée',
      x: wld_ARRIVAL_ZONE_X + (Math.random() - 0.5) * 1.4,
      z: wld_ARRIVAL_ZONE_Z - 1.8,
      targetX: (Math.random() - 0.5) * 6,
      targetZ: -2.0,
      colorHex: ENVOY_COLORS[idx % ENVOY_COLORS.length],
      spawnedAt: Date.now(),
    };

    setNpcs([...npcs, newEnvoy]);
    setChronicles([
      {
        id: `chr_convoy_${Date.now()}`,
        timestamp: Date.now(),
        turnNumber,
        title: `Atterrissage Orbital • ${activeZone.arrivalPortName}`,
        narrative: `La navette impériale s'est posée sur l'esplanade de ${activeZone.name}. ${name} (${role}) rejoint la province.`,
        chosenChoiceLabel: 'Accueillir le convoi orbital sur la Zone d’Arrivée',
        mutationsSummary: [
          `Zone Plateau : ${activeZone.name}`,
          `Émissaire : ${name}`,
        ],
      },
      ...chronicles,
    ]);
  };

  const handleAscendToPlanet3D = () => {
    setIsSelected(false);
    setWorldViewMode(view_MODE_PLANET_3D);
    setIsZonesDrawerOpen(true);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(95vw,620px)] max-h-[calc(100dvh-10.5rem)] overflow-y-auto pointer-events-auto px-1">
      <GlassPanel className="p-4 sm:p-5 border-amber-300/40 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-amber-300/40 bg-amber-400/20">
              <Rocket className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                Zone d’Arrivée Plateau 3D • {activeZone.regionCode}
              </span>
              <h3 className="font-serif text-lg font-semibold text-amber-50">
                {activeZone.arrivalPortName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSelected(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-slate-200 leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-2.5">
          Esplanade impériale de débarquement reliant l’orbite planétaire au{' '}
          <span className="text-amber-200 font-medium">{activeZone.name}</span> ({activeZone.continentName}).
        </p>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
          <span className="flex items-center gap-1 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            {activeZone.strategicBonus}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-sky-300" />
            Convois reçus : {convoysCount} • Lat {activeZone.latDeg}° Lon {activeZone.lonDeg}°
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleSummonOrbitalConvoy}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:brightness-110 transition cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Atterrissage Navette d’Émissaires</span>
          </button>

          <button
            type="button"
            onClick={handleAscendToPlanet3D}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-2.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 transition cursor-pointer"
          >
            <Globe2 className="w-4 h-4 text-sky-300" />
            <span>Changer de Zone sur le Globe 3D</span>
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
