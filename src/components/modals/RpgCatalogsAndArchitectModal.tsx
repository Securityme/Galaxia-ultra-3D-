import React, { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Award,
  BookOpen,
  Building2,
  Crown,
  Hammer,
  Layers,
  Shirt,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  activeZoneDefAtom,
  buildingsAtom,
  chroniclesAtom,
  isCatalogModalOpenAtom,
  npcsAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  turnNumberAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import {
  ARCHITECTURAL_CATALOG,
  ArchitecturalCatalogEntry,
  NOBLE_HOUSES_CATALOG,
  OUTFIT_CATALOG,
  PREBUILT_CHARACTERS_CATALOG,
  PrebuiltCharacterTemplate,
  TRAITS_CATALOG,
  resolveNpcRpgProfile,
} from '../../config/rpgCatalogs';
import {
  BUILDING_PBR_MATERIAL_SPECS,
  BuildingPbrMaterialId,
} from '../../three/textures/proceduralTextures';
import {
  view_MODE_PLATEAU,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
} from '../../config/constants';
import { createPRNG } from '../../core/prng';
import { getLocalReliefElevation } from '../../core/terrainMath';
import { GlassPanel } from '../ui/GlassPanel';

type CatalogTab = 'characters' | 'houses_outfits' | 'architect';

const PBR_PRESET_KEYS: BuildingPbrMaterialId[] = [
  'carrara_gold',
  'obsidian_bronze',
  'porphyry_imperial',
  'celestial_azure',
  'emerald_travertine',
];

/**
 * Encyclopedic RPG Catalog & Extra Architect Visualizer Modal:
 * - Tab 1: Active Citizens on Plateau + Prebuilt RPG Character Archive
 * - Tab 2: 5 Noble Houses, 3D Outfits Catalog & Traits (Bonus/Malus)
 * - Tab 3: Blender PBR Building Material Studio & Architect Catalog Visualizer
 */
export const RpgCatalogsAndArchitectModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isCatalogModalOpenAtom);
  const [activeTab, setActiveTab] = useState<CatalogTab>('characters');
  const [houseFilter, setHouseFilter] = useState<string>('all');
  const [selectedPbrMaterial, setSelectedPbrMaterial] =
    useState<BuildingPbrMaterialId>('carrara_gold');
  const [selectedSpawnTier, setSelectedSpawnTier] = useState<number>(1);

  const activeZone = useAtomValue(activeZoneDefAtom);
  const [buildings, setBuildings] = useAtom(buildingsAtom);
  const [npcs, setNpcs] = useAtom(npcsAtom);
  const [chronicles, setChronicles] = useAtom(chroniclesAtom);
  const turnNumber = useAtomValue(turnNumberAtom);

  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setWorldViewMode = useSetAtom(worldViewModeAtom);

  if (!isOpen) return null;

  const handleFocusNpcOnPlateau = (npcId: string) => {
    setWorldViewMode(view_MODE_PLATEAU);
    setSelectedBuildingId(null);
    setSelectedNpcId(npcId);
    setIsOpen(false);
  };

  const handleSummonCatalogCharacter = (template: PrebuiltCharacterTemplate) => {
    const rng = createPRNG(`${template.id}_${turnNumber}_${npcs.length}`);
    const newId = `npc_cat_${turnNumber}_${npcs.length + 1}`;
    const newNpc = {
      id: newId,
      name: template.name,
      role: template.role,
      bio: template.bio,
      mood: template.mood,
      x: wld_ARRIVAL_ZONE_X + (rng() - 0.5) * 2.0,
      z: wld_ARRIVAL_ZONE_Z - 2.0,
      targetX: (rng() - 0.5) * 8,
      targetZ: (rng() - 0.5) * 8,
      colorHex: template.colorHex,
      spawnedAt: Date.now(),
    };

    setNpcs([...npcs, newNpc]);
    setChronicles([
      {
        id: `chr_cat_npc_${turnNumber}_${npcs.length + 1}`,
        timestamp: Date.now(),
        turnNumber,
        title: `Arrivée Dynastique • ${template.name}`,
        narrative: `${template.name} (${template.role}) a rejoint ${activeZone.name} avec les honneurs de sa Maison.`,
        chosenChoiceLabel: 'Investiture depuis le Grand Catalogue Impérial',
        mutationsSummary: [`Personnage : ${template.name}`, template.highlightSkill],
      },
      ...chronicles,
    ]);
    handleFocusNpcOnPlateau(newId);
  };

  const handleArchitectPreviewSpawn = (entry: ArchitecturalCatalogEntry) => {
    const rng = createPRNG(`${entry.buildingType}_${turnNumber}_${buildings.length}`);
    let bx = (rng() - 0.5) * 24;
    let bz = (rng() - 0.5) * 24;
    for (let i = 0; i < 15; i++) {
      const angle = (buildings.length * 1.35 + i * 0.7) % (Math.PI * 2);
      const radius = 6.5 + (buildings.length % 4) * 3.8;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      if (getLocalReliefElevation(cx, cz) > 0.08) {
        bx = cx;
        bz = cz;
        break;
      }
    }

    const newBldId = `bld_arch_${turnNumber}_${buildings.length + 1}`;
    const newBld = {
      id: newBldId,
      buildingType: entry.buildingType,
      name: `${entry.title} (${activeZone.regionCode})`,
      description: entry.description,
      x: bx,
      z: bz,
      rotation: rng() * Math.PI * 2,
      scale: 1.0,
      tier: selectedSpawnTier,
      materialPreset: selectedPbrMaterial,
      assembledAt: Date.now(),
    };

    setBuildings([...buildings, newBld]);
    setWorldViewMode(view_MODE_PLATEAU);
    setSelectedNpcId(null);
    setSelectedBuildingId(newBldId);
    setIsOpen(false);
  };

  const filteredNpcs = npcs.filter((n) => {
    if (houseFilter === 'all') return true;
    const rpg = resolveNpcRpgProfile(n, buildings, npcs);
    return rpg.house.id === houseFilter;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-5">
      <GlassPanel className="w-full max-w-5xl max-h-[88vh] flex flex-col p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-400/15 border border-purple-300/35 flex items-center justify-center text-purple-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-amber-50">
                Grand Catalogue RPG, Maisons Dynastiques & Studio PBR Bâtiments
              </h2>
              <p className="text-xs text-slate-400">
                Personnages 3D, Tenues, Affectations, Compétences et Bâtiments à Textures PBR Niveau Blender
              </p>
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

        {/* Navigation Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'characters'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Catalogue des Personnages ({npcs.length} actifs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('houses_outfits')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'houses_outfits'
                ? 'bg-purple-400 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>5 Maisons Nobles, Tenues 3D & Traits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architect')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'architect'
                ? 'bg-sky-400 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Studio Bâtiments PBR Blender & Mode Architecte</span>
          </button>
        </div>

        {/* TAB 1: CHARACTERS CATALOG */}
        {activeTab === 'characters' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHouseFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  houseFilter === 'all'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Toutes les Maisons ({npcs.length})
              </button>
              {NOBLE_HOUSES_CATALOG.map((house) => (
                <button
                  key={house.id}
                  type="button"
                  onClick={() => setHouseFilter(house.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    houseFilter === house.id
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {house.crestSymbol} {house.name}
                </button>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 mb-2.5">
                Citoyens & Dignitaires présents sur {activeZone.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredNpcs.map((npc) => {
                  const rpg = resolveNpcRpgProfile(npc, buildings, npcs);
                  return (
                    <div
                      key={npc.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border mb-1"
                              style={{
                                borderColor: `${rpg.house.primaryColor}55`,
                                color: rpg.house.primaryColor,
                              }}
                            >
                              {rpg.house.crestSymbol} {rpg.house.name}
                            </span>
                            <h4 className="font-serif text-base font-semibold text-amber-50">
                              {npc.name}
                            </h4>
                            <span className="text-xs text-sky-300">{npc.role}</span>
                          </div>
                          <span className="rounded-lg bg-amber-400/15 border border-amber-300/30 px-2 py-1 text-[11px] font-mono text-amber-200">
                            Aptitudes : {rpg.totalAptitudePoints}/100
                          </span>
                        </div>

                        <div className="mt-2.5 text-[11px] text-slate-300 space-y-1 bg-black/25 rounded-xl p-2.5 border border-white/5">
                          <div>
                            <span className="text-slate-400">Tenue 3D :</span>{' '}
                            <span className="text-purple-200">{rpg.outfit.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Domicile :</span>{' '}
                            <span className="text-amber-200">{rpg.homeBuildingName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Travail :</span>{' '}
                            <span className="text-sky-200">{rpg.workBuildingName}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {rpg.traits.map((t) => (
                            <span
                              key={t.id}
                              className={`text-[10px] rounded px-1.5 py-0.5 border ${
                                t.polarity === 'bonus'
                                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                  : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                              }`}
                            >
                              {t.name} ({t.effectBadge})
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFocusNpcOnPlateau(npc.id)}
                        className="w-full rounded-xl bg-sky-400/20 border border-sky-300/35 hover:bg-sky-400/30 py-2 text-xs font-semibold text-sky-100 transition cursor-pointer"
                      >
                        Cadrer sur le Plateau 3D & Ouvrir Fiche Complète
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2.5 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Registre des Grands Personnages de l’Empire (Inviter sur le Plateau)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PREBUILT_CHARACTERS_CATALOG.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="rounded-2xl border border-purple-300/25 bg-purple-500/5 p-3.5 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-purple-300 uppercase">
                        {tmpl.role}
                      </span>
                      <h4 className="font-serif text-base font-semibold text-amber-50 mt-0.5">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {tmpl.bio}
                      </p>
                      <span className="inline-block mt-2 rounded bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                        {tmpl.highlightSkill}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSummonCatalogCharacter(tmpl)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2 text-xs font-semibold text-slate-950 hover:brightness-110 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Faire Débarquer sur le Plateau</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NOBLE HOUSES, OUTFITS & TRAITS */}
        {activeTab === 'houses_outfits' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 mb-2.5">
                Les 5 Grandes Maisons Dynastiques
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NOBLE_HOUSES_CATALOG.map((house) => (
                  <div
                    key={house.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4
                        className="font-serif text-base font-semibold flex items-center gap-2"
                        style={{ color: house.primaryColor }}
                      >
                        <span>{house.crestSymbol}</span>
                        <span>{house.name}</span>
                      </h4>
                      <span className="text-[10px] font-mono rounded bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 text-emerald-200">
                        {house.passiveBonusLabel}
                      </span>
                    </div>
                    <p className="text-xs italic text-amber-100/90">{house.motto}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{house.lore}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2.5 flex items-center gap-1.5">
                <Shirt className="w-4 h-4" />
                Catalogue des Tenues Vestimentaires 3D & Regalia
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {OUTFIT_CATALOG.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: outfit.tunicColor }}
                      />
                      <h4 className="font-serif text-sm font-semibold text-amber-50">
                        {outfit.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-sky-300 block">
                      {outfit.casteLabel}
                    </span>
                    <p className="text-xs text-slate-300">{outfit.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Catalogue des Traits & Caractéristiques (Bonus / Malus)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {TRAITS_CATALOG.map((trait) => (
                  <div
                    key={trait.id}
                    className={`rounded-xl border p-3 ${
                      trait.polarity === 'bonus'
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : 'border-rose-400/30 bg-rose-500/10'
                    }`}
                  >
                    <span className="text-xs font-semibold text-white block">
                      {trait.name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-200 block mt-0.5">
                      {trait.effectBadge}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {trait.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BLENDER PBR MATERIAL STUDIO & ARCHITECT VISUALIZER */}
        {activeTab === 'architect' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Blender Principled BSDF Material Selector & Tier Selector */}
            <div className="rounded-2xl border border-amber-300/35 bg-amber-400/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-300" />
                  <div>
                    <h3 className="font-serif text-base font-semibold text-amber-50">
                      Studio Matériaux PBR « Principled BSDF » Niveau Blender
                    </h3>
                    <p className="text-xs text-slate-300">
                      Sélectionnez la palette PBR multi-canaux (Albedo 512² + Normal Map Sobel 3×3 + Roughness Map + Clearcoat) et le Palier 3D
                    </p>
                  </div>
                </div>

                {/* Tier Selector */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((tierNum) => (
                    <button
                      key={tierNum}
                      type="button"
                      onClick={() => setSelectedSpawnTier(tierNum)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-mono border transition cursor-pointer ${
                        selectedSpawnTier === tierNum
                          ? 'border-amber-300 bg-amber-400 text-slate-950 font-semibold'
                          : 'border-white/15 bg-black/30 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      Palier {tierNum === 1 ? 'I' : tierNum === 2 ? 'II' : 'III'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {PBR_PRESET_KEYS.map((presetKey) => {
                  const spec = BUILDING_PBR_MATERIAL_SPECS[presetKey];
                  const isSelected = selectedPbrMaterial === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setSelectedPbrMaterial(presetKey)}
                      className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                        isSelected
                          ? 'border-amber-300 bg-amber-400/25 text-amber-50 shadow-md'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: spec.baseHex }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: spec.trimHex }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: spec.roofHex }}
                        />
                      </div>
                      <span className="font-serif font-semibold text-xs block text-amber-50">
                        {spec.name}
                      </span>
                      <span className="text-[10px] text-slate-300/90 block mt-0.5 leading-snug">
                        {spec.subtitle}
                      </span>
                      <span className="text-[9px] font-mono text-amber-200/90 block mt-1">
                        R:{spec.roughness} • M:{spec.metalness} • CC:{spec.clearcoat}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ARCHITECTURAL_CATALOG.map((entry) => (
                <div
                  key={entry.buildingType}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                        {entry.categoryLabel}
                      </span>
                      <span className="rounded bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                        {entry.civilizationYield}
                      </span>
                    </div>
                    <h4 className="font-serif text-lg font-semibold text-amber-50 mt-1 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-300" />
                      {entry.title}
                    </h4>
                    <span className="text-[11px] font-mono text-amber-200/80 block mt-0.5">
                      Architecture 3D : {entry.architecturalStyle3D}
                    </span>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {entry.description}
                    </p>
                    <div className="mt-2.5 rounded-xl bg-black/30 border border-white/5 p-2.5 text-[11px] text-amber-200/90">
                      <Sparkles className="w-3 h-3 inline mr-1 text-amber-300" />
                      <strong>Effet Urbain 3D :</strong> {entry.urbanDistrictEffect} •{' '}
                      <span className="text-sky-300">Poste : {entry.workforceRole}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleArchitectPreviewSpawn(entry)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-300/35 bg-sky-400/15 hover:bg-sky-400/25 py-2.5 text-xs font-semibold text-sky-100 transition cursor-pointer"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>
                      Ériger en Palier {selectedSpawnTier === 1 ? 'I' : selectedSpawnTier === 2 ? 'II' : 'III'} ({BUILDING_PBR_MATERIAL_SPECS[selectedPbrMaterial].name.split('&')[0].trim()})
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
