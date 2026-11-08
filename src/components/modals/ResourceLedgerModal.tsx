import React, { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Cpu,
  Crown,
  Flame,
  GraduationCap,
  Hammer,
  Heart,
  Leaf,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  civilizationStatsAtom,
  enactSolarCodexDecreeAtom,
  isColonistAssignmentOpenAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  selectedResourceLedgerKeyAtom,
} from '../../stores/worldStore';
import {
  ExtendedResourceKey,
  RESOURCE_METADATA_CATALOG,
  ResourceLedgerLineItem,
  SOLAR_CODEX_DECREES,
} from '../../config/rpgCatalogs';
import { GlassPanel } from '../ui/GlassPanel';

type ResourceFamilyTab = 'imperial' | 'material' | 'tech' | 'demographics' | 'codex';

const FAMILY_TABS: { id: ResourceFamilyTab; label: string; subtitle: string }[] = [
  { id: 'imperial', label: '1. Impérial', subtitle: 'Stabilité • Prospérité • Savoir • Influence' },
  { id: 'material', label: '2. Matière', subtitle: 'Marbre • Basalte • Cristal • Biomasse' },
  { id: 'tech', label: '3. Technologie', subtitle: 'Énergie • Alliages • Axiomes • Pièces' },
  { id: 'demographics', label: '4. Citoyens & Biosphère', subtitle: 'Bonheur • Éducation • Bio-Dôme' },
  { id: 'codex', label: 'Codex Solaire', subtitle: 'Décrets Technologiques' },
];

