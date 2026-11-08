import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  ArrowDownRight,
  ArrowUpCircle,
  ArrowUpRight,
  Building2,
  Compass,
  Layers,
  MapPin,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  buildingsAtom,
  isColonistAssignmentOpenAtom,
  npcAssignmentsMapAtom,
  npcsAtom,
  selectedBuildingAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  setBuildingMaterialPresetAtom,
  upgradeBuildingTierAtom,
} from '../../stores/worldStore';
import {
  ResourceKey,
  resolveBuildingRpgProfile,
} from '../../config/rpgCatalogs';
import {
  BUILDING_PBR_MATERIAL_SPECS,
  BuildingPbrMaterialId,
} from '../../three/textures/proceduralTextures';
import { resolveDefaultBuildingMaterialPreset } from '../../three/entities/buildings';
import { getPlateauMicroClimateZone } from '../../core/terrainMath';
import { GlassPanel } from '../ui/GlassPanel';

const RESOURCE_SHORT_LABELS: Record<ResourceKey, string> = {
  stability: 'Stabilité',
  prosperity: 'Prospérité',
  knowledge: 'Savoir',
  influence: 'Influence',
};

const PBR_PRESET_KEYS: BuildingPbrMaterialId[] = [
  'carrara_gold',
  'obsidian_bronze',
  'porphyry_imperial',
  'celestial_azure',
  'emerald_travertine',
];

/**
 * Building & Urban District RPG Inspector Card positioned strictly ABOVE the footer and BELOW the header.
 * Displays Architectural Tier (I/II/III), Blender Principled BSDF PBR Material Studio,
 * Patron Noble House, Production/Consumption rates, Micro-Climate sector, and Assigned Citizens.
 */
