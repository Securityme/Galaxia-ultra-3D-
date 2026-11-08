/**
 * GALAXIA ULTRA • Default Game Configuration & Starter Entities
 */

import {
  bld_TYPE_OBSERVATION,
  bld_TYPE_BIO_DOME,
  bld_TYPE_RELAY_TOWER,
  bld_TYPE_HABITAT,
  bld_TYPE_GREENHOUSE,
  npc_ROLE_RESEARCHER,
  npc_ROLE_ENGINEER,
  npc_ROLE_BOTANIST,
  npc_ROLE_PILOT,
  npc_ROLE_SECURITY,
  npc_ROLE_CHRONICLER,
  wld_DEFAULT_RELIEF_SCALE,
} from './constants';
import { GameConfig, PlacedBuilding, PlacedNpc, ChronicleEntry } from '../contracts/schemas';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  worldName: 'Aethelgard Prime',
  seed: 'GALAXIA-ULTRA-77',
  presetId: 'terra_blue',
  reliefScale: wld_DEFAULT_RELIEF_SCALE,
  initialCrewCount: 8,
  autoCycleTime: true,
  weatherDynamic: true,
};

export const INITIAL_BUILDINGS: PlacedBuilding[] = [
  {
    id: 'bld_initial_obs',
    buildingType: bld_TYPE_OBSERVATION,
    name: 'Citadelle Astronomique d’Aethelgard',
    description: 'Structure principale de vigie orbitale de GALAXIA surplombant le vide.',
    x: 0,
    z: -4.5,
    rotation: 0.2,
    scale: 1.05,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_dome',
    buildingType: bld_TYPE_BIO_DOME,
    name: 'Conservatoire Impérial Aube',
    description: 'Cocon pressurisé hébergeant les premiers plants photosynthétiques.',
    x: -8.5,
    z: 4.5,
    rotation: 0.8,
    scale: 1.0,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_relay',
    buildingType: bld_TYPE_RELAY_TOWER,
    name: 'Obélisque Télémétrique Alpha',
    description: 'Pylône vertical émettant des impulsions de confinement magnétique.',
    x: 9.2,
    z: 3.8,
    rotation: -0.4,
    scale: 1.05,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_green',
    buildingType: bld_TYPE_GREENHOUSE,
    name: 'Jardins Botaniques d’Orphée',
    description: 'Serres en terrasses cultivant des essences rares et des lotus luminescents.',
    x: -11.5,
    z: -7.5,
    rotation: 0.5,
    scale: 1.02,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_hab1',
    buildingType: bld_TYPE_HABITAT,
    name: 'Demeure Patricienne des Méridiens',
    description: 'Quartier résidentiel à colonnades de marbre hébergeant les érudits.',
    x: 11.0,
    z: -8.0,
    rotation: -0.3,
    scale: 1.0,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_hab2',
    buildingType: bld_TYPE_HABITAT,
    name: 'Pavillon Consulaire du Lagon',
    description: 'Villa côtière surplombant le miroir d’eau et les bassins de carpes astrales.',
    x: 2.5,
    z: 11.5,
    rotation: 0.9,
    scale: 0.98,
    assembledAt: 0,
  },
];

const CREW_POOL: Omit<PlacedNpc, 'id' | 'x' | 'z' | 'targetX' | 'targetZ' | 'spawnedAt'>[] = [
  {
    name: 'Archonte Nova Stern',
    role: npc_ROLE_RESEARCHER,
    bio: 'Supervise les équilibres écologiques du bio-dôme et la cartographie planétaire.',
    mood: 'Contemplatif et concentré',
    colorHex: '#38bdf8',
  },
  {
    name: 'Maître Eos Ray',
    role: npc_ROLE_ENGINEER,
    bio: 'Inspecte les micro-turbines de sustentation sous la coque biseautée du plateau.',
    mood: 'Actif et satisfait',
    colorHex: '#f97316',
  },
  {
    name: 'Caelum Vane',
    role: npc_ROLE_BOTANIST,
    bio: 'Surveille la propagation des fougères et spores bioluminescentes dans la régolite.',
    mood: 'Serein',
    colorHex: '#34d399',
  },
  {
    name: 'Capitaine Lyra Kael',
    role: npc_ROLE_PILOT,
    bio: 'Coordonne les trajectoires orbitales et les navettes de la Porte Céleste.',
    mood: 'Vigilante',
    colorHex: '#f472b6',
  },
  {
    name: 'Prétorien Orion Vance',
    role: npc_ROLE_SECURITY,
    bio: 'Assure la protection des dômes contre les tempêtes d’ions et micro-météorites.',
    mood: 'Déterminé',
    colorHex: '#fbbf24',
  },
  {
    name: 'Annales Soren Thal',
    role: npc_ROLE_CHRONICLER,
    bio: 'Consigne chaque découverte et mutation dans les annales de GALAXIA.',
    mood: 'Inspiré',
    colorHex: '#a875ff',
  },
  {
    name: 'Botaniste Elara Solis',
    role: npc_ROLE_BOTANIST,
    bio: 'Acclimate la faune des clairières et les lotus aquatiques du lagon.',
    mood: 'Émerveillée',
    colorHex: '#10b981',
  },
  {
    name: 'Architecte Valerius Korr',
    role: npc_ROLE_ENGINEER,
    bio: 'Entretient les colonnades en marbre de Carrare et les lampadaires solaires.',
    mood: 'Méthodique',
    colorHex: '#f59e0b',
  },
  {
    name: 'Astrophysicienne Séraphine Nyx',
    role: npc_ROLE_RESEARCHER,
    bio: 'Analyse les harmoniques de la Couronne de l’Aurore depuis l’Observatoire.',
    mood: 'Studieuse',
    colorHex: '#60a5fa',
  },
  {
    name: 'Navigateur Cassian Drak',
    role: npc_ROLE_PILOT,
    bio: 'Trace les corridors aériens entre les six grands plateaux planétaires.',
    mood: 'Audacieux',
    colorHex: '#ec4899',
  },
];

/**
 * Generates initial pioneers according to configured crew count.
 */
export function buildStarterNpcs(count: number, zonePrefix = 'init'): PlacedNpc[] {
  const result: PlacedNpc[] = [];
  for (let i = 0; i < count; i++) {
    const template = CREW_POOL[i % CREW_POOL.length];
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + 0.35;
    const rad = 4.2 + (i % 4) * 3.4;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    result.push({
      id: `npc_${zonePrefix}_${i + 1}`,
      name: i >= CREW_POOL.length ? `${template.name} #${i + 1}` : template.name,
      role: template.role,
      bio: template.bio,
      mood: template.mood,
      colorHex: template.colorHex,
      x,
      z,
      targetX: x + Math.cos(angle + 1.2) * 4,
      targetZ: z + Math.sin(angle + 1.2) * 4,
      spawnedAt: 0,
    });
  }
  return result;
}

export const INITIAL_CHRONICLES: ChronicleEntry[] = [
  {
    id: 'chronicle_genesis',
    timestamp: 1000,
    turnNumber: 1,
    title: 'Initialisation du Monde & Éveil de la Biosphère 3D',
    narrative:
      'Le secteur est désormais verrouillé. Les forêts de sous-biomes, la faune des clairières, les nuées d’oiseaux célestes et les cités de marbre prospèrent sous la cloche du Bio-Dôme.',
    chosenChoiceLabel: 'Ouvrir les capteurs de surface et la cartographie 3D',
    mutationsSummary: [
      'Cité : 6 édifices fondateurs et 8 colons en activité',
      'Écosystème : Faune 3D & Flore luxuriante déployées',
    ],
  },
];