export const ResourceLedgerModal: React.FC = () => {
  const [selectedKey, setSelectedKey] = useAtom(selectedResourceLedgerKeyAtom);
  const civStats = useAtomValue(civilizationStatsAtom);
  const enactDecree = useSetAtom(enactSolarCodexDecreeAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setIsColonistAssignmentOpen = useSetAtom(isColonistAssignmentOpenAtom);

  const [activeFamily, setActiveFamily] = useState<ResourceFamilyTab>('imperial');
  const [decreeFeedback, setDecreeFeedback] = useState<string | null>(null);

  if (!selectedKey) return null;

  const currentMeta = RESOURCE_METADATA_CATALOG[selectedKey] ?? RESOURCE_METADATA_CATALOG.stability;
  const ledger = civStats.economy.allLedgers[selectedKey] ?? civStats.economy.allLedgers.stability;
  const currentStock = Math.round(civStats.stocks[selectedKey] ?? 0);

  const allMetaEntries = (
    Object.entries(RESOURCE_METADATA_CATALOG) as [
      ExtendedResourceKey,
      (typeof RESOURCE_METADATA_CATALOG)[ExtendedResourceKey],
    ][]
  ).map(([k, v]) => ({ ...v, key: k }));

  const targetFamily =
    activeFamily === 'codex' || activeFamily === 'demographics' ? currentMeta.family : activeFamily;
  const familyResources = allMetaEntries.filter((meta) => meta.family === targetFamily);

  const renderIcon = (key: ExtendedResourceKey) => {
    switch (key) {
      case 'stability':
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'prosperity':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'knowledge':
        return <BookOpen className="w-5 h-5 text-sky-400" />;
      case 'influence':
        return <Scale className="w-5 h-5 text-purple-400" />;
      case 'energy':
      case 'data':
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'alloy':
      case 'parts':
        return <Cpu className="w-5 h-5 text-amber-300" />;
      default:
        return <Hammer className="w-5 h-5 text-teal-300" />;
    }
  };

  const handleInspectContributor = (item: ResourceLedgerLineItem) => {
    if (item.entityType === 'imperial_base') return;
    setSelectedKey(null);
    if (item.entityType === 'building') {
      setSelectedNpcId(null);
      setSelectedBuildingId(item.entityId);
    } else {
      setSelectedBuildingId(null);
      setSelectedNpcId(item.entityId);
    }
  };

  const handleSelectFamily = (fam: ResourceFamilyTab) => {
    setActiveFamily(fam);
    if (fam !== 'codex' && fam !== 'demographics') {
      const firstInFamily = allMetaEntries.find((m) => m.family === fam);
      if (firstInFamily) {
        setSelectedKey(firstInFamily.key);
      }
    }
  };

  const handleEnactDecree = (decreeId: string, title: string) => {
    const ok = enactDecree(decreeId);
    setDecreeFeedback(
      ok
        ? `Décret « ${title} » ratifié avec succès.`
        : `Ressources insuffisantes en stock pour promulguer « ${title} ».`
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-3xl p-5 sm:p-6 border-amber-300/35 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center">
              {activeFamily === 'demographics' ? (
                <Heart className="w-5 h-5 text-pink-400" />
              ) : (
                renderIcon(selectedKey)
              )}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                {activeFamily === 'demographics'
                  ? 'Gestion de la Population & Santé de la Biosphère'
                  : 'Grand Livre Économique • Stocks & Taux par Tour (PT-61)'}
              </span>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                {activeFamily === 'demographics'
                  ? `Démographie & Échelons de Civilisation (${civStats.totalPlanetaryPopulation} Colons)`
                  : `${ledger.label} — Stock : ${currentStock} (${currentMeta.unit})`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedKey(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Family Tabs Bar (Separating Imperial, Material, Tech, Demographics, Codex) */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {FAMILY_TABS.map((fam) => {
            const isSelected = activeFamily === fam.id;
            return (
              <button
                key={fam.id}
                type="button"
                onClick={() => handleSelectFamily(fam.id)}
                className={`rounded-xl px-2.5 py-2 text-left border transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-300/60 bg-amber-400/15 text-amber-50'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                }`}
              >
                <div className="text-xs font-semibold">{fam.label}</div>
                <div className="text-[9px] text-slate-400 truncate">{fam.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* TAB 4: DEMOGRAPHICS & POPULATION GAUGES (Séparation nette des ressources économiques) */}
        {activeFamily === 'demographics' ? (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {civStats.demographics.activeCrisis && (
              <div className="rounded-xl border border-rose-400/50 bg-rose-500/15 p-3 flex items-center gap-2 text-rose-200 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-medium">{civStats.demographics.activeCrisis}</span>
              </div>
            )}

            {/* 4 Demographic Gauges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Bonheur */}
              <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-pink-300 font-semibold">
                    <Heart className="w-4 h-4 fill-pink-400/30" />
                    <span>Bonheur Citoyen</span>
                  </div>
                  <span className="font-mono text-base font-bold text-pink-100">
                    {civStats.demographics.happiness}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300"
                    style={{ width: `${civStats.demographics.happiness}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>État : <strong className="text-pink-200">{civStats.demographics.happinessLabel}</strong></span>
                  <span className="text-[10px] text-slate-400">Habitats & Serres</span>
                </div>
              </div>

              {/* 2. Éducation */}
              <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                    <GraduationCap className="w-4 h-4" />
                    <span>Taux d’Éducation</span>
                  </div>
                  <span className="font-mono text-base font-bold text-indigo-100">
                    {civStats.demographics.education}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                    style={{ width: `${civStats.demographics.education}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Niveau : <strong className="text-indigo-200">{civStats.demographics.educationLabel}</strong></span>
                  <span className="text-[10px] text-slate-400">Observatoires & Savants</span>
                </div>
              </div>

              {/* 3. Santé Écologique Bio-Dôme */}
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <Leaf className="w-4 h-4" />
                    <span>Santé Écologique du Bio-Dôme</span>
                  </div>
                  <span className="font-mono text-base font-bold text-emerald-100">
                    {civStats.demographics.ecologyHealth}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${civStats.demographics.ecologyHealth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Biosphère : <strong className="text-emerald-200">{civStats.demographics.ecologyLabel}</strong></span>
                  <span className="text-[10px] text-slate-400">Coupoles & Biomasse</span>
                </div>
              </div>

              {/* 4. Emploi & Affectation */}
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Briefcase className="w-4 h-4" />
                    <span>Taux d’Emploi & Affectation</span>
                  </div>
                  <span className="font-mono text-base font-bold text-amber-100">
                    {civStats.demographics.employmentRate}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                    style={{ width: `${civStats.demographics.employmentRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>
                    Actifs : <strong className="text-amber-200">{civStats.demographics.assignedCount}</strong> / {civStats.demographics.totalColonists} colons
                  </span>
                  <span className="text-[10px] text-slate-400">Postes de travail</span>
                </div>
              </div>
            </div>

            {/* Sandbox Milestones / Échelons de Civilisation */}
            <div className="space-y-2.5 pt-2">
              <h3 className="font-serif text-sm font-semibold text-amber-100 flex items-center gap-2 border-b border-white/10 pb-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Échelons de Civilisation (Progression Bac-à-Sable)</span>
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {civStats.milestones.map((m) => (
                  <div
                    key={m.code}
                    className={`rounded-xl border p-3 flex flex-col gap-1.5 transition ${
                      m.isUnlocked
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                        : 'border-white/10 bg-white/[0.03] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {m.isUnlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                            {m.level}
                          </div>
                        )}
                        <span className="font-serif text-xs font-semibold text-amber-50">
                          {m.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          m.isUnlocked
                            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                            : 'border-white/15 bg-white/5 text-slate-400'
                        }`}
                      >
                        {m.isUnlocked ? 'Accompli' : `${m.progressPercent}%`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">{m.subtitle}</p>

                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/10">
                      <div
                        className={`h-full ${m.isUnlocked ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5">
                      <span>Conditions : <strong className="text-slate-300">{m.requirementsSummary}</strong></span>
                      <span className="text-amber-300">Récompense : {m.rewardSummary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeFamily === 'codex' ? (
          <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">
              <div className="font-semibold flex items-center gap-1.5 text-cyan-200">
                <Sparkles className="w-4 h-4" />
                Codex Solaire & Puits Technologiques (PT-61)
              </div>
              <p className="mt-1 text-slate-300">
                Convertissez vos stocks de <span className="font-mono text-cyan-200">Axiomes (data)</span>,{' '}
                <span className="font-mono text-amber-200">Énergie Hélios (energy)</span>,{' '}
                <span className="font-mono text-orange-200">Alliages (alloy)</span> et{' '}
                <span className="font-mono text-purple-200">Nanocomposants (parts)</span> en décrets impériaux permanents.
              </p>
            </div>

            {decreeFeedback && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-400/15 px-3.5 py-2.5 text-xs text-amber-100">
                {decreeFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5">
              {SOLAR_CODEX_DECREES.map((decree) => (
                <div
                  key={decree.id}
                  className="rounded-xl border border-white/12 bg-white/[0.04] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-sm font-semibold text-amber-100">
                      [{decree.code}] {decree.title}
                    </h3>
                    <p className="text-xs text-slate-300">{decree.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(decree.costs).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-md bg-rose-500/15 border border-rose-400/30 px-2 py-0.5 text-[10px] font-mono text-rose-200"
                        >
                          Coût : -{Number(v)} {RESOURCE_METADATA_CATALOG[k as ExtendedResourceKey]?.shortLabel ?? k}
                        </span>
                      ))}
                      {Object.entries(decree.bonuses).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-md bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-mono text-emerald-200"
                        >
                          Gain : +{Number(v)} {RESOURCE_METADATA_CATALOG[k as ExtendedResourceKey]?.shortLabel ?? k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEnactDecree(decree.id, decree.title)}
                    className="shrink-0 rounded-xl bg-amber-400/20 border border-amber-300/45 px-3.5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 transition cursor-pointer"
                  >
                    Promulguer
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Switch between resources within the selected family */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {familyResources.map((meta) => {
                const tabLedger = civStats.economy.allLedgers[meta.key];
                const stockVal = Math.round(civStats.stocks[meta.key] ?? 0);
                const isActive = meta.key === selectedKey;
                return (
                  <button
                    key={meta.key}
                    type="button"
                    onClick={() => setSelectedKey(meta.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isActive
                        ? 'border-amber-300 bg-amber-400/20 text-amber-50'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{meta.shortLabel}</span>
                    <span className="font-mono text-[10px] text-amber-200/90">
                      [{stockVal}]
                    </span>
                    <span className="font-mono text-[10px] opacity-85">
                      ({tabLedger.netRatePerTurn >= 0 ? `+${tabLedger.netRatePerTurn}` : tabLedger.netRatePerTurn}/t)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Summary KPI Cards: Total Production, Total Consumption, Net Balance */}
            <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <span className="text-[10px] font-mono uppercase text-emerald-300 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Production Totale
                </span>
                <p className="font-mono text-lg font-bold text-emerald-200 mt-0.5">
                  +{ledger.totalProduction} / tour
                </p>
              </div>

              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                <span className="text-[10px] font-mono uppercase text-rose-300 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Consommation
                </span>
                <p className="font-mono text-lg font-bold text-rose-200 mt-0.5">
                  -{ledger.totalConsumption} / tour
                </p>
              </div>

              <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3">
                <span className="text-[10px] font-mono uppercase text-amber-300">
                  Solde Net par Tour
                </span>
                <p
                  className={`font-mono text-lg font-bold mt-0.5 ${
                    ledger.netRatePerTurn >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {ledger.netRatePerTurn >= 0 ? `+${ledger.netRatePerTurn}` : ledger.netRatePerTurn} / tour
                </p>
              </div>
            </div>

            {/* Detailed Producers & Consumers Columns */}
            <div className="mt-4 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 text-xs">
              {/* Producers */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col">
                <h3 className="font-serif text-sm font-semibold text-emerald-300 flex items-center gap-1.5 border-b border-white/10 pb-2 mb-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Producteurs Actifs ({ledger.producers.length})
                </h3>
                {ledger.producers.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">
                    Aucun bâtiment ne produit actuellement cette ressource.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {ledger.producers.map((item, idx) => (
                      <button
                        key={`${item.entityId}_prod_${idx}`}
                        type="button"
                        onClick={() => handleInspectContributor(item)}
                        className="w-full text-left rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] hover:bg-emerald-500/15 p-2.5 flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-amber-50 flex items-center gap-1.5 truncate">
                            {item.entityType === 'building' ? (
                              <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            ) : item.entityType === 'npc' ? (
                              <Users className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                            ) : (
                              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {item.subtitle}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-emerald-300 shrink-0">
                          +{item.amount}/t
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Consumers */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col">
                <h3 className="font-serif text-sm font-semibold text-rose-300 flex items-center gap-1.5 border-b border-white/10 pb-2 mb-2">
                  <ArrowDownRight className="w-4 h-4" />
                  Consommateurs & Maintenance ({ledger.consumers.length})
                </h3>
                {ledger.consumers.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">
                    Aucune consommation enregistrée sur cette ressource.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {ledger.consumers.map((item, idx) => (
                      <button
                        key={`${item.entityId}_cons_${idx}`}
                        type="button"
                        onClick={() => handleInspectContributor(item)}
                        className="w-full text-left rounded-xl border border-rose-400/20 bg-rose-500/[0.07] hover:bg-rose-500/15 p-2.5 flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-amber-50 flex items-center gap-1.5 truncate">
                            {item.entityType === 'building' ? (
                              <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {item.subtitle}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-rose-300 shrink-0">
                          -{item.amount}/t
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer CTA to open Colonist-to-Building Assignment Menu */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            {activeFamily === 'demographics'
              ? 'L’harmonie du Bio-Dôme dépend de l’équilibre entre logements, serres et affectation citoyenne.'
              : 'Les rendements nets s’appliquent automatiquement aux stocks persistants à chaque tour (PT-52 / PT-61).'}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedKey(null);
              setIsColonistAssignmentOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-sky-400/20 border border-sky-300/35 px-3.5 py-2 text-xs font-medium text-sky-100 hover:bg-sky-400/30 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-sky-300" />
            <span>Gérer l’Affectation des Colons</span>
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
export default ResourceLedgerModal;
