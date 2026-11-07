/**
 * PAX HISTORIA 3D • Deep RPG & Encyclopedic Catalogs (Astral Antiquity Style)
 * Includes:
 * - Noble Houses & Dynastic Factions (Maisons Nobles)
 * - 3D Outfits & Attire Catalog (Tenues selon rang et métier)
 * - Character Traits with Civilization Bonuses & Maluses (Traits & Caractéristiques)
 * - 5 Core Aptitude Scores & Skills (Compétences & Points d'Aptitudes)
 * - Home Residence & Work Building Assignments + Relational Graph (Liens Relationnels)
 * - Extended Building & World Wonders Catalog
 */

import {
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
    lore: 'Gardiens des semences originelles et maîtres des bio-dômes climatiques. Ils façonnent les micro-climats du plateau.',
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
    description: 'Vêtement tissé de fibres bioluminescentes adapté aux micro-climats tropicaux et alpins.',
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
  modifiers: {
    stability?: number;
    prosperity?: number;
    knowledge?: number;
    influence?: number;
  };
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
    name: 'Maître des Micro-Climats',
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
    description: 'Exige des matériaux d’une pureté rare, ralentissant le trésor.',
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
  affinityScore: number; // -100 to +100
}

export interface NpcAptitudes {
  governance: number; // 1-20
  erudition: number;  // 1-20
  industry: number;   // 1-20
  diplomacy: number;  // 1-20
  martial: number;    // 1-20
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
  loyaltyToSovereign: number; // 0-100%
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
 * Deterministically resolves a rich RPG sheet (House, Outfit, Home/Work buildings,
 * Aptitudes, Skills, Bonus/Malus Traits, and Relationships) for any NPC on the plateau.
 */
export function resolveNpcRpgProfile(
  npc: PlacedNpc,
  buildings: PlacedBuilding[],
  allNpcs: PlacedNpc[]
): ResolvedNpcRpgProfile {
  const h = hashString(`${npc.id}_${npc.name}_${npc.role}`);
  const isSovereign = npc.role === npc_ROLE_SOVEREIGN;

  // 1. Noble House
  const houseIndex = isSovereign ? 0 : h % NOBLE_HOUSES_CATALOG.length;
  const house = NOBLE_HOUSES_CATALOG[houseIndex];

  // 2. Outfit matched to Role
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
  } else if (npc.role === npc_ROLE_CHRONICLER) {
    outfit = OUTFIT_CATALOG[1];
  }

  // 3. Home Residence & Work Building Assignment
  const habitats = buildings.filter((b) => b.buildingType === bld_TYPE_HABITAT);
  const workBuildings = buildings.filter((b) => b.buildingType !== bld_TYPE_HABITAT);

  const homeBld =
    habitats.length > 0
      ? habitats[h % habitats.length]
      : buildings.length > 0
      ? buildings[h % buildings.length]
      : null;

  let preferredWorkType: BuildingType = bld_TYPE_OBSERVATION;
  if (npc.role === npc_ROLE_ENGINEER) preferredWorkType = bld_TYPE_RELAY_TOWER;
  else if (npc.role === npc_ROLE_BOTANIST) preferredWorkType = bld_TYPE_GREENHOUSE;
  else if (npc.role === npc_ROLE_RESEARCHER) preferredWorkType = bld_TYPE_BIO_DOME;

  const matchingWork =
    buildings.find((b) => b.buildingType === preferredWorkType) ??
    (workBuildings.length > 0
      ? workBuildings[(h >> 2) % workBuildings.length]
      : buildings[0] ?? null);

  // 4. Aptitudes (1-20 scale)
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

  // 5. Skills
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

  // 6. Traits (2 Bonuses + 1 optional Malus for realism)
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

  // 7. Relationships with other NPCs on the plateau
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
   5. Pre-Built Character & Architectural Catalogs (Importable / Spawnable)
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
    highlightSkill: 'Micro-Climats (+7 Prospérité)',
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

export interface ArchitecturalCatalogEntry {
  buildingType: BuildingType;
  title: string;
  categoryLabel: string;
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
    urbanDistrictEffect: 'Génère un Parvis Académique pavé de marbre clair',
    workforceRole: npc_ROLE_RESEARCHER,
    civilizationYield: '+8 Savoir • +4 Influence',
    description: 'Tour néo-classique à colonnade supportant une coupole astronomique et des anneaux armillaires en rotation.',
  },
  {
    buildingType: bld_TYPE_BIO_DOME,
    title: 'Bio-Dôme Climatique Impérial',
    categoryLabel: 'Biosphère & Écologie',
    urbanDistrictEffect: 'Crée une Esplanade Botanique avec jardins et bassins',
    workforceRole: npc_ROLE_BOTANIST,
    civilizationYield: '+7 Savoir • +6 Prospérité',
    description: 'Verrière géodésique abritant un écosystème pressurisé et régulant le micro-climat environnant.',
  },
  {
    buildingType: bld_TYPE_RELAY_TOWER,
    title: 'Obélisque & Tour Relais Solaire',
    categoryLabel: 'Énergie & Infrastructure',
    urbanDistrictEffect: 'Établit un Nœud Énergétique illuminé de lanternes dorées',
    workforceRole: npc_ROLE_ENGINEER,
    civilizationYield: '+9 Prospérité • +4 Stabilité',
    description: 'Flèche énergétique captant le rayonnement stellaire pour alimenter toute la province.',
  },
  {
    buildingType: bld_TYPE_HABITAT,
    title: 'Villa Patricienne & Domus Citoyenne',
    categoryLabel: 'Résidence & Maisons Nobles',
    urbanDistrictEffect: 'Développe un Quartier Résidentiel Pavé relié au Forum',
    workforceRole: npc_ROLE_CHRONICLER,
    civilizationYield: '+8 Stabilité • +5 Population',
    description: 'Demeure noble à péristyle et fenêtres chaudement illuminées servant de domicile aux familles et citoyens.',
  },
  {
    buildingType: bld_TYPE_GREENHOUSE,
    title: 'Serre Hydroponique d’Abondance',
    categoryLabel: 'Agriculture & Subsistance',
    urbanDistrictEffect: 'Aménage des Terrasses Agricoles et canaux d’irrigation',
    workforceRole: npc_ROLE_BOTANIST,
    civilizationYield: '+8 Prospérité • +5 Stabilité',
    description: 'Complexe agricole sous voûte cristalline produisant les vivres et élixirs botaniques de la cité.',
  },
];
