/**
 * GALAXIA ULTRA • Bio-Dôme de Poche • Deep RPG & Economic Catalogs for Both Citizens (NPCs) AND Buildings
 * Includes:
 * - 5 Noble Houses & Dynastic Factions
 * - 6 3D Outfits & Regalia
 * - Character Traits (Bonus & Malus), 5 Aptitudes, Skills & Relationships
 * - Deep Building RPG & Economic Profiles (Tiers I-IV, Patron House, 3D Materials,
 *   Worker Slots, Production & Consumption across Imperial, Material & Technological rsc_ Resources)
 * - Full Civilization Resource Production & Consumption Ledger Calculator (PT-61)
 */

import {
  AnyResourceType,
  BuildingType,
  bld_TYPE_BIO_DOME,
  bld_TYPE_GREENHOUSE,
  bld_TYPE_HABITAT,
  bld_TYPE_OBSERVATION,
  bld_TYPE_RELAY_TOWER,
  npc_ROLE_BOTANIST,
  npc_ROLE_CHRONICLER,
  npc_ROLE_ENGINEER,
  npc_ROLE_PILOT,
  npc_ROLE_RESEARCHER,
  npc_ROLE_SECURITY,
  npc_ROLE_SOVEREIGN,
} from './constants';
import { PlacedBuilding, PlacedNpc } from '../contracts/schemas';

export type ResourceKey = 'stability' | 'prosperity' | 'knowledge' | 'influence';
export type ExtendedResourceKey = AnyResourceType;

export interface ResourceYieldMap {
  stability: number;
  prosperity: number;
  knowledge: number;
  influence: number;
}

export interface CustomNpcAssignment {
  workBuildingId?: string;
  homeBuildingId?: string;
}

/* ==========================================================================
   1. Noble Houses & Dynastic Factions Catalog
   ========================================================================== */

export interface NobleHouseDefinition {
  id: string;
  name: string;
  motto: string;
  crestSymbol: string;
  primaryColor: string;
  secondaryColor: string;
  specialty: string;
  lore: string;
  passiveBonusLabel: string;
}

export const NOBLE_HOUSES_CATALOG: NobleHouseDefinition[] = [
  {
    id: 'house_valerius',
    name: 'Maison Valerius d’Or',
    motto: '« Per Astra et Marmora — Par les Astres et le Marbre »',
    crestSymbol: '👑',
    primaryColor: '#fbbf24',
    secondaryColor: '#78350f',
    specialty: 'Gouvernance Souveraine & Urbanisme Monumental',
    lore: 'Lignée patricienne fondatrice des premiers dômes capitolins. Leurs membres portent la toge pourpre bordée d’or solaire.',
    passiveBonusLabel: '+6% Stabilité • +4% Influence Impériale',
  },
  {
    id: 'house_astraea',
    name: 'Maison Astraea du Zénith',
    motto: '« Lumen in Tenebris — La Lumière dans l’Éther »',
    crestSymbol: '🔭',
    primaryColor: '#38bdf8',
    secondaryColor: '#0c4a6e',
    specialty: 'Astrophysique, Cartographie & Chroniques Stellaires',
    lore: 'Dynastie d’érudits et d’astronomes qui lisent les vents cosmiques et archivent la mémoire des mondes.',
    passiveBonusLabel: '+8% Savoir Scientifique • +3% Stabilité',
  },
  {
    id: 'house_silvanus',
    name: 'Maison Silvanus d’Émeraude',
    motto: '« Vita Crescit — La Vie Triomphe des Étoiles »',
    crestSymbol: '🌿',
    primaryColor: '#34d399',
    secondaryColor: '#064e3b',
    specialty: 'Exobiologie, Terraformation & Jardins Suspendus',
    lore: 'Gardiens des semences originelles et maîtres des bio-dômes climatiques. Ils façonnent les sous-biomes du plateau.',
    passiveBonusLabel: '+7% Prospérité • +5% Savoir Biologique',
  },
  {
    id: 'house_orion',
    name: 'Maison Orion des Forges',
    motto: '« Ignis et Ferrum — Le Feu et l’Acier Céleste »',
    crestSymbol: '⚡',
    primaryColor: '#f97316',
    secondaryColor: '#7c2d12',
    specialty: 'Ingénierie Quantique, Relais Énergétiques & Défense',
    lore: 'Bâtisseurs des obélisques d’énergie et des boucliers planétaires. Leurs ingénieurs maintiennent la grille énergétique.',
    passiveBonusLabel: '+8% Prospérité Énergétique • +4% Défense',
  },
  {
    id: 'house_celestis',
    name: 'Guilde des Navigateurs Célestes',
    motto: '« Omnes Viae ad Urbem — Toutes les Orbites Mènent au Dôme »',
    crestSymbol: '🧭',
    primaryColor: '#a855f7',
    secondaryColor: '#4c1d95',
    specialty: 'Flottes Orbitales, Diplomatie Inter-Zones & Commerce',
    lore: 'Ordre cosmopolite de pilotes et d’ambassadeurs reliant les 6 Zones Plateaux du globe par des ponts aériens.',
    passiveBonusLabel: '+9% Influence • +5% Prospérité Commerciale',
  },
];

/* ==========================================================================
   2. 3D Outfits & Attire Catalog (Tenues Vestimentaires)
   ========================================================================== */

export interface OutfitDefinition {
  id: string;
  name: string;
  casteLabel: string;
  description: string;
  tunicColor: string;
  trimColor: string;
  hasCape: boolean;
  hasCrownOrLaurel: boolean;
  hasPauldrons: boolean;
  heldAccessory: 'scepter' | 'astrolabe' | 'scroll' | 'halberd' | 'botany_orb' | 'wrench';
}