export const BuildingInspectorModal: React.FC = () => {
  const bld = useAtomValue(selectedBuildingAtom);
  const allBuildings = useAtomValue(buildingsAtom);
  const allNpcs = useAtomValue(npcsAtom);
  const customAssignments = useAtomValue(npcAssignmentsMapAtom);

  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setIsColonistAssignmentOpen = useSetAtom(isColonistAssignmentOpenAtom);
  const upgradeBuildingTier = useSetAtom(upgradeBuildingTierAtom);
  const setBuildingMaterialPreset = useSetAtom(setBuildingMaterialPresetAtom);

  if (!bld) return null;

  const bldProfile = resolveBuildingRpgProfile(
    bld,
    allBuildings,
    allNpcs,
    customAssignments
  );
  const catalogMeta = bldProfile.catalogEntry;
  const microClimate = getPlateauMicroClimateZone(bld.x, bld.z);

  const activeMaterialId: BuildingPbrMaterialId =
    bld.materialPreset ?? resolveDefaultBuildingMaterialPreset(bld.buildingType);
  const activeMaterialSpec = BUILDING_PBR_MATERIAL_SPECS[activeMaterialId];

  const workerIds = new Set(bldProfile.assignedWorkers.map((w) => w.id));
  const residentIds = new Set(bldProfile.assignedResidents.map((r) => r.id));

  const assignedNpcs = allNpcs.filter(
    (n) => workerIds.has(n.id) || residentIds.has(n.id)
  );

  const handleSelectCitizen = (npcId: string) => {
    setSelectedBuildingId(null);
    setSelectedNpcId(npcId);
  };

  const resourceKeys: ResourceKey[] = [
    'stability',
    'prosperity',
    'knowledge',
    'influence',
  ];

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(95vw,820px)] pointer-events-auto px-1">
      <GlassPanel
        windowId="inspector-building-window"
        className="p-4 sm:p-5 max-h-[calc(100dvh-10.5rem)] overflow-y-auto border-amber-300/35 shadow-[0_18px_55px_rgba(0,0,0,0.8)]"
      >
        {/* Top Row: Identity, Tier Badge, Patron Noble House & Upgrade Button */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-amber-300/35 bg-amber-400/15 shrink-0">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                  {catalogMeta.categoryLabel}
                </span>
                <span className="rounded-md bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[10px] font-mono text-amber-100">
                  {bldProfile.tierLabel}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                  style={{
                    backgroundColor: `${bldProfile.patronHouse.primaryColor}20`,
                    borderColor: `${bldProfile.patronHouse.primaryColor}55`,
                    color: bldProfile.patronHouse.primaryColor,
                  }}
                >
                  <span>{bldProfile.patronHouse.crestSymbol}</span>
                  <span>{bldProfile.patronHouse.name}</span>
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-amber-50 mt-0.5">
                {bld.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bldProfile.tier < 3 && (
              <button
                type="button"
                onClick={() => upgradeBuildingTier(bld.id)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow hover:brightness-110 transition cursor-pointer"
                title="Élever l'architecture 3D de cet édifice au palier supérieur"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Élever au Palier {bldProfile.tier === 1 ? 'II' : 'III'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedBuildingId(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fermer la carte du bâtiment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blender Principled BSDF PBR Material Studio Selector */}
        <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.07] p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Textures PBR « Principled BSDF » Niveau Blender (Albedo 512² + Normal Sobel + Roughness + Clearcoat)
            </span>
            <span className="text-[10px] font-mono text-sky-200">
              Rough {activeMaterialSpec.roughness} • Metal {activeMaterialSpec.metalness} • Clearcoat {activeMaterialSpec.clearcoat}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {PBR_PRESET_KEYS.map((presetKey) => {
              const spec = BUILDING_PBR_MATERIAL_SPECS[presetKey];
              const isSelected = presetKey === activeMaterialId;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() =>
                    setBuildingMaterialPreset({
                      buildingId: bld.id,
                      materialPreset: presetKey,
                    })
                  }
                  className={`rounded-lg p-2 text-left border transition cursor-pointer ${
                    isSelected
                      ? 'border-amber-300 bg-amber-400/25 text-amber-50 shadow'
                      : 'border-white/10 bg-black/25 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: spec.baseHex }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: spec.trimHex }}
                    />
                    <span className="text-[10px] font-semibold truncate">
                      {spec.name.split('&')[0].trim()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Left Column: Description, Production/Consumption Ledger & Micro-Climate */}
          <div className="space-y-2.5">
            <p className="text-slate-200 leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-2.5">
              {bld.description}
            </p>

            {/* Production & Consumption per Turn */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                  Production & Consommation par Tour
                </span>
                <span className="text-[10px] font-mono text-amber-200">
                  Synergie : +{bldProfile.workerSynergyBonusPct}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {resourceKeys.map((rKey) => {
                  const prod = bldProfile.effectiveProduction[rKey];
                  const cons = bldProfile.effectiveConsumption[rKey];
                  if (prod === 0 && cons === 0) return null;
                  return (
                    <div
                      key={rKey}
                      className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1.5 flex items-center justify-between"
                    >
                      <span className="text-slate-300 font-medium">
                        {RESOURCE_SHORT_LABELS[rKey]}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {prod > 0 && (
                          <span className="text-emerald-300 flex items-center">
                            <ArrowUpRight className="w-3 h-3" />+{prod}
                          </span>
                        )}
                        {cons > 0 && (
                          <span className="text-rose-300 flex items-center">
                            <ArrowDownRight className="w-3 h-3" />-{cons}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                Sous-Biome : {microClimate.name} ({microClimate.climateTag})
              </p>
            </div>
          </div>

          {/* Right Column: Assigned Citizens & Worker Slots */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Postes Actifs ({bldProfile.assignedWorkers.length}/{catalogMeta.maxWorkers}) • Résidents ({bldProfile.assignedResidents.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId(null);
                    setIsColonistAssignmentOpen(true);
                  }}
                  className="rounded-lg bg-sky-400/20 border border-sky-300/35 px-2 py-0.5 text-[10px] font-medium text-sky-200 hover:bg-sky-400/30 transition cursor-pointer"
                >
                  Affecter des Colons
                </button>
              </div>

              {assignedNpcs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  Aucun citoyen actuellement affecté à cet édifice. Cliquez sur « Affecter des Colons » pour augmenter la production.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {assignedNpcs.map((citizen) => {
                    const isWorker = workerIds.has(citizen.id);
                    const isResident = residentIds.has(citizen.id);
                    return (
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
                            {citizen.role} •{' '}
                            {isWorker && isResident
                              ? 'Travail & Domicile'
                              : isWorker
                              ? 'Poste de Travail'
                              : 'Domicile'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-200 underline">
                          Fiche RPG
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Matériau : {activeMaterialSpec.name}</span>
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
