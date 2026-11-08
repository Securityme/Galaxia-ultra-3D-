/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Sandbox Gameplay Engine & Demographic Logic
 * Provides systemic gameloop feedback:
 * 1. Demographic & Life-Support Gauges (Happiness, Education, Ecological Health, Employment)
 * 2. 4 Civilization Milestones (Échelons de Civilisation) with clear unlockable objectives
 * 3. Celestial Day/Night Cycle Phase Resolver
 * 4. Weather Display Metadata
 */

import {
  bld_TYPE_BIO_DOME,
  bld_TYPE_GREENHOUSE,
  bld_TYPE_HABITAT,
  bld_TYPE_OBSERVATION,
  npc_ROLE_CHRONICLER,
  npc_ROLE_RESEARCHER,
  WeatherType,
  wtr_AURORA_CURTAIN,
  wtr_CALM,
  wtr_ELECTRICAL_STORM,
  wtr_LIGHT_RAIN,
  wtr_MIST,
  wtr_SOLAR_FLARE,
  wtr_STARDUST_DRIFT,
} from '../../config/constants';
import { PlacedBuilding, PlacedNpc } from '../../contracts/schemas';
import { CustomNpcAssignment } from '../../config/rpgCatalogs';
import { ResourceStockMap } from '../simulation/simulationKernel';

export interface DemographicGauges {
  happiness: number;        // Bonheur citoyen (0 - 100%)
  happinessLabel: string;   // Label textuel (ex: "Rayonnant", "Harmonieux", "Préoccupé")
  education: number;        // Taux d'éducation / Savoir académique (0 - 100%)
  educationLabel: string;   // Label (ex: "Académie Stellaire", "Érudit", "Basique")
  ecologyHealth: number;    // Santé écologique & intégrité du Bio-Dôme (0 - 100%)
  ecologyLabel: string;     // Label (ex: "Biosphère Florissante", "Équilibrée", "Sous Tension")
  employmentRate: number;   // Taux d'affectation aux édifices (0 - 100%)
  assignedCount: number;    // Nombre de colons avec rôle/édifice
  totalColonists: number;   // Population locale
  activeCrisis: string | null; // Alerte de crise si un seuil critique est franchi
}

export interface SandboxMilestone {
  level: number;
  code: string;
  title: string;
  subtitle: string;
  requirementsSummary: string;
  rewardSummary: string;
  isUnlocked: boolean;
  progressPercent: number;
}

export const SANDBOX_MILESTONES_CATALOG: Omit<SandboxMilestone, 'isUnlocked' | 'progressPercent'>[] = [
  {
    level: 1,
    code: 'ECH_01',
    title: 'Échelon I · Colonie des Pionniers',
    subtitle: 'Établissement du camp de base et sustentation du Bio-Dôme',
    requirementsSummary: '≥ 4 Édifices bâtis · Population ≥ 6 · Stabilité ≥ 50%',
    rewardSummary: 'Déverrouillage des Serres d’Orphée & Faune sylvestre pacifiée',
  },
  {
    level: 2,
    code: 'ECH_02',
    title: 'Échelon II · Prospérité & Réseau Solaire',
    subtitle: 'Déploiement des terrasses urbaines et des liaisons inter-zones',
    requirementsSummary: 'Prospérité ≥ 60% · Éducation ≥ 55% · ≥ 2 Édifices Palier II+',
    rewardSummary: 'Convois de fret automatisés & Kiosques-Belvédères en marbre',
  },
  {
    level: 3,
    code: 'ECH_03',
    title: 'Échelon III · Harmonie Biosphérique',
    subtitle: 'Équilibre parfait entre expansion architecturale et symbiose écologique',
    requirementsSummary: 'Santé Écologique ≥ 80% · Savoir ≥ 75% · Bonheur ≥ 70% · ≥ 8 Édifices',
    rewardSummary: 'Coupole Stellaire Zénithale & Réflexion d’Aurore Boréale',
  },
  {
    level: 4,
    code: 'ECH_04',
    title: 'Échelon IV · Apogée Pan-Planétaire',
    subtitle: 'Interconnexion totale des six grands plateaux du monde',
    requirementsSummary: '6 Plateaux colonisés · Population planétaire ≥ 40 · 4 Piliers ≥ 80%',
    rewardSummary: 'Victoire Bac-à-Sable « Éveil du Bio-Dôme Céleste »',
  },
];

