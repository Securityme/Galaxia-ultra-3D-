/**
 * PAX HISTORIA 3D • Grand Historical & Planetary Event Generator
 * Provides rich historical decrees, geopolitical dilemmas, and civilizational milestones.
 */

import { TurnBatch, TurnChoice } from '../contracts/schemas';
import { createPRNG } from './prng';
import {
  bld_TYPE_OBSERVATION,
  bld_TYPE_BIO_DOME,
  bld_TYPE_RELAY_TOWER,
  bld_TYPE_HABITAT,
  bld_TYPE_GREENHOUSE,
} from '../config/constants';

export interface FallbackContext {
  turnNumber: number;
  seed: string | number;
  buildingCount: number;
  population: number;
  sectorName: string;
}

interface NarrativeTemplate {
  title: string;
  narrative: string;
  choices: TurnChoice[];
}

const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  {
    title: 'Le Grand Concile Cartographique & Traité des Méridiens',
    narrative:
      'Les géographes et astronomes de la capitale viennent de achever le relevé topographique intégral des continents. Plusieurs provinces fertiles au-delà des chaînes côtières réclament la construction d’un observatoire souverain pour unifier l’heure légale, sécuriser les routes maritimes et sceller la Pax Historia entre les cités.',
    choices: [
      {
        id: 'c_carto_observatory',
        label: 'Fonder le Grand Observatoire Impérial des Méridiens',
        summary: 'Établit une autorité scientifique centrale et attire des cartographes de renom.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Observatoire des Méridiens',
            description: 'Citadelle astronomique coordonnant la cartographie planétaire et les traités.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Archonte Valerius',
            role: 'Chroniqueur Stellaire',
            bio: 'Maître cartographe ayant tracé les frontières pacifiées du nouvel atlas.',
            mood: 'Solennel et visionnaire',
          },
        ],
      },
      {
        id: 'c_carto_dome',
        label: 'Inaugurer l’Académie Botanique & Conservatoire Impérial',
        summary: 'Rassemble les espèces endémiques de chaque continent sous une coupole de cristal.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_BIO_DOME,
            name: 'Conservatoire Impérial',
            description: 'Vaste dôme abritant la flore précieuse des archipels et des hauts plateaux.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Dame Cassiopée',
            role: 'Botaniste Stellaire',
            bio: 'Naturaliste diplomatique œuvrant à l’autosuffisance des provinces.',
            mood: 'Inspirée par la diversité du monde',
          },
        ],
      },
      {
        id: 'c_carto_golden_age',
        label: 'Proclamer le Jubilé de la Paix Continentale',
        summary: 'Illumine le ciel d’une clarté dorée solennelle célébrant l’unité des territoires.',
        mutations: [
          {
            type: 'AMBIENCE' as const,
            skyTint: '#38bdf8',
            lightIntensity: 1.5,
            particleDensity: 1.2,
            weatherEffect: 'aurora_curtain' as const,
            stormIntensity: 0.55,
            eventNote: 'Clarté boréale apaisante célébrant la signature du Traité des Méridiens.',
          },
        ],
      },
    ],
  },
  {
    title: 'L’Essor des Cités Franches & Routes Commerciales',
    narrative:
      'Une délégation de guildes marchandes et d’ingénieurs navals sollicite une charte d’expansion. Les récoltes abondantes des vallées intérieures permettent d’ériger un nouveau quartier résidentiel ou d’étendre les jardins agronomiques en terrasses pour soutenir la croissance démographique.',
    choices: [
      {
        id: 'c_free_city_habitat',
        label: 'Octroyer la Charte et bâtir la Cité Franche d’Aurélia',
        summary: 'Érige un complexe résidentiel prospère accueillant artisans et citoyens.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_HABITAT,
            name: 'Quartier Souverain d’Aurélia',
            description: 'Ensemble architectural harmonieux doté de places civiques et de belvédères.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Consul Marcus Aurel',
            role: 'Pilote de Navette',
            bio: 'Explorateur et diplomate supervisant les flottes marchandes intercontinentales.',
            mood: 'Prospère et confiant',
          },
        ],
      },
      {
        id: 'c_free_city_greenhouse',
        label: 'Développer les Grandes Terrasses Agronomiques',
        summary: 'Garantit des réserves vivrières durables pour les décennies à venir.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_GREENHOUSE,
            name: 'Jardins Suspendus d’Hélios',
            description: 'Verrières monumentales irrigant des cultures rares à haut rendement.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Maître Silvanus',
            role: 'Chercheur en Exobiologie',
            bio: 'Agronome en chef ayant doublé la fertilité des sols alluviaux.',
            mood: 'Serein et méthodique',
          },
        ],
      },
    ],
  },
  {
    title: 'La Révolution Énergétique des Phares Électromagnétiques',
    narrative:
      'Les savants de la guilde polytechnique présentent un procédé capable de capter le courant géomagnétique des failles profondes. En érigeant un Phare-Relais sur les contreforts rocheux, toute la province bénéficierait d’une puissance industrielle sans précédent.',
    choices: [
      {
        id: 'c_energy_spire',
        label: 'Ériger le Grand Phare Électromagnétique',
        summary: 'Déploie une tour-relais monumentale alimentant l’ensemble du domaine.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_RELAY_TOWER,
            name: 'Phare Souverain de Prométhée',
            description: 'Flèche énergétique canalisant les courants telluriques et atmosphériques.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Ingénieur Nikolaos',
            role: 'Ingénieur Quantique',
            bio: 'Architecte des réseaux d’énergie sans fil reliant les cités du plateau.',
            mood: 'Passionné et inventif',
          },
        ],
      },
      {
        id: 'c_energy_storm',
        label: 'Tester la résonance atmosphérique à pleine puissance',
        summary: 'Déclenche un spectacle d’arcs électriques autour des tours de transmission.',
        mutations: [
          {
            type: 'AMBIENCE' as const,
            skyTint: '#0284c7',
            lightIntensity: 1.65,
            particleDensity: 1.5,
            weatherEffect: 'electrical_storm' as const,
            stormIntensity: 0.85,
            eventNote: 'Orage magnétique contrôlé illuminant les crêtes et les phares énergétiques.',
          },
        ],
      },
    ],
  },
  {
    title: 'Ambassade des Royaumes Insulaires',
    narrative:
      'Des navires battant pavillon des archipels australs accostent aux portes du domaine. Leurs émissaires proposent une alliance perpétuelle assortie d’un partage de leurs archives historiques et de leurs techniques de construction antisismique.',
    choices: [
      {
        id: 'c_embassy_dome',
        label: 'Ratifier l’Alliance et ériger le Palais de la Concorde',
        summary: 'Scelle l’amitié entre les continents et renforce le prestige diplomatique.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_BIO_DOME,
            name: 'Palais de la Concorde',
            description: 'Dôme diplomatique où siègent les ambassadeurs des provinces unies.',
          },
          {
            type: 'SPAWN_NPC' as const,
            name: 'Ambassadrice Lyanna',
            role: 'Sentinelle de Bord',
            bio: 'Garante des traités de paix et de la sécurité des délégations étrangères.',
            mood: 'Digne et bienveillante',
          },
        ],
      },
      {
        id: 'c_embassy_observatory',
        label: 'Fonder l’Institut des Chroniques Mondiales',
        summary: 'Archive l’histoire des civilisations et éclaire les décisions futures.',
        mutations: [
          {
            type: 'BUILD' as const,
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Archives de Pax Historia',
            description: 'Tour-bibliothèque et observatoire veillant sur la mémoire des âges.',
          },
        ],
      },
    ],
  },
];

export function generateFallbackEventBatch(context: FallbackContext): TurnBatch {
  const prng = createPRNG(`${context.seed}_turn_${context.turnNumber}`);
  const template = prng.pick(NARRATIVE_TEMPLATES);

  return {
    title: `${template.title} (An ${1200 + context.turnNumber * 12})`,
    narrative: template.narrative,
    choices: template.choices,
    sectorCode: `CHRONIQUE • ${context.sectorName.toUpperCase()}`,
  };
}
