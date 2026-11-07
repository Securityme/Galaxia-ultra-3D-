import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Building2,
  Compass,
  MapPin,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  buildingsAtom,
  npcsAtom,
  selectedBuildingAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
} from '../../stores/worldStore';
import {
  ARCHITECTURAL_CATALOG,
  resolveNpcRpgProfile,
} from '../../config/rpgCatalogs';
import { getPlateauMicroClimateZone } from '../../core/terrainMath';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Building & Urban District Inspector Card positioned strictly ABOVE the footer and BELOW the header.
 * Displays architectural category, micro-climate sector, urban district bonus, and assigned citizens.
 */
export const BuildingInspectorModal: React.FC = () => {
  const bld = useAtomValue(selectedBuildingAtom);
  const allBuildings = useAtomValue(buildingsAtom);
  const allNpcs = useAtomValue(npcsAtom);

  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);

  if (!bld) return null;

  const catalogMeta =
    ARCHITECTURAL_CATALOG.find((c) => c.buildingType === bld.buildingType) ??
    ARCHITECTURAL_CATALOG[0];

  const microClimate = getPlateauMicroClimateZone(bld.x, bld.z);

  const assignedNpcs = allNpcs.filter((n) => {
    const profile = resolveNpcRpgProfile(n, allBuildings, allNpcs);
    return (
      profile.workBuildingId === bld.id || profile.homeBuildingId === bld.id
    );
  });

  const handleSelectCitizen = (npcId: string) => {
    setSelectedBuildingId(null);
    setSelectedNpcId(npcId);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(95vw,680px)] max-h-[calc(100dvh-10.5rem)] overflow-y-auto pointer-events-auto px-1">
      <GlassPanel className="p-4 sm:p-5 border-amber-300/35 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-amber-300/35 bg-amber-400/15 shrink-0">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                  {catalogMeta.categoryLabel}
                </span>
                <span className="rounded-md bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                  {catalogMeta.civilizationYield}
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-amber-50 mt-0.5">
                {bld.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBuildingId(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fermer la carte du bâtiment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-2">
            <p className="text-slate-200 leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-2.5">
              {bld.description}
            </p>

            <div className="rounded-xl bg-amber-400/10 border border-amber-300/25 p-2.5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quartier Urbain & Micro-Climat
              </span>
              <p className="text-[11px] text-amber-100 font-medium">
                {catalogMeta.urbanDistrictEffect}
              </p>
              <p className="text-[11px] text-slate-300 flex items-center gap-1">
                <Compass className="w-3 h-3 text-sky-300" />
                Zone : {microClimate.name} ({microClimate.climateTag})
              </p>
            </div>
          </div>

          {/* Assigned Citizens (Home or Work) */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5" />
                Citoyens Affectés ({assignedNpcs.length})
              </span>

              {assignedNpcs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  Aucun citoyen actuellement affecté à cet édifice.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {assignedNpcs.map((citizen) => (
                    <button
                      key={citizen.id}
                      type="button"
                      onClick={() => handleSelectCitizen(citizen.id)}
                      className="w-full flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-left transition cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-medium text-amber-50 block leading-tight">
                          {citizen.name}
                        </span>
                        <span className="text-[10px] text-sky-300">
                          {citizen.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-200 underline">
                        Voir Fiche RPG
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Échelle : {bld.scale.toFixed(2)}x</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-300" />
                ({bld.x.toFixed(1)}, {bld.z.toFixed(1)})
              </span>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};
