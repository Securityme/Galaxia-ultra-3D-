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
  initialCrewCount: 4,
  autoCycleTime: true,
  weatherDynamic: true,
};

export const INITIAL_BUILDINGS: PlacedBuilding[] = [
  {
    id: 'bld_initial_obs',
    buildingType: bld_TYPE_OBSERVATION,
    name: 'Poste d’Observation Stellaire',
    description: 'Structure principale de vigie orbitale de GALAXIA surplombant le vide.',
    x: 0,
    z: -4,
    rotation: 0.2,
    scale: 1.0,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_dome',
    buildingType: bld_TYPE_BIO_DOME,
    name: 'Dôme Expérimental Aube',
    description: 'Cocon pressurisé hébergeant les premiers plants photosynthétiques.',
    x: -8.5,
    z: 6,
    rotation: 0.8,
    scale: 0.98,
    assembledAt: 0,
  },
  {
    id: 'bld_initial_relay',
    buildingType: bld_TYPE_RELAY_TOWER,
    name: 'Tour-Relais Ionique Epsilon',
    description: 'Pylône vertical émettant des impulsions de confinement magnétique.',
    x: 9.5,
    z: 5,
    rotation: -0.4,
    scale: 1.05,
    assembledAt: 0,
  },
];

const CREW_POOL: Omit<PlacedNpc, 'id' | 'x' | 'z' | 'targetX' | 'targetZ' | 'spawnedAt'>[] = [
  {
    name: 'Commandant Nova Stern',
    role: npc_ROLE_RESEARCHER,
    bio: 'Supervise les équilibres écologiques du bio-dôme et la cartographie planétaire.',
    mood: 'Contemplatif et concentré',
    colorHex: '#38bdf8',
  },
  {
    name: 'Eos Ray',
    role: npc_ROLE_ENGINEER,
    bio: 'Inspecte les micro-turbines de sustentation sous la coque biseautée du plateau.',
    mood: 'Actif et satisfait',
    colorHex: '#f97316',
  },
  {
    name: 'Caelum Vane',
    role: npc_ROLE_BOTANIST,
    bio: 'Surveille la propagation des spores bioluminescentes dans la régolite fertile.',
    mood: 'Serein',
    colorHex: '#34d399',
  },
  {
    name: 'Lyra Kael',
    role: npc_ROLE_PILOT,
    bio: 'Coordonne les trajectoires orbitales et les sondes de reconnaissance.',
    mood: 'Vigilante',
    colorHex: '#f472b6',
  },
  {
    name: 'Orion Vance',
    role: npc_ROLE_SECURITY,
    bio: 'Assure la protection des dômes contre les tempêtes d’ions et micro-météorites.',
    mood: 'Déterminé',
    colorHex: '#fbbf24',
  },
  {
    name: 'Soren Thal',
    role: npc_ROLE_CHRONICLER,
    bio: 'Consigne chaque découverte et mutation dans les annales de GALAXIA.',
    mood: 'Inspiré',
    colorHex: '#a855f7',
  },
];

/**
 * Generates initial pioneers according to configured crew count.
 */
export function buildStarterNpcs(count: number): PlacedNpc[] {
  const result: PlacedNpc[] = [];
  for (let i = 0; i < count; i++) {
    const template = CREW_POOL[i % CREW_POOL.length];
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const rad = 4.5 + (i % 3) * 2.5;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    result.push({
      id: `npc_init_${i + 1}`,
      name: i >= CREW_POOL.length ? `${template.name} #${i + 1}` : template.name,
      role: template.role,
      bio: template.bio,
      mood: template.mood,
      colorHex: template.colorHex,
      x,
      z,
      targetX: x + 2,
      targetZ: z - 2,
      spawnedAt: 0,
    });
  }
  return result;
}

export const INITIAL_CHRONICLES: ChronicleEntry[] = [
  {
    id: 'chronicle_genesis',
    timestamp: Date.now() - 60000,
    turnNumber: 1,
    title: 'Initialisation du Monde & Cartographie Orbitale',
    narrative:
      'Le secteur est désormais verrouillé. Depuis la passerelle, vous pouvez basculer librement entre la Vue Plateau (avec vos modules et pionniers en activité) et la Vue Planète 3D globale (affichant la carte du monde et les biomes à l’échelle planétaire).',
    chosenChoiceLabel: 'Ouvrir les capteurs de surface et la cartographie 3D',
    mutationsSummary: [
      'Bâtiments : 3 modules fondateurs actifs',
      'Cartographie : Globe Planétaire 3D synchronisé',
    ],
  },
];