export function computeDemographicGauges(
  stocks: ResourceStockMap,
  buildings: PlacedBuilding[],
  npcs: PlacedNpc[],
  assignments: Record<string, CustomNpcAssignment>,
  weatherType: WeatherType = wtr_CALM
): DemographicGauges {
  const stab = Math.min(100, Math.max(0, stocks.stability ?? 50));
  const prosp = Math.min(100, Math.max(0, stocks.prosperity ?? 50));
  const know = Math.min(100, Math.max(0, stocks.knowledge ?? 50));
  const popCount = Math.max(1, npcs.length);

  // 1. Habitats & Housing Ratio
  const habitats = buildings.filter((b) => b.buildingType === bld_TYPE_HABITAT);
  const housingCapacity = habitats.reduce((sum, h) => sum + (h.tier ?? 1) * 3, 2);
  const housingRatio = housingCapacity / popCount;

  // 2. Greenhouses & Bio-Domes
  const bioDomes = buildings.filter((b) => b.buildingType === bld_TYPE_BIO_DOME);
  const greenhouses = buildings.filter((b) => b.buildingType === bld_TYPE_GREENHOUSE);
  const observatories = buildings.filter((b) => b.buildingType === bld_TYPE_OBSERVATION);

  // 3. Happiness Formula
  let happinessRaw = 52 + (stab - 50) * 0.28 + (prosp - 50) * 0.28;
  if (housingRatio >= 1.0) happinessRaw += 12;
  else if (housingRatio < 0.6) happinessRaw -= 14;

  if (greenhouses.length > 0) happinessRaw += 6;
  if (weatherType === wtr_AURORA_CURTAIN) happinessRaw += 8;
  if (weatherType === wtr_LIGHT_RAIN) happinessRaw += 4;
  if (weatherType === wtr_ELECTRICAL_STORM) happinessRaw -= 8;

  const happiness = Math.round(Math.min(100, Math.max(10, happinessRaw)));
  let happinessLabel = 'Harmonieux';
  if (happiness >= 85) happinessLabel = 'Rayonnant & Fervent';
  else if (happiness >= 70) happinessLabel = 'Serein & Confiant';
  else if (happiness >= 50) happinessLabel = 'Équilibré';
  else if (happiness >= 35) happinessLabel = 'Préoccupé';
  else happinessLabel = 'Rancœur & Tension';

  // 4. Education Formula
  const researchersAndChroniclers = npcs.filter(
    (n) => n.role === npc_ROLE_RESEARCHER || n.role === npc_ROLE_CHRONICLER
  ).length;
  const scholarRatio = researchersAndChroniclers / popCount;

  let educationRaw = know * 0.5 + observatories.length * 8 + scholarRatio * 25 + bioDomes.length * 4;
  const education = Math.round(Math.min(100, Math.max(12, educationRaw)));
  let educationLabel = 'Érudit';
  if (education >= 85) educationLabel = 'Académie Stellaire Zénith';
  else if (education >= 70) educationLabel = 'Haut Savoir Impérial';
  else if (education >= 50) educationLabel = 'Culture Active';
  else educationLabel = 'Instruction Primaire';

  // 5. Ecological Health Formula
  const biomass = stocks.biomass ?? 40;
  let ecologyRaw = 58 + bioDomes.length * 10 + greenhouses.length * 8 + (biomass > 40 ? 8 : -8) + (stab * 0.12);
  if (weatherType === wtr_LIGHT_RAIN || weatherType === wtr_MIST) ecologyRaw += 5;
  const ecologyHealth = Math.round(Math.min(100, Math.max(15, ecologyRaw)));
  let ecologyLabel = 'Biosphère Florissante';
  if (ecologyHealth >= 85) ecologyLabel = 'Symbiose Végétale Totale';
  else if (ecologyHealth >= 70) ecologyLabel = 'Écosystème Vigoureux';
  else if (ecologyHealth >= 50) ecologyLabel = 'Équilibre Tempéré';
  else if (ecologyHealth >= 35) ecologyLabel = 'Saturation Végétale';
  else ecologyLabel = 'Détresse Atmosphérique';

  // 6. Employment / Assignment
  let assignedCount = 0;
  npcs.forEach((n) => {
    const asg = assignments[n.id];
    if (asg?.workBuildingId || asg?.homeBuildingId) {
      assignedCount++;
    } else {
      // Default auto-employment if productive buildings exist
      if (buildings.length > 0) assignedCount += 0.8;
    }
  });
  const employmentRate = Math.round(Math.min(100, (assignedCount / popCount) * 100));

  // 7. Active Crisis Warnings
  let activeCrisis: string | null = null;
  if (stab < 28) {
    activeCrisis = 'Crise de Stabilité : Agitation sociale dans le Bio-Dôme !';
  } else if (ecologyHealth < 30) {
    activeCrisis = 'Alerte Écologique : Perturbation atmosphérique sous la cloche de verre !';
  } else if (happiness < 25) {
    activeCrisis = 'Crise Morale : Démotivation des pionniers, productivité en baisse.';
  }

  return {
    happiness,
    happinessLabel,
    education,
    educationLabel,
    ecologyHealth,
    ecologyLabel,
    employmentRate,
    assignedCount: Math.round(assignedCount),
    totalColonists: popCount,
    activeCrisis,
  };
}

