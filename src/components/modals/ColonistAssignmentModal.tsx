import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Briefcase,
  Building2,
  Home,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  assignNpcToBuildingAtom,
  buildingsAtom,
  civilizationStatsAtom,
  isColonistAssignmentOpenAtom,
  npcAssignmentsMapAtom,
  npcsAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  upgradeBuildingTierAtom,
} from '../../stores/worldStore';
import {
  resolveBuildingRpgProfile,
  resolveNpcRpgProfile,
} from '../../config/rpgCatalogs';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Interactive Colonist-to-Building Assignment Menu.
 * Opens when clicking the colonist counter in the Top Header or from a Building/Resource card.
 */
export const ColonistAssignmentModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isColonistAssignmentOpenAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const customAssignments = useAtomValue(npcAssignmentsMapAtom);
  const civStats = useAtomValue(civilizationStatsAtom);

  const assignNpc = useSetAtom(assignNpcToBuildingAtom);
  const upgradeBuilding = useSetAtom(upgradeBuildingTierAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-4xl p-5 sm:p-6 border-sky-300/35 max-h-[88dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-400/15 border border-sky-300/35 flex items-center justify-center text-sky-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                Registre Démographique & Postes de Travail 3D
              </span>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Affectation des Colons aux Bâtiments ({npcs.length} colons • {buildings.length} édifices)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Building Capacity Overview */}
        <div className="mt-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Capacité des Édifices & Synergie de Production
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {buildings.map((bld) => {
              const bldRpg = resolveBuildingRpgProfile(bld, buildings, npcs, customAssignments);
              return (
                <div
                  key={bld.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 flex flex-col justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setSelectedNpcId(null);
                          setSelectedBuildingId(bld.id);
                        }}
                        className="font-serif font-semibold text-amber-50 hover:underline text-left truncate cursor-pointer"
                      >
                        {bld.name}
                      </button>
                      <span className="rounded bg-amber-400/20 border border-amber-300/35 px-1.5 py-0.5 text-[10px] font-mono text-amber-200 shrink-0">
                        Palier {bldRpg.tier === 1 ? 'I' : bldRpg.tier === 2 ? 'II' : 'III'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {bldRpg.catalogEntry.categoryLabel} • {bldRpg.patronHouse.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-white/10">
                    <span className="text-sky-200">
                      Postes : {bldRpg.assignedWorkers.length}/{bldRpg.catalogEntry.maxWorkers}
                    </span>
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      +{bldRpg.workerSynergyBonusPct}% rdt
                    </span>
                    {bldRpg.tier < 3 && (
                      <button
                        type="button"
                        onClick={() => upgradeBuilding(bld.id)}
                        className="rounded bg-emerald-400/20 border border-emerald-300/35 px-1.5 py-0.5 text-[10px] text-emerald-200 hover:bg-emerald-400/30 transition cursor-pointer"
                        title="Élever l'édifice au palier supérieur (+production & +architecture 3D)"
                      >
                        Élever ↑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable List of Colonists with Work & Residence Selectors */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {npcs.map((npc) => {
            const rpg = resolveNpcRpgProfile(npc, buildings, npcs, customAssignments);

            return (
              <div
                key={npc.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
              >
                {/* Colonist Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedBuildingId(null);
                      setSelectedNpcId(npc.id);
                    }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/20 shrink-0 cursor-pointer"
                    style={{ backgroundColor: `${npc.colorHex}30` }}
                    title="Inspecter la fiche RPG complète"
                  >
                    <UserCheck className="w-5 h-5" style={{ color: npc.colorHex }} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setSelectedBuildingId(null);
                          setSelectedNpcId(npc.id);
                        }}
                        className="font-serif font-semibold text-sm text-amber-50 hover:underline cursor-pointer"
                      >
                        {npc.name}
                      </button>
                      <span className="text-[10px] font-mono text-sky-300">{npc.role}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-mono border"
                        style={{
                          backgroundColor: `${rpg.house.primaryColor}20`,
                          borderColor: `${rpg.house.primaryColor}55`,
                          color: rpg.house.primaryColor,
                        }}
                      >
                        {rpg.house.crestSymbol} {rpg.house.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Tenue : {rpg.outfit.name} • Aptitude Totale : {rpg.totalAptitudePoints}/100
                    </p>
                  </div>
                </div>

                {/* Dropdowns for Work Building & Home Residence */}
                <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-sky-300 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Édifice de Travail (Production)
                    </span>
                    <select
                      value={rpg.workBuildingId ?? ''}
                      onChange={(e) =>
                        assignNpc({
                          npcId: npc.id,
                          workBuildingId: e.target.value,
                        })
                      }
                      className="rounded-lg border border-sky-300/30 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-300"
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      Domicile Résidentiel
                    </span>
                    <select
                      value={rpg.homeBuildingId ?? ''}
                      onChange={(e) =>
                        assignNpc({
                          npcId: npc.id,
                          homeBuildingId: e.target.value,
                        })
                      }
                      className="rounded-lg border border-amber-300/30 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-300"
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span>
            Les colons se déplacent physiquement en 3D sur le plateau entre leur domicile et leur édifice de travail affecté.
          </span>
          <span className="font-mono text-emerald-300">
            Population Planétaire : {civStats.totalPlanetaryPopulation} citoyens
          </span>
        </div>
      </GlassPanel>
    </div>
  );
};
