import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Award,
  Briefcase,
  Crown,
  HeartHandshake,
  Home,
  MessageSquareQuote,
  Shirt,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  buildingsAtom,
  npcsAtom,
  selectedBuildingIdAtom,
  selectedNpcAtom,
  selectedNpcIdAtom,
} from '../../stores/worldStore';
import { resolveNpcRpgProfile } from '../../config/rpgCatalogs';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * RPG Character Inspector Card positioned strictly ABOVE the footer and BELOW the header.
 * Displays Noble House, Outfit, Home Residence, Work Assignment, 5 Aptitude Scores,
 * Skills, Bonus/Malus Traits, and Relational Links.
 */
export const NpcInspectorModal: React.FC = () => {
  const npc = useAtomValue(selectedNpcAtom);
  const buildings = useAtomValue(buildingsAtom);
  const allNpcs = useAtomValue(npcsAtom);

  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);

  if (!npc) return null;

  const rpg = resolveNpcRpgProfile(npc, buildings, allNpcs);

  const handleInspectBuilding = (bldId: string | null) => {
    if (!bldId) return;
    setSelectedNpcId(null);
    setSelectedBuildingId(bldId);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(95vw,760px)] max-h-[calc(100dvh-10.5rem)] overflow-y-auto pointer-events-auto px-1">
      <GlassPanel className="p-4 sm:p-5 border-sky-300/35 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
        {/* Top Row: Identity, Noble House Badge & Close Button */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/25 shrink-0"
              style={{ backgroundColor: `${npc.colorHex}33` }}
            >
              <UserCheck className="w-6 h-6" style={{ color: npc.colorHex }} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                  {npc.role}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                  style={{
                    backgroundColor: `${rpg.house.primaryColor}20`,
                    borderColor: `${rpg.house.primaryColor}55`,
                    color: rpg.house.primaryColor,
                  }}
                >
                  <span>{rpg.house.crestSymbol}</span>
                  <span>{rpg.house.name}</span>
                </span>
                <span className="rounded-md bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                  Loyauté : {rpg.loyaltyToSovereign}%
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-amber-50 mt-0.5">
                {npc.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedNpcId(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fermer la fiche du personnage"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Middle Grid: Assignments (Maison, Travail, Tenue) + 5 Aptitude Bars */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Left Column: House, Outfit, Home & Work Assignments, Bio */}
          <div className="space-y-2 text-xs">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-amber-300" />
                  Domicile :
                </span>
                <button
                  type="button"
                  disabled={!rpg.homeBuildingId}
                  onClick={() => handleInspectBuilding(rpg.homeBuildingId)}
                  className="font-medium text-amber-200 hover:underline disabled:no-underline cursor-pointer truncate max-w-[210px]"
                >
                  {rpg.homeBuildingName}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-300" />
                  Travail :
                </span>
                <button
                  type="button"
                  disabled={!rpg.workBuildingId}
                  onClick={() => handleInspectBuilding(rpg.workBuildingId)}
                  className="font-medium text-sky-200 hover:underline disabled:no-underline cursor-pointer truncate max-w-[210px]"
                >
                  {rpg.workBuildingName}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5 text-purple-300" />
                  Tenue 3D :
                </span>
                <span className="text-purple-200 font-medium truncate max-w-[210px]">
                  {rpg.outfit.name}
                </span>
              </div>
            </div>

            {/* Traits (Bonus & Malus) */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Traits & Bonus/Malus Actifs
              </span>
              <div className="flex flex-wrap gap-1.5">
                {rpg.traits.map((trait) => (
                  <div
                    key={trait.id}
                    title={trait.description}
                    className={`rounded-lg px-2 py-1 text-[11px] border ${
                      trait.polarity === 'bonus'
                        ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-400/30 text-rose-200'
                    }`}
                  >
                    <span className="font-semibold">{trait.name}</span>{' '}
                    <span className="font-mono text-[10px] opacity-90">
                      ({trait.effectBadge})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
              <MessageSquareQuote className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <p className="italic">« {npc.bio} »</p>
            </div>
          </div>

          {/* Right Column: 5 Aptitude Points + Skills + Relational Graph */}
          <div className="space-y-2.5 text-xs">
            {/* 5 Aptitudes */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Points d’Aptitudes ({rpg.totalAptitudePoints}/100)
                </span>
                <span className="text-[10px] text-slate-400">{npc.mood}</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { label: 'Gouvernance', val: rpg.aptitudes.governance, color: 'bg-amber-400' },
                  { label: 'Érudition', val: rpg.aptitudes.erudition, color: 'bg-sky-400' },
                  { label: 'Industrie', val: rpg.aptitudes.industry, color: 'bg-orange-400' },
                  { label: 'Diplomatie', val: rpg.aptitudes.diplomacy, color: 'bg-purple-400' },
                  { label: 'Martial', val: rpg.aptitudes.martial, color: 'bg-emerald-400' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-24 text-slate-300">{stat.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${stat.color}`}
                        style={{ width: `${(stat.val / 20) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-slate-200">
                      {stat.val}/20
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills & Relationships */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2">
                <span className="text-[10px] font-mono uppercase text-sky-300 flex items-center gap-1 mb-1">
                  <Crown className="w-3 h-3" />
                  Compétences
                </span>
                {rpg.skills.map((sk) => (
                  <div key={sk.name} className="text-[11px] mb-1 last:mb-0">
                    <span className="text-slate-100 font-medium block leading-tight">
                      {sk.name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300/90">
                      {sk.rankLabel}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2">
                <span className="text-[10px] font-mono uppercase text-purple-300 flex items-center gap-1 mb-1">
                  <HeartHandshake className="w-3 h-3" />
                  Liens Relationnels
                </span>
                <div className="space-y-1">
                  {rpg.relationships.map((rel) => (
                    <button
                      key={rel.targetNpcId}
                      type="button"
                      onClick={() => setSelectedNpcId(rel.targetNpcId)}
                      className="w-full text-left flex items-center justify-between text-[11px] hover:bg-white/5 rounded px-1 py-0.5 transition cursor-pointer"
                    >
                      <span className="truncate text-slate-200 max-w-[115px]">
                        {rel.targetName}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          rel.affinityScore >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {rel.relationType.split(' ')[0]} ({rel.affinityScore > 0 ? `+${rel.affinityScore}` : rel.affinityScore})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};