export function computeSandboxMilestones(
  stocks: ResourceStockMap,
  buildings: PlacedBuilding[],
  npcs: PlacedNpc[],
  demo: DemographicGauges,
  totalPlanetaryBuildings: number,
  totalPlanetaryPopulation: number
): SandboxMilestone[] {
  const stab = stocks.stability ?? 50;
  const prosp = stocks.prosperity ?? 50;
  const know = stocks.knowledge ?? 50;
  const infl = stocks.influence ?? 50;
  const tier2Buildings = buildings.filter((b) => (b.tier ?? 1) >= 2).length;

  return SANDBOX_MILESTONES_CATALOG.map((m) => {
    let unlocked = false;
    let progress = 0;

    if (m.level === 1) {
      const bldOk = buildings.length >= 4;
      const popOk = npcs.length >= 6;
      const stabOk = stab >= 50;
      progress = Math.round(
        ((Math.min(4, buildings.length) / 4) * 0.4 +
          (Math.min(6, npcs.length) / 6) * 0.3 +
          (Math.min(50, stab) / 50) * 0.3) *
          100
      );
      unlocked = bldOk && popOk && stabOk;
    } else if (m.level === 2) {
      const prospOk = prosp >= 60;
      const eduOk = demo.education >= 55;
      const tierOk = tier2Buildings >= 2;
      progress = Math.round(
        ((Math.min(60, prosp) / 60) * 0.4 +
          (Math.min(55, demo.education) / 55) * 0.3 +
          (Math.min(2, tier2Buildings) / 2) * 0.3) *
          100
      );
      unlocked = prospOk && eduOk && tierOk;
    } else if (m.level === 3) {
      const ecoOk = demo.ecologyHealth >= 80;
      const knowOk = know >= 75;
      const happyOk = demo.happiness >= 70;
      const bldCountOk = buildings.length >= 8;
      progress = Math.round(
        ((Math.min(80, demo.ecologyHealth) / 80) * 0.3 +
          (Math.min(75, know) / 75) * 0.3 +
          (Math.min(70, demo.happiness) / 70) * 0.2 +
          (Math.min(8, buildings.length) / 8) * 0.2) *
          100
      );
      unlocked = ecoOk && knowOk && happyOk && bldCountOk;
    } else if (m.level === 4) {
      const popOk = totalPlanetaryPopulation >= 40;
      const bldOk = totalPlanetaryBuildings >= 25;
      const avgPillars = (stab + prosp + know + infl) / 4;
      const pillarsOk = avgPillars >= 80;
      progress = Math.round(
        ((Math.min(40, totalPlanetaryPopulation) / 40) * 0.35 +
          (Math.min(25, totalPlanetaryBuildings) / 25) * 0.35 +
          (Math.min(80, avgPillars) / 80) * 0.3) *
          100
      );
      unlocked = popOk && bldOk && pillarsOk;
    }

    return {
      ...m,
      isUnlocked: unlocked,
      progressPercent: Math.min(100, Math.max(0, progress)),
    };
  });
}

/**
 * Returns clean celestial phase information from celestialTime (0.0 .. 1.0).
 */