export const OUTFIT_CATALOG: OutfitDefinition[] = [
  {
    id: 'outfit_sovereign_imperial',
    name: 'Regalia Pourpre & Couronne Solaire',
    casteLabel: 'Souverain Fondateur',
    description: 'Toge impériale de soie astrale, épaulières dorées, grande cape flottante et couronne de laurier héliocentrique.',
    tunicColor: '#d97706',
    trimColor: '#fde68a',
    hasCape: true,
    hasCrownOrLaurel: true,
    hasPauldrons: true,
    heldAccessory: 'scepter',
  },
  {
    id: 'outfit_scholar_astronome',
    name: 'Toge Philosophique d’Azur & Astrolabe',
    casteLabel: 'Ordre des Érudits & Chroniqueurs',
    description: 'Drapé néo-classique bleu céleste rehaussé de filigranes d’argent pour l’étude des astres.',
    tunicColor: '#0284c7',
    trimColor: '#bae6fd',
    hasCape: true,
    hasCrownOrLaurel: false,
    hasPauldrons: false,
    heldAccessory: 'astrolabe',
  },
  {
    id: 'outfit_engineer_forge',
    name: 'Tunique Thermique & Manteau d’Ingénieur',
    casteLabel: 'Maîtres des Relais Quantiques',
    description: 'Tenue renforcée de plaques de bronze et gants isolants pour manipuler les noyaux plasmiques.',
    tunicColor: '#ea580c',
    trimColor: '#fed7aa',
    hasCape: false,
    hasCrownOrLaurel: false,
    hasPauldrons: true,
    heldAccessory: 'wrench',
  },
  {
    id: 'outfit_botanist_emerald',
    name: 'Habit de Lin Vivant & Sphère Botanique',
    casteLabel: 'Cercle des Exobiologistes',
    description: 'Vêtement tissé de fibres bioluminescentes adapté aux sous-biomes tropicaux et alpins.',
    tunicColor: '#059669',
    trimColor: '#a7f3d0',
    hasCape: true,
    hasCrownOrLaurel: false,
    hasPauldrons: false,
    heldAccessory: 'botany_orb',
  },
  {
    id: 'outfit_sentinel_armor',
    name: 'Cuirasse Prétorienne d’Obsidienne & Or',
    casteLabel: 'Garde Solaire & Sécurité',
    description: 'Armure articulée inspirée des hoplites stellaires avec cimier doré et lance énergétique.',
    tunicColor: '#475569',
    trimColor: '#fbbf24',
    hasCape: true,
    hasCrownOrLaurel: false,
    hasPauldrons: true,
    heldAccessory: 'halberd',
  },
  {
    id: 'outfit_navigator_astral',
    name: 'Manteau de Haut-Navigateur Orbital',
    casteLabel: 'Pilotes & Émissaires',
    description: 'Veste d’apparat violette à col haut en laiton gravé des cartes méridiennes.',
    tunicColor: '#7c3aed',
    trimColor: '#ddd6fe',
    hasCape: true,
    hasCrownOrLaurel: false,
    hasPauldrons: true,
    heldAccessory: 'scroll',
  },
];

/* ==========================================================================
   3. Character Traits (Bonus & Malus)
   ========================================================================== */

export interface CharacterTrait {
  id: string;
  name: string;
  polarity: 'bonus' | 'malus';
  description: string;
  modifiers: Partial<ResourceYieldMap>;
  effectBadge: string;
}

export const TRAITS_CATALOG: CharacterTrait[] = [
  {
    id: 'trait_architecte_solaire',
    name: 'Architecte Visionnaire',
    polarity: 'bonus',
    description: 'Optimise l’urbanisme sacré et la disposition des quartiers pavés.',
    modifiers: { prosperity: 6, stability: 4 },
    effectBadge: '+6 Prospérité • +4 Stabilité',
  },
  {
    id: 'trait_orateur_magnetique',
    name: 'Orateur Magnétique',
    polarity: 'bonus',
    description: 'Ses discours au forum apaisent les factions et inspirent les citoyens.',
    modifiers: { stability: 7, influence: 5 },
    effectBadge: '+7 Stabilité • +5 Influence',
  },
  {
    id: 'trait_erudit_hermetique',
    name: 'Érudit Stellaire',
    polarity: 'bonus',
    description: 'Déchiffre les manuscrits anciens et accélère les découvertes astronomiques.',
    modifiers: { knowledge: 8, influence: 2 },
    effectBadge: '+8 Savoir • +2 Influence',
  },
  {
    id: 'trait_maitre_terraformeur',
    name: 'Maître des Sous-Biomes',
    polarity: 'bonus',
    description: 'Harmonise la flore des plages, plaines et montagnes du plateau.',
    modifiers: { prosperity: 7, knowledge: 4 },
    effectBadge: '+7 Prospérité • +4 Savoir',
  },
  {
    id: 'trait_stratege_inflexible',
    name: 'Stratège Inflexible',
    polarity: 'bonus',
    description: 'Garantit l’ordre impérial sur les routes et l’Astroport.',
    modifiers: { stability: 8 },
    effectBadge: '+8 Stabilité',
  },
  {
    id: 'trait_ambition_demesuree',
    name: 'Ambition Dynastique',
    polarity: 'malus',
    description: 'Place parfois le prestige de sa Maison au-dessus de la concorde civique.',
    modifiers: { influence: 4, stability: -3 },
    effectBadge: '+4 Influence • -3 Stabilité',
  },
  {
    id: 'trait_perfectionniste_lent',
    name: 'Perfectionnisme Académique',
    polarity: 'malus',
    description: 'Exige des matériaux d’une pureté rare, augmentant l’entretien.',
    modifiers: { knowledge: 4, prosperity: -3 },
    effectBadge: '+4 Savoir • -3 Prospérité',
  },
  {
    id: 'trait_ascete_solitaire',
    name: 'Ascète des Cimes',
    polarity: 'malus',
    description: 'Préfère la méditation en haute montagne aux banquets diplomatiques.',
    modifiers: { stability: 2, influence: -3 },
    effectBadge: '+2 Stabilité • -3 Influence',
  },
];