export function getCelestialPhaseInfo(celestialTime: number): {
  phase: 'dawn' | 'noon' | 'dusk' | 'night';
  label: string;
  hourFormatted: string;
  description: string;
} {
  // Normalize 0..1
  const t = ((celestialTime % 1.0) + 1.0) % 1.0;
  const hours24 = t * 24;
  const hours = Math.floor(hours24);
  const minutes = Math.floor((hours24 - hours) * 60);
  const hourFormatted = `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;

  if (t >= 0.2 && t < 0.38) {
    return {
      phase: 'dawn',
      label: 'Aube Dorée',
      hourFormatted,
      description: 'L’étoile impériale émerge à l’horizon du plateau, éveillant la rosée.',
    };
  }
  if (t >= 0.38 && t < 0.68) {
    return {
      phase: 'noon',
      label: 'Zénith Solaire',
      hourFormatted,
      description: 'Plein jour solaire baignant le Bio-Dôme et dynamisant la photosynthèse.',
    };
  }
  if (t >= 0.68 && t < 0.85) {
    return {
      phase: 'dusk',
      label: 'Crépuscule d’Ambre',
      hourFormatted,
      description: 'Déclin rougeoyant et allumage des lanternes dorées des cités.',
    };
  }
  return {
    phase: 'night',
    label: 'Nuit Étoilée',
    hourFormatted,
    description: 'Nuit cosmique sous la voûte céleste et les particules scintillantes.',
  };
}

/**
 * Returns weather display title & details.
 */
export function getWeatherDisplayInfo(weather: WeatherType): {
  label: string;
  badgeColor: string;
  description: string;
} {
  switch (weather) {
    case wtr_LIGHT_RAIN:
      return {
        label: 'Pluie Fine Céleste',
        badgeColor: '#38bdf8',
        description: 'Gouttes cristallines nourrissant les sols et les bassins de lotus.',
      };
    case wtr_MIST:
      return {
        label: 'Brume Bioluminescente',
        badgeColor: '#34d399',
        description: 'Vapeurs douces dérivant sur les reliefs et les forêts de sous-biomes.',
      };
    case wtr_AURORA_CURTAIN:
      return {
        label: 'Aurore Boréale',
        badgeColor: '#a855f7',
        description: 'Rideaux ionisés étincelants stimulant le bonheur et l’inspiration.',
      };
    case wtr_ELECTRICAL_STORM:
      return {
        label: 'Orage Tellurique',
        badgeColor: '#f59e0b',
        description: 'Arcs électriques refluant vers les obélisques et tours-relais.',
      };
    case wtr_SOLAR_FLARE:
      return {
        label: 'Rayonnement Solaire',
        badgeColor: '#fb923c',
        description: 'Vague de chaleur thermique traversant la coupole du terrarium.',
      };
    case wtr_STARDUST_DRIFT:
      return {
        label: 'Poussière d’Étoiles',
        badgeColor: '#fde047',
        description: 'Météorites microscopiques et poudrin cosmique dérivant dans l’air.',
      };
    case wtr_CALM:
    default:
      return {
        label: 'Ciel Clair & Limpide',
        badgeColor: '#fbbf24',
        description: 'Atmosphère stable et pure sous la coupole du bio-dôme.',
      };
  }
}

/**
 * PT-78: Computes vector cosine similarity between two embedding vectors.
 * Used by the Grand Chronicle Deep Memory retrieval algorithm.
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * PT-78: Retrieves the Top-K most relevant deep memories from historical chronicle entries
 * using vector cosine similarity ranking over vector embeddings.
 */
export function retrieveDeepChronicleMemories<T extends { title: string; narrative: string; embedding?: number[] }>(
  queryEmbedding: number[],
  entries: T[],
  topK = 3
): { entry: T; similarity: number }[] {
  if (!queryEmbedding || queryEmbedding.length === 0 || entries.length === 0) {
    return entries.slice(0, topK).map((entry) => ({ entry, similarity: 0.5 }));
  }

  const scored = entries.map((entry) => {
    const sim = entry.embedding ? computeCosineSimilarity(queryEmbedding, entry.embedding) : 0.3;
    return { entry, similarity: sim };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

/**
 * Triggers particle confetti celebration burst upon Sandbox Milestone completion.
 */
export function triggerMilestoneCelebrationConfetti() {
  try {
    import('canvas-confetti').then((confettiModule) => {
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#38bdf8', '#34d399', '#a855f7'],
      });
    }).catch(() => {
      // Ignore if canvas-confetti unavailable
    });
  } catch {
    // Ignore error
  }
}