/* ==========================================================================
   4. Complete Resolved RPG Character Profile
   ========================================================================== */

export interface NpcRelationshipLink {
  targetNpcId: string;
  targetName: string;
  targetRole: string;
  relationType: 'Allié Dynastique' | 'Membre de Maison' | 'Mentor Académique' | 'Rival Politique' | 'Vassal Loyal';
  affinityScore: number;
}

export interface NpcAptitudes {
  governance: number;
  erudition: number;
  industry: number;
  diplomacy: number;
  martial: number;
}

export interface NpcSkillItem {
  name: string;
  rankLabel: string;
  category: string;
}

export interface ResolvedNpcRpgProfile {
  house: NobleHouseDefinition;
  outfit: OutfitDefinition;
  homeBuildingId: string | null;
  homeBuildingName: string;
  workBuildingId: string | null;
  workBuildingName: string;
  jobTitle: string;
  aptitudes: NpcAptitudes;
  totalAptitudePoints: number;
  skills: NpcSkillItem[];
  traits: CharacterTrait[];
  loyaltyToSovereign: number;
  relationships: NpcRelationshipLink[];
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Resolves a rich RPG sheet for any NPC on the plateau, honoring custom player assignments.
 */
export function resolveNpcRpgProfile(
  npc: PlacedNpc,
  buildings: PlacedBuilding[],
  allNpcs: PlacedNpc[],
  customAssignments?: Record<string, CustomNpcAssignment>
): ResolvedNpcRpgProfile {
  const h = hashString(`${npc.id}_${npc.name}_${npc.role}`);
  const isSovereign = npc.role === npc_ROLE_SOVEREIGN;

  const houseIndex = isSovereign ? 0 : h % NOBLE_HOUSES_CATALOG.length;
  const house = NOBLE_HOUSES_CATALOG[houseIndex];

  let outfit = OUTFIT_CATALOG[1];
  if (isSovereign) {
    outfit = OUTFIT_CATALOG[0];
  } else if (npc.role === npc_ROLE_ENGINEER) {
    outfit = OUTFIT_CATALOG[2];
  } else if (npc.role === npc_ROLE_BOTANIST || npc.role === npc_ROLE_RESEARCHER) {
    outfit = OUTFIT_CATALOG[3];
  } else if (npc.role === npc_ROLE_SECURITY) {
    outfit = OUTFIT_CATALOG[4];
  } else if (npc.role === npc_ROLE_PILOT) {
    outfit = OUTFIT_CATALOG[5];
  }

  const custom = customAssignments?.[npc.id];

  const habitats = buildings.filter((b) => b.buildingType === bld_TYPE_HABITAT);
  const workBuildings = buildings.filter((b) => b.buildingType !== bld_TYPE_HABITAT);

  const defaultHomeBld =
    habitats.length > 0
      ? habitats[h % habitats.length]
      : buildings.length > 0
      ? buildings[h % buildings.length]
      : null;

  const homeBld = custom?.homeBuildingId
    ? buildings.find((b) => b.id === custom.homeBuildingId) ?? defaultHomeBld
    : defaultHomeBld;

  let preferredWorkType: BuildingType = bld_TYPE_OBSERVATION;
  if (npc.role === npc_ROLE_ENGINEER) preferredWorkType = bld_TYPE_RELAY_TOWER;
  else if (npc.role === npc_ROLE_BOTANIST) preferredWorkType = bld_TYPE_GREENHOUSE;
  else if (npc.role === npc_ROLE_RESEARCHER) preferredWorkType = bld_TYPE_BIO_DOME;

  const defaultWorkBld =
    buildings.find((b) => b.buildingType === preferredWorkType) ??
    (workBuildings.length > 0
      ? workBuildings[(h >> 2) % workBuildings.length]
      : buildings[0] ?? null);

  const matchingWork = custom?.workBuildingId
    ? buildings.find((b) => b.id === custom.workBuildingId) ?? defaultWorkBld
    : defaultWorkBld;

  const aptitudes: NpcAptitudes = {
    governance: isSovereign ? 19 : 9 + (h % 10),
    erudition:
      npc.role === npc_ROLE_RESEARCHER || npc.role === npc_ROLE_CHRONICLER
        ? 16 + (h % 4)
        : 8 + ((h >> 3) % 10),
    industry:
      npc.role === npc_ROLE_ENGINEER ? 17 + (h % 3) : 8 + ((h >> 5) % 10),
    diplomacy: isSovereign ? 18 : 9 + ((h >> 7) % 10),
    martial:
      npc.role === npc_ROLE_SECURITY || npc.role === npc_ROLE_PILOT
        ? 16 + (h % 4)
        : 7 + ((h >> 9) % 10),
  };

  const totalAptitudePoints =
    aptitudes.governance +
    aptitudes.erudition +
    aptitudes.industry +
    aptitudes.diplomacy +
    aptitudes.martial;

  const skills: NpcSkillItem[] = [
    {
      name: isSovereign
        ? 'Autorité Impériale & Décrets'
        : `Maîtrise : ${npc.role}`,
      rankLabel: isSovereign ? 'Rang V (Grand Maître)' : `Rang ${3 + (h % 3)}`,
      category: house.specialty.split('&')[0].trim(),
    },
    {
      name:
        aptitudes.erudition >= aptitudes.industry
          ? 'Cartographie & Philosophie Stellaire'
          : 'Architecture & Réseaux d’Énergie',
      rankLabel: `Rang ${2 + ((h >> 4) % 3)}`,
      category: 'Savoir Appliqué',
    },
  ];

  const bonusTraits = TRAITS_CATALOG.filter((t) => t.polarity === 'bonus');
  const malusTraits = TRAITS_CATALOG.filter((t) => t.polarity === 'malus');

  const trait1 = bonusTraits[h % bonusTraits.length];
  const trait2 = bonusTraits[(h + 2) % bonusTraits.length];
  const traitMalus = malusTraits[(h >> 3) % malusTraits.length];

  const traits: CharacterTrait[] = [
    trait1,
    ...(trait2.id !== trait1.id ? [trait2] : []),
    traitMalus,
  ];

  const relationships: NpcRelationshipLink[] = [];
  const others = allNpcs.filter((other) => other.id !== npc.id).slice(0, 3);
  const relTypes: NpcRelationshipLink['relationType'][] = [
    'Allié Dynastique',
    'Membre de Maison',
    'Mentor Académique',
    'Rival Politique',
    'Vassal Loyal',
  ];

  others.forEach((other, idx) => {
    const relHash = hashString(`${npc.id}_${other.id}`);
    const rType = isSovereign
      ? 'Vassal Loyal'
      : relTypes[(relHash + idx) % relTypes.length];
    const affinity =
      rType === 'Rival Politique'
        ? -25 - (relHash % 35)
        : 45 + (relHash % 50);

    relationships.push({
      targetNpcId: other.id,
      targetName: other.name,
      targetRole: other.role,
      relationType: rType,
      affinityScore: affinity,
    });
  });

  return {
    house,
    outfit,
    homeBuildingId: homeBld?.id ?? null,
    homeBuildingName: homeBld ? homeBld.name : 'Quartier Patricien du Forum',
    workBuildingId: matchingWork?.id ?? null,
    workBuildingName: matchingWork ? matchingWork.name : 'Esplanade Capitoline',
    jobTitle: isSovereign
      ? 'Souverain & Chef du Conseil Stellaire'
      : `${npc.role} (${house.name})`,
    aptitudes,
    totalAptitudePoints,
    skills,
    traits,
    loyaltyToSovereign: isSovereign ? 100 : 72 + (h % 27),
    relationships,
  };
}

/* ==========================================================================
   5. Deep Building RPG, Architectural & Economic Catalog
   ========================================================================== */

export interface ArchitecturalCatalogEntry {
  buildingType: BuildingType;
  title: string;
  categoryLabel: string;
  architecturalStyle3D: string;
  patronHouseId: string;
  maxWorkers: number;
  housingCapacity: number;
  baseProduction: ResourceYieldMap;
  baseConsumption: ResourceYieldMap;
  urbanDistrictEffect: string;
  workforceRole: string;
  civilizationYield: string;
  description: string;
}

export const ARCHITECTURAL_CATALOG: ArchitecturalCatalogEntry[] = [
  {
    buildingType: bld_TYPE_OBSERVATION,
    title: 'Observatoire Astral & Astrolabe',
    categoryLabel: 'Savoir & Cartographie',
    architecturalStyle3D: 'Rotonde Corinthienne en Marbre Blanc & Coupole Armillaire d’Or',
    patronHouseId: 'house_astraea',
    maxWorkers: 3,
    housingCapacity: 1,
    baseProduction: { stability: 2, prosperity: 0, knowledge: 9, influence: 5 },
    baseConsumption: { stability: 0, prosperity: 3, knowledge: 0, influence: 0 },
    urbanDistrictEffect: 'Génère un Parvis Académique pavé de marbre clair',
    workforceRole: npc_ROLE_RESEARCHER,
    civilizationYield: '+9 Savoir • +5 Influence • -3 Prospérité (Entretien)',
    description: 'Tour néo-classique à colonnade supportant une coupole astronomique et des anneaux armillaires en rotation.',
  },
  {
    buildingType: bld_TYPE_BIO_DOME,
    title: 'Bio-Dôme Climatique Impérial',
    categoryLabel: 'Biosphère & Écologie',
    architecturalStyle3D: 'Arche Géodésique Cristalline & Bassins Botaniques d’Émeraude',
    patronHouseId: 'house_silvanus',
    maxWorkers: 3,
    housingCapacity: 2,
    baseProduction: { stability: 4, prosperity: 6, knowledge: 7, influence: 2 },
    baseConsumption: { stability: 0, prosperity: 2, knowledge: 0, influence: 0 },
    urbanDistrictEffect: 'Crée une Esplanade Botanique avec jardins et bassins',
    workforceRole: npc_ROLE_BOTANIST,
    civilizationYield: '+7 Savoir • +6 Prospérité • +4 Stabilité • -2 Entretien',
    description: 'Verrière géodésique abritant un écosystème pressurisé et régulant les sous-biomes environnants.',
  },
  {
    buildingType: bld_TYPE_RELAY_TOWER,
    title: 'Obélisque & Tour Relais Solaire',
    categoryLabel: 'Énergie & Infrastructure',
    architecturalStyle3D: 'Flèche Héliocentrique en Laiton Poli, Contreforts & Anneaux Plasmiques',
    patronHouseId: 'house_orion',
    maxWorkers: 3,
    housingCapacity: 0,
    baseProduction: { stability: 3, prosperity: 11, knowledge: 2, influence: 4 },
    baseConsumption: { stability: 1, prosperity: 0, knowledge: 1, influence: 0 },
    urbanDistrictEffect: 'Établit un Nœud Énergétique illuminé de lanternes dorées',
    workforceRole: npc_ROLE_ENGINEER,
    civilizationYield: '+11 Prospérité • +4 Influence • -1 Stabilité (Surcharge)',
    description: 'Flèche énergétique captant le rayonnement stellaire pour alimenter tous les édifices de la province.',
  },
  {
    buildingType: bld_TYPE_HABITAT,
    title: 'Villa Patricienne & Domus Citoyenne',
    categoryLabel: 'Résidence & Maisons Nobles',
    architecturalStyle3D: 'Pérystile Néo-Romain à Colonnes Doriques & Toiture Terre Cuite Dorée',
    patronHouseId: 'house_valerius',
    maxWorkers: 2,
    housingCapacity: 5,
    baseProduction: { stability: 9, prosperity: 3, knowledge: 1, influence: 6 },
    baseConsumption: { stability: 0, prosperity: 3, knowledge: 0, influence: 0 },
    urbanDistrictEffect: 'Développe un Quartier Résidentiel Pavé relié au Forum',
    workforceRole: npc_ROLE_CHRONICLER,
    civilizationYield: '+9 Stabilité • +6 Influence • -3 Prospérité (Vivres)',
    description: 'Demeure noble à péristyle et fenêtres chaudement illuminées servant de domicile aux familles et dignitaires.',
  },
  {
    buildingType: bld_TYPE_GREENHOUSE,
    title: 'Serre Hydroponique d’Abondance',
    categoryLabel: 'Agriculture & Subsistance',
    architecturalStyle3D: 'Nef Vitrail en Voûte & Terrasses d’Irrigation Dorées',
    patronHouseId: 'house_silvanus',
    maxWorkers: 3,
    housingCapacity: 1,
    baseProduction: { stability: 6, prosperity: 9, knowledge: 3, influence: 1 },
    baseConsumption: { stability: 0, prosperity: 1, knowledge: 1, influence: 0 },
    urbanDistrictEffect: 'Aménage des Terrasses Agricoles et canaux d’irrigation',
    workforceRole: npc_ROLE_BOTANIST,
    civilizationYield: '+9 Prospérité • +6 Stabilité • -1 Savoir (Maintenance)',
    description: 'Complexe agricole sous voûte cristalline produisant les vivres et élixirs botaniques de la cité.',
  },
];

export interface ResolvedBuildingRpgProfile {
  catalogEntry: ArchitecturalCatalogEntry;
  patronHouse: NobleHouseDefinition;
  tier: number;
  tierLabel: string;
  assignedWorkers: PlacedNpc[];
  assignedResidents: PlacedNpc[];
  workerSynergyBonusPct: number;
  effectiveProduction: ResourceYieldMap;
  effectiveConsumption: ResourceYieldMap;
  netYield: ResourceYieldMap;
}

export function resolveBuildingRpgProfile(
  building: PlacedBuilding,
  allBuildings: PlacedBuilding[],
  allNpcs: PlacedNpc[],
  customAssignments?: Record<string, CustomNpcAssignment>
): ResolvedBuildingRpgProfile {
  const catalogEntry =
    ARCHITECTURAL_CATALOG.find((c) => c.buildingType === building.buildingType) ??
    ARCHITECTURAL_CATALOG[0];

  const patronHouse =
    NOBLE_HOUSES_CATALOG.find((h) => h.id === catalogEntry.patronHouseId) ??
    NOBLE_HOUSES_CATALOG[0];

  const tier = building.tier ?? 1;
  const tierLabels = [
    'Niveau I • Fondation Classique',
    'Niveau II • Édifice Majeur',
    'Niveau III • Monument Impérial',
    'Niveau IV • Monument Hélios (Palier Technologique)',
  ];
  const tierLabel = tierLabels[Math.min(3, Math.max(0, tier - 1))];

  const assignedWorkers: PlacedNpc[] = [];
  const assignedResidents: PlacedNpc[] = [];

  allNpcs.forEach((npc) => {
    const profile = resolveNpcRpgProfile(npc, allBuildings, allNpcs, customAssignments);
    if (profile.workBuildingId === building.id) {
      assignedWorkers.push(npc);
    }
    if (profile.homeBuildingId === building.id) {
      assignedResidents.push(npc);
    }
  });

  // Calculate synergy bonus from workers (+15% per assigned worker + extra if role matches)
  let synergyPct = 0;
  assignedWorkers.forEach((w) => {
    synergyPct += w.role === catalogEntry.workforceRole ? 24 : 14;
  });

  const tierMultiplier = 1 + (tier - 1) * 0.35;
  const totalProdMultiplier = tierMultiplier * (1 + synergyPct / 100);
  const totalConsMultiplier = 1 + (tier - 1) * 0.2;

  const effectiveProduction: ResourceYieldMap = {
    stability: Math.round(catalogEntry.baseProduction.stability * totalProdMultiplier),
    prosperity: Math.round(catalogEntry.baseProduction.prosperity * totalProdMultiplier),
    knowledge: Math.round(catalogEntry.baseProduction.knowledge * totalProdMultiplier),
    influence: Math.round(catalogEntry.baseProduction.influence * totalProdMultiplier),
  };

  const effectiveConsumption: ResourceYieldMap = {
    stability: Math.round(catalogEntry.baseConsumption.stability * totalConsMultiplier),
    prosperity: Math.round(catalogEntry.baseConsumption.prosperity * totalConsMultiplier),
    knowledge: Math.round(catalogEntry.baseConsumption.knowledge * totalConsMultiplier),
    influence: Math.round(catalogEntry.baseConsumption.influence * totalConsMultiplier),
  };

  const netYield: ResourceYieldMap = {
    stability: effectiveProduction.stability - effectiveConsumption.stability,
    prosperity: effectiveProduction.prosperity - effectiveConsumption.prosperity,
    knowledge: effectiveProduction.knowledge - effectiveConsumption.knowledge,
    influence: effectiveProduction.influence - effectiveConsumption.influence,
  };

  return {
    catalogEntry,
    patronHouse,
    tier,
    tierLabel,
    assignedWorkers,
    assignedResidents,
    workerSynergyBonusPct: synergyPct,
    effectiveProduction,
    effectiveConsumption,
    netYield,
  };
}

/* ==========================================================================
   6. Detailed Resource Production & Consumption Breakdown Calculator (PT-61)
   ========================================================================== */

export interface ResourceLedgerLineItem {
  entityId: string;
  entityType: 'building' | 'npc' | 'imperial_base';
  name: string;
  subtitle: string;
  amount: number;
}

export interface ResourceLedgerBreakdown {
  resourceKey: ExtendedResourceKey;
  family: 'imperial' | 'material' | 'tech';
  code: string;
  label: string;
  unit: string;
  totalProduction: number;
  totalConsumption: number;
  netRatePerTurn: number;
  producers: ResourceLedgerLineItem[];
  consumers: ResourceLedgerLineItem[];
}

export const RESOURCE_METADATA_CATALOG: Record<
  ExtendedResourceKey,
  {
    family: 'imperial' | 'material' | 'tech';
    code: string;
    shortLabel: string;
    label: string;
    unit: string;
    colorHex: string;
    description: string;
  }
> = {
  stability: {
    family: 'imperial',
    code: 'imp_STABILITY',
    shortLabel: 'Stabilité',
    label: 'Stabilité Politique & Civique',
    unit: '/ tour',
    colorHex: '#34d399',
    description: 'Concorde civique entre les Maisons Nobles et l’autorité du Souverain.',
  },
  prosperity: {
    family: 'imperial',
    code: 'imp_PROSPERITY',
    shortLabel: 'Prospérité',
    label: 'Prospérité Économique & Énergétique',
    unit: '/ tour',
    colorHex: '#fbbf24',
    description: 'Dynamisme matériel, logistique et abondance des quartiers du plateau.',
  },
  knowledge: {
    family: 'imperial',
    code: 'imp_KNOWLEDGE',
    shortLabel: 'Savoir',
    label: 'Savoir Scientifique & Chroniques',
    unit: '/ tour',
    colorHex: '#38bdf8',
    description: 'Érudition astronomique, cartographie orbitale et archives du Bio-Dôme.',
  },
  influence: {
    family: 'imperial',
    code: 'imp_INFLUENCE',
    shortLabel: 'Influence',
    label: 'Rayonnement & Influence Impériale',
    unit: '/ tour',
    colorHex: '#c084fc',
    description: 'Prestige diplomatique sur les 6 Zones Plateaux de la planète.',
  },
  marble: {
    family: 'material',
    code: 'mat_MARBLE',
    shortLabel: 'Marbre',
    label: 'Marbre Blanc de Carrare Stellaire',
    unit: 'blocs / tour',
    colorHex: '#e2e8f0',
    description: 'Pierre noble destinée aux colonnades, rotondes et monuments capitolins.',
  },
  basalt: {
    family: 'material',
    code: 'mat_BASALT',
    shortLabel: 'Basalte',
    label: 'Basalte & Obsidienne de Fondations',
    unit: 'tonnes / tour',
    colorHex: '#94a3b8',
    description: 'Roche dense assurant l’assise structurelle des terrasses et astroports.',
  },
  crystal: {
    family: 'material',
    code: 'mat_CRYSTAL',
    shortLabel: 'Cristal',
    label: 'Verre Cristallin & Quartz Géodésique',
    unit: 'prismes / tour',
    colorHex: '#67e8f9',
    description: 'Silice purifiée pour les coupoles pressurisées et lentilles astronomiques.',
  },
  biomass: {
    family: 'material',
    code: 'mat_BIOMASS',
    shortLabel: 'Biomasse',
    label: 'Biomasse & Semences Exobiologiques',
    unit: 'unités / tour',
    colorHex: '#4ade80',
    description: 'Substrat organique nourrissant les serres hydroponiques et les forêts.',
  },
  energy: {
    family: 'tech',
    code: 'rsc_ENERGY',
    shortLabel: 'Énergie Hélios',
    label: 'Énergie Hélios (Flux Stellaire Capté)',
    unit: 'MW / tour',
    colorHex: '#f97316',
    description: 'Flux plasmique capté par les Tours Relais pour alimenter le bouclier et les dômes.',
  },
  alloy: {
    family: 'tech',
    code: 'rsc_ALLOY',
    shortLabel: 'Alliages',
    label: 'Alliages Adamantins & Bronze Solaire',
    unit: 'lingots / tour',
    colorHex: '#f59e0b',
    description: 'Métallurgie avancée indispensable aux armatures de Palier IV et vaisseaux.',
  },
  data: {
    family: 'tech',
    code: 'rsc_DATA',
    shortLabel: 'Axiomes',
    label: 'Axiomes & Données Astrométriques',
    unit: 'codex / tour',
    colorHex: '#60a5fa',
    description: 'Calculs orbitaux et théorèmes synthétisés par les Observatoires et Chroniqueurs.',
  },
  parts: {
    family: 'tech',
    code: 'rsc_PARTS',
    shortLabel: 'Nanocomposants',
    label: 'Nanocomposants & Gyroscopes Armillaires',
    unit: 'modules / tour',
    colorHex: '#a78bfa',
    description: 'Mécanismes de haute précision pour le Codex Solaire et les automates de dôme.',
  },
};

export interface SolarCodexDecreeDefinition {
  id: string;
  title: string;
  code: string;
  description: string;
  costs: Partial<Record<ExtendedResourceKey, number>>;
  bonuses: Partial<Record<ExtendedResourceKey, number>>;
  upgradeTargetBuildingTier4?: boolean;
}

export const SOLAR_CODEX_DECREES: SolarCodexDecreeDefinition[] = [
  {
    id: 'decree_helios_overdrive',
    title: 'Synchronisation de la Couronne Hélios',
    code: 'CDX-01',
    description: 'Canalise l’Énergie Hélios et les Axiomes pour stabiliser le climat et accroître la Prospérité impériale.',
    costs: { energy: 14, data: 10 },
    bonuses: { prosperity: 12, stability: 8, crystal: 8 },
  },
  {
    id: 'decree_adamantine_monument',
    title: 'Élévation au Palier IV • Monument Hélios',
    code: 'CDX-02',
    description: 'Consomme Alliages Adamantins, Nanocomposants et Marbre pour ériger le principal édifice au Palier IV.',
    costs: { alloy: 16, parts: 12, marble: 15 },
    bonuses: { influence: 15, stability: 10, knowledge: 10 },
    upgradeTargetBuildingTier4: true,
  },
  {
    id: 'decree_biosphere_genesis',
    title: 'Ensemencement Géodésique Continental',
    code: 'CDX-03',
    description: 'Combine Énergie Hélios, Biomasse et Nanocomposants pour multiplier les récoltes et la recherche exobiologique.',
    costs: { energy: 10, parts: 8, biomass: 16 },
    bonuses: { knowledge: 14, prosperity: 10, stability: 6 },
  },
];

export function computeExtendedResourceLedger(
  resourceKey: ExtendedResourceKey,
  buildings: PlacedBuilding[],
  npcs: PlacedNpc[],
  customAssignments?: Record<string, CustomNpcAssignment>
): ResourceLedgerBreakdown {
  const meta = RESOURCE_METADATA_CATALOG[resourceKey];

  const baseDotationAmount =
    meta.family === 'imperial' ? 10 : meta.family === 'material' ? 4 : 3;

  const producers: ResourceLedgerLineItem[] = [
    {
      entityId: 'arrival_gate',
      entityType: 'imperial_base',
      name: 'Porte Céleste & Capitole Impérial',
      subtitle: 'Dotation de Fondation Souveraine',
      amount: baseDotationAmount,
    },
  ];
  const consumers: ResourceLedgerLineItem[] = [];

  buildings.forEach((bld) => {
    const prof = resolveBuildingRpgProfile(bld, buildings, npcs, customAssignments);
    let prod = 0;
    let cons = 0;

    if (
      resourceKey === 'stability' ||
      resourceKey === 'prosperity' ||
      resourceKey === 'knowledge' ||
      resourceKey === 'influence'
    ) {
      prod = prof.effectiveProduction[resourceKey];
      cons = prof.effectiveConsumption[resourceKey];
    } else if (resourceKey === 'marble') {
      if (bld.buildingType === bld_TYPE_HABITAT || bld.buildingType === bld_TYPE_OBSERVATION) {
        prod = 3 * prof.tier;
      } else {
        cons = 1;
      }
    } else if (resourceKey === 'basalt') {
      if (bld.buildingType === bld_TYPE_RELAY_TOWER || bld.buildingType === bld_TYPE_HABITAT) {
        prod = 3 * prof.tier;
      } else {
        cons = 1;
      }
    } else if (resourceKey === 'crystal') {
      if (bld.buildingType === bld_TYPE_BIO_DOME || bld.buildingType === bld_TYPE_OBSERVATION) {
        prod = 3 * prof.tier;
      } else {
        cons = 1;
      }
    } else if (resourceKey === 'biomass') {
      if (bld.buildingType === bld_TYPE_GREENHOUSE || bld.buildingType === bld_TYPE_BIO_DOME) {
        prod = 4 * prof.tier;
      } else if (bld.buildingType === bld_TYPE_HABITAT) {
        cons = 2;
      }
    } else if (resourceKey === 'energy') {
      if (bld.buildingType === bld_TYPE_RELAY_TOWER) {
        prod = 6 * prof.tier + prof.assignedWorkers.length * 2;
      } else {
        cons = Math.max(1, prof.tier - 1);
      }
    } else if (resourceKey === 'alloy') {
      if (bld.buildingType === bld_TYPE_RELAY_TOWER || bld.buildingType === bld_TYPE_HABITAT) {
        prod = 2 * prof.tier + prof.assignedWorkers.length;
      } else if (prof.tier >= 3) {
        cons = 1;
      }
    } else if (resourceKey === 'data') {
      if (bld.buildingType === bld_TYPE_OBSERVATION || bld.buildingType === bld_TYPE_BIO_DOME) {
        prod = 3 * prof.tier + prof.assignedWorkers.length * 2;
      } else if (prof.tier >= 3) {
        cons = 1;
      }
    } else if (resourceKey === 'parts') {
      if (bld.buildingType === bld_TYPE_RELAY_TOWER || bld.buildingType === bld_TYPE_OBSERVATION) {
        prod = 2 * prof.tier + prof.assignedWorkers.length;
      } else if (bld.buildingType === bld_TYPE_GREENHOUSE) {
        cons = 1;
      }
    }

    if (prod > 0) {
      producers.push({
        entityId: bld.id,
        entityType: 'building',
        name: `${bld.name} (Niv. ${prof.tier})`,
        subtitle: `${prof.assignedWorkers.length}/${prof.catalogEntry.maxWorkers} colons actifs (+${prof.workerSynergyBonusPct}% synergie)`,
        amount: prod,
      });
    }

    if (cons > 0) {
      consumers.push({
        entityId: bld.id,
        entityType: 'building',
        name: `${bld.name} (Niv. ${prof.tier})`,
        subtitle: `Entretien & logistique (${prof.catalogEntry.categoryLabel})`,
        amount: cons,
      });
    }
  });

  npcs.forEach((npc) => {
    const rpg = resolveNpcRpgProfile(npc, buildings, npcs, customAssignments);
    let npcProd = 0;
    let npcCons = 0;

    if (
      resourceKey === 'stability' ||
      resourceKey === 'prosperity' ||
      resourceKey === 'knowledge' ||
      resourceKey === 'influence'
    ) {
      rpg.traits.forEach((tr) => {
        const mod = tr.modifiers[resourceKey] ?? 0;
        if (mod > 0) npcProd += mod;
        if (mod < 0) npcCons += Math.abs(mod);
      });
      if (resourceKey === 'prosperity' && npc.role !== npc_ROLE_SOVEREIGN) {
        npcCons += 1;
      }
    } else if (resourceKey === 'energy' && npc.role === npc_ROLE_ENGINEER) {
      npcProd += 3;
    } else if (resourceKey === 'alloy' && npc.role === npc_ROLE_ENGINEER) {
      npcProd += 2;
    } else if (
      resourceKey === 'data' &&
      (npc.role === npc_ROLE_RESEARCHER || npc.role === npc_ROLE_CHRONICLER)
    ) {
      npcProd += 3;
    } else if (
      resourceKey === 'parts' &&
      (npc.role === npc_ROLE_ENGINEER || npc.role === npc_ROLE_PILOT)
    ) {
      npcProd += 2;
    } else if (resourceKey === 'biomass' && npc.role === npc_ROLE_BOTANIST) {
      npcProd += 3;
    }

    if (npcProd > 0) {
      producers.push({
        entityId: npc.id,
        entityType: 'npc',
        name: npc.name,
        subtitle: `${npc.role} • ${rpg.house.name}`,
        amount: npcProd,
      });
    }

    if (npcCons > 0) {
      consumers.push({
        entityId: npc.id,
        entityType: 'npc',
        name: npc.name,
        subtitle: `Besoins civiques & Traits (${npc.role})`,
        amount: npcCons,
      });
    }
  });

  const totalProduction = producers.reduce((acc, item) => acc + item.amount, 0);
  const totalConsumption = consumers.reduce((acc, item) => acc + item.amount, 0);

  return {
    resourceKey,
    family: meta.family,
    code: meta.code,
    label: meta.label,
    unit: meta.unit,
    totalProduction,
    totalConsumption,
    netRatePerTurn: totalProduction - totalConsumption,
    producers,
    consumers,
  };
}

export function computeResourceLedger(
  resourceKey: ExtendedResourceKey,
  buildings: PlacedBuilding[],
  npcs: PlacedNpc[],
  customAssignments?: Record<string, CustomNpcAssignment>
): ResourceLedgerBreakdown {
  return computeExtendedResourceLedger(resourceKey, buildings, npcs, customAssignments);
}

/* ==========================================================================
   7. Pre-Built Character Templates Catalog
   ========================================================================== */

export interface PrebuiltCharacterTemplate {
  id: string;
  name: string;
  role: string;
  houseId: string;
  outfitId: string;
  colorHex: string;
  bio: string;
  mood: string;
  highlightSkill: string;
}

export const PREBUILT_CHARACTERS_CATALOG: PrebuiltCharacterTemplate[] = [
  {
    id: 'cat_char_valerius',
    name: 'Sénateur Quintus Valerius',
    role: npc_ROLE_CHRONICLER,
    houseId: 'house_valerius',
    outfitId: 'outfit_scholar_astronome',
    colorHex: '#fbbf24',
    bio: 'Ancien consul d’Aethelgard, maître des annales constitutionnelles et de l’urbanisme de marbre.',
    mood: 'Solennel et méthodique',
    highlightSkill: 'Droit Impérial (+8 Stabilité)',
  },
  {
    id: 'cat_char_lyra_astraea',
    name: 'Archonte-Astronome Lyra',
    role: npc_ROLE_RESEARCHER,
    houseId: 'house_astraea',
    outfitId: 'outfit_scholar_astronome',
    colorHex: '#38bdf8',
    bio: 'Directrice de l’Observatoire Zénithal, spécialiste des courants géomagnétiques planétaires.',
    mood: 'Inspirée par le cosmos',
    highlightSkill: 'Astrophysique (+9 Savoir)',
  },
  {
    id: 'cat_char_caelus_orion',
    name: 'Maître-Forgeron Caelus Orion',
    role: npc_ROLE_ENGINEER,
    houseId: 'house_orion',
    outfitId: 'outfit_engineer_forge',
    colorHex: '#f97316',
    bio: 'Concepteur des pylônes héliocentriques et des chaussées chauffées du plateau.',
    mood: 'Déterminé et infatigable',
    highlightSkill: 'Réseau Plasmique (+8 Prospérité)',
  },
  {
    id: 'cat_char_floria_silvanus',
    name: 'Grande Botaniste Floria',
    role: npc_ROLE_BOTANIST,
    houseId: 'house_silvanus',
    outfitId: 'outfit_botanist_emerald',
    colorHex: '#34d399',
    bio: 'Acclimate les forêts de cyprès stellaires et les récifs coralliens sur le littoral du plateau.',
    mood: 'En harmonie avec la biosphère',
    highlightSkill: 'Sous-Biomes (+7 Prospérité)',
  },
  {
    id: 'cat_char_cassian_guard',
    name: 'Préfet Prétorien Cassian',
    role: npc_ROLE_SECURITY,
    houseId: 'house_valerius',
    outfitId: 'outfit_sentinel_armor',
    colorHex: '#94a3b8',
    bio: 'Commandant de la Garde Solaire veillant sur la Porte Céleste et les convois orbitaux.',
    mood: 'Vigilant et loyal',
    highlightSkill: 'Bouclier Civique (+9 Stabilité)',
  },
  {
    id: 'cat_char_vesper_nav',
    name: 'Amiral Vespera Celestis',
    role: npc_ROLE_PILOT,
    houseId: 'house_celestis',
    outfitId: 'outfit_navigator_astral',
    colorHex: '#a855f7',
    bio: 'Pilote émérite assurant la liaison commerciale entre les 6 Zones Plateaux de la planète.',
    mood: 'Audacieuse et diplomate',
    highlightSkill: 'Routes Orbitales (+8 Influence)',
  },
];
