/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Catalogue de Secours Étendu (12 Gabarits V2, PT-54 / PT-55)
 * - 12 gabarits répartis sur les 5 catégories canoniques :
 *   * FONDATION (3), EXPLORATION (3), DIPLOMATIE (2), CRISE (2), CEREMONIE (2)
 * - Intègre les effets économiques motivés (`economicEffects` sur ressources Impériales, Matières et Technologies `rsc_`),
 *   les effets latents (`pendingEffects` à échéance 1..3 tours avec `hint` diégétique) et les références causales (`causalRefs`).
 * - Cure GEC-01-R : identité 100% GALAXIA ULTRA • Bio-Dôme de Poche.
 */

import {
  EventCategory,
  NarrativeEventV2,
  TurnBatch,
  TurnChoice,
  WorldBrief,
} from '../contracts/schemas';
import { createPRNG } from './prng';
import {
  bld_TYPE_BIO_DOME,
  bld_TYPE_GREENHOUSE,
  bld_TYPE_HABITAT,
  bld_TYPE_OBSERVATION,
  bld_TYPE_RELAY_TOWER,
} from '../config/constants';

export interface WorldStateResourceRates {
  stability: number;
  prosperity: number;
  knowledge: number;
  influence: number;
  netStabilityPerTurn: number;
  netProsperityPerTurn: number;
  netKnowledgePerTurn: number;
  netInfluencePerTurn: number;
}

export interface FallbackContext {
  turnNumber: number;
  seed: string | number;
  buildingCount: number;
  population: number;
  sectorName: string;
  empireName?: string;
  biomeName?: string;
  climateEffectLabel?: string;
  subBiomeNames?: string[];
  resourceRates?: WorldStateResourceRates;
  activeBuildingsSummary?: string[];
  activeCitizensSummary?: string[];
  recentChronicleTitles?: string[];
  worldBrief?: WorldBrief;
}

interface ExtendedNarrativeTemplate {
  id: string;
  category: EventCategory;
  threadId: string;
  preferredBiomes?: string[];
  title: string;
  narrative: string;
  choices: TurnChoice[];
}

export const EXTENDED_FALLBACK_CATALOG: readonly ExtendedNarrativeTemplate[] = [
  // 1. FONDATION #1
  {
    id: 'evt_fond_meridiens',
    category: 'FONDATION',
    threadId: 'thread_atlas_meridiens',
    title: 'Charte du Grand Observatoire des Méridiens',
    narrative:
      'Les cartographes du domaine ont achevé le relevé trigonométrique des crêtes et des terrasses côtières. Afin de coordonner les calculs d’éphémérides et d’optimiser le faisceau des phares solaires, le Conseil propose d’ériger une rotonde astronomique souveraine.',
    choices: [
      {
        id: 'c_fond_meridiens_obs',
        label: 'Fonder l’Observatoire Impérial des Méridiens',
        summary: 'Établit une autorité scientifique centrale (+9 Savoir, +6 Axiomes) et attire un chroniqueur stellaire.',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Observatoire des Méridiens',
            description: 'Citadelle astronomique coordonnant la cartographie planétaire et les éphémérides.',
          },
          {
            type: 'SPAWN_NPC',
            name: 'Archonte Valerius',
            role: 'Chroniqueur Stellaire',
            bio: 'Maître cartographe ayant tracé les frontières du nouvel atlas.',
            mood: 'Solennel et visionnaire',
          },
        ],
        economicEffects: [
          { resource: 'knowledge', delta: 9, reason: 'Standardisation des tables astronomiques' },
          { resource: 'data', delta: 6, reason: 'Compilation des premiers Axiomes stellaires' },
        ],
        pendingEffects: [
          {
            id: 'lat_meridiens_convoy',
            dueInTurns: 2,
            hint: 'Les balises méridiennes attirent déjà une délégation scientifique en approche orbitale.',
            mutations: [
              {
                type: 'SPAWN_NPC',
                name: 'Savant Cassiodore',
                role: 'Chercheur en Exobiologie',
                bio: 'Attiré par la précision des phares méridiens.',
                mood: 'Méthodique',
              },
            ],
          },
        ],
        causalRefs: [],
      },
      {
        id: 'c_fond_meridiens_dome',
        label: 'Consacrer les matériaux au Conservatoire Botanique',
        summary: 'Érige un bio-dôme acclimatant les essences rares des sous-biomes (+7 Prospérité, +8 Biomasse).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_BIO_DOME,
            name: 'Conservatoire de l’Aube',
            description: 'Dôme géodésique abritant la flore endémique des hauts plateaux.',
          },
        ],
        economicEffects: [
          { resource: 'prosperity', delta: 7, reason: 'Acclimatation de semences à haut rendement' },
          { resource: 'biomass', delta: 8, reason: 'Récolte inaugurale du Conservatoire' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 2. FONDATION #2
  {
    id: 'evt_fond_cite_aurelia',
    category: 'FONDATION',
    threadId: 'thread_urbanisme_patricien',
    title: 'Édit d’Expansion des Domus d’Aurélia',
    narrative:
      'La croissance démographique du plateau appelle l’aménagement d’un nouveau quartier à péristyle relié au Forum central par une chaussée pavée. Les maîtres d’œuvre proposent d’associer des villas citoyennes à des terrasses agronomiques.',
    choices: [
      {
        id: 'c_fond_aurelia_habitat',
        label: 'Bâtir le Quartier Patricien d’Aurélia',
        summary: 'Renforce la cohésion civique (+8 Stabilité, +5 Influence) et accueille un nouveau pilote.',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_HABITAT,
            name: 'Domus Souveraine d’Aurélia',
            description: 'Complexe résidentiel de marbre clair entouré de colonnades.',
          },
          {
            type: 'SPAWN_NPC',
            name: 'Consul Marcus Aurel',
            role: 'Pilote de Navette',
            bio: 'Superviseur des liaisons inter-plateaux.',
            mood: 'Confiant',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 8, reason: 'Logement digne pour les familles patriciennes' },
          { resource: 'influence', delta: 5, reason: 'Rayonnement architectural du nouveau quartier' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_fond_aurelia_serre',
        label: 'Ériger les Jardins Suspendus d’Hélios',
        summary: 'Sécurise l’abondance vivrière (+9 Prospérité, +6 Énergie Hélios).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_GREENHOUSE,
            name: 'Jardins Suspendus d’Hélios',
            description: 'Nef vitrée irrigant des cultures hydroponiques étagées.',
          },
        ],
        economicEffects: [
          { resource: 'prosperity', delta: 9, reason: 'Surplus vivrier distribué au Forum' },
          { resource: 'energy', delta: 6, reason: 'Capteurs solaires intégrés aux verrières' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 3. FONDATION #3
  {
    id: 'evt_fond_phare_promethee',
    category: 'FONDATION',
    threadId: 'thread_reseau_helios',
    title: 'Inauguration du Réseau Électromagnétique d’Hélios',
    narrative:
      'Les ingénieurs de la Maison Orion ont identifié un nœud tellurique idéal pour ancrer une flèche-relais de haute puissance. Ce monument alimentera les ateliers d’alliages adamantins et les futures infrastructures de Palier IV.',
    choices: [
      {
        id: 'c_fond_promethee_relay',
        label: 'Ancrer le Phare Souverain de Prométhée',
        summary: 'Augmente massivement l’Énergie Hélios (+12 Énergie, +7 Alliages Adamantins).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_RELAY_TOWER,
            name: 'Phare Souverain de Prométhée',
            description: 'Flèche énergétique canalisant les courants telluriques et solaires.',
          },
          {
            type: 'SPAWN_NPC',
            name: 'Maître Nikolaos',
            role: 'Ingénieur Quantique',
            bio: 'Architecte de la grille énergétique du plateau.',
            mood: 'Inventif',
          },
        ],
        economicEffects: [
          { resource: 'energy', delta: 12, reason: 'Couplage tellurique du Phare de Prométhée' },
          { resource: 'alloy', delta: 7, reason: 'Raffinage haute température des basaltes' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_fond_promethee_parts',
        label: 'Convertir le flux en Atelier de Nanocomposants',
        summary: 'Produit des Nanocomposants de précision (+10 Nanocomposants, +5 Savoir).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Atelier des Nanocomposants Stellaires',
            description: 'Laboratoire d’assemblage moléculaire sous coupole.',
          },
        ],
        economicEffects: [
          { resource: 'parts', delta: 10, reason: 'Mise en service des bancs de gravure quantique' },
          { resource: 'knowledge', delta: 5, reason: 'Perfectionnement des procédés d’assemblage' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 4. EXPLORATION #1
  {
    id: 'evt_expl_geodes_profondes',
    category: 'EXPLORATION',
    threadId: 'thread_geodes_cristal',
    title: 'Reconnaissance des Cavernes Cristallines de la Couronne',
    narrative:
      'Au pied des falaises sédimentaires du plateau, une expédition de géologues a mis au jour une galerie tapissée de géodes luminescentes et de veines de basalte dense. L’exploitation méthodique du site enrichirait nos réserves stratégiques.',
    choices: [
      {
        id: 'c_expl_geodes_extract',
        label: 'Extraire les Cristaux et Alliages pour les Monuments',
        summary: 'Enrichit le Trésor (+10 Cristal, +8 Alliages Adamantins, +5 Prospérité).',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Sondeur Kaelen',
            role: 'Ingénieur Quantique',
            bio: 'Spécialiste des strates profondes et de la cristallographie.',
            mood: 'Déterminé',
          },
        ],
        economicEffects: [
          { resource: 'crystal', delta: 10, reason: 'Extraction de prismes optiques purs' },
          { resource: 'alloy', delta: 8, reason: 'Fonte des veines ferreuses profondes' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_expl_geodes_sanctuaire',
        label: 'Préserver la grotte comme laboratoire d’Axiomes',
        summary: 'Étudie la résonance acoustique des cristaux (+9 Axiomes, +7 Savoir).',
        mutations: [
          {
            type: 'AMBIENCE',
            skyTint: '#38bdf8',
            lightIntensity: 1.4,
            particleDensity: 1.1,
            weatherEffect: 'stardust_drift',
            stormIntensity: 0.35,
            eventNote: 'Poussière cristalline scintillant au-dessus des failles explorées.',
          },
        ],
        economicEffects: [
          { resource: 'data', delta: 9, reason: 'Modélisation des harmoniques cristallines' },
          { resource: 'knowledge', delta: 7, reason: 'Publication du mémoire minéralogique' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 5. EXPLORATION #2
  {
    id: 'evt_expl_couronne_aurore',
    category: 'EXPLORATION',
    threadId: 'thread_couronne_horizon',
    title: 'Expédition vers les Crêtes de la Couronne de l’Aurore',
    narrative:
      'Les vigies signalent des courants ascendants porteurs entre le rebord du plateau et l’anneau montagneux de l’horizon. Une mission de reconnaissance par navette permettrait de cartographier les gisements et de récupérer des sondes anciennes.',
    choices: [
      {
        id: 'c_expl_couronne_sondes',
        label: 'Récupérer les reliques technologiques orbitales',
        summary: 'Rapporte des Nanocomposants et des Axiomes (+9 Nanocomposants, +7 Axiomes).',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Capitaine Lyra Vane',
            role: 'Pilote de Navette',
            bio: 'Navigatrice ayant franchi les courants de la Couronne de l’Aurore.',
            mood: 'Audacieuse',
          },
        ],
        economicEffects: [
          { resource: 'parts', delta: 9, reason: 'Démontage des sondes orbitales anciennes' },
          { resource: 'data', delta: 7, reason: 'Décryptage des boîtes noires stellaires' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_expl_couronne_balise',
        label: 'Installer un relais météorologique sur la crête',
        summary: 'Stabilise les prévisions climatiques (+6 Stabilité, +8 Énergie Hélios).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_RELAY_TOWER,
            name: 'Vigie de la Couronne',
            description: 'Relais périphérique scrutant les bancs de nuages de l’horizon.',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 6, reason: 'Sécurisation des approches aériennes' },
          { resource: 'energy', delta: 8, reason: 'Captage des vents ioniques d’altitude' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 6. EXPLORATION #3
  {
    id: 'evt_expl_flore_lagune',
    category: 'EXPLORATION',
    threadId: 'thread_biosphere_marine',
    title: 'Recensement des Herbiers Bioluminescents du Littoral',
    narrative:
      'Le long des berges baignées par les ondes de la lagune, les botanistes ont découvert des colonies d’algues dorées capables de filtrer les métaux rares et d’enrichir les sols agricoles des terrasses.',
    choices: [
      {
        id: 'c_expl_lagune_serre',
        label: 'Acclimater les souches dans une Serre Littorale',
        summary: 'Développe la biomasse et la prospérité (+8 Prospérité, +10 Biomasse).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_GREENHOUSE,
            name: 'Serre Thalassique d’Émeraude',
            description: 'Complexe agronomique alimenté par les eaux filtrées de la lagune.',
          },
        ],
        economicEffects: [
          { resource: 'prosperity', delta: 8, reason: 'Engrais marins à très haut rendement' },
          { resource: 'biomass', delta: 10, reason: 'Multiplication rapide des souches côtières' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_expl_lagune_savoir',
        label: 'Séquencer le génome au Bio-Dôme Central',
        summary: 'Enrichit la bibliothèque génétique (+8 Savoir, +6 Axiomes).',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Dame Floria',
            role: 'Botaniste Stellaire',
            bio: 'Spécialiste des symbioses marines et de la flore littorale.',
            mood: 'Sereine',
          },
        ],
        economicEffects: [
          { resource: 'knowledge', delta: 8, reason: 'Découverte d’enzymes bioluminescentes' },
          { resource: 'data', delta: 6, reason: 'Archivage génomique au Codex' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 7. DIPLOMATIE #1
  {
    id: 'evt_dipl_ambassade_archipel',
    category: 'DIPLOMATIE',
    threadId: 'thread_pacte_archipel',
    title: 'Ambassade des Cités-Plateaux de l’Hémisphère Austral',
    narrative:
      'Un convoi diplomatique en provenance des plateaux australs s’est posé sur l’Esplanade de la Porte Impériale. Leurs plénipotentiaires proposent un traité d’échange scientifique et métallurgique scellé par l’érection d’un pavillon commun.',
    choices: [
      {
        id: 'c_dipl_archipel_traite',
        label: 'Ratifier le Pacte de Concorde et bâtir le Palais',
        summary: 'Accroît l’Influence (+10 Influence, +6 Alliages) et accueille une ambassadrice.',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_BIO_DOME,
            name: 'Palais de la Concorde Australe',
            description: 'Dôme diplomatique où siègent les délégations des plateaux alliés.',
          },
          {
            type: 'SPAWN_NPC',
            name: 'Ambassadrice Lyanna',
            role: 'Sentinelle de Bord',
            bio: 'Garante des traités inter-zones et de la paix orbitale.',
            mood: 'Digne et loyale',
          },
        ],
        economicEffects: [
          { resource: 'influence', delta: 10, reason: 'Signature du Pacte de Concorde Australe' },
          { resource: 'alloy', delta: 6, reason: 'Tribut d’alliages offert par la délégation' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_dipl_archipel_codex',
        label: 'Négocier un partage exclusif des Archives et Axiomes',
        summary: 'Privilégie le transfert technologique (+9 Savoir, +8 Axiomes).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Archives Confédérées d’Hélios',
            description: 'Rotonde abritant les traités et cartes des six zones planétaires.',
          },
        ],
        economicEffects: [
          { resource: 'knowledge', delta: 9, reason: 'Accès aux annales des plateaux australs' },
          { resource: 'data', delta: 8, reason: 'Synchronisation des registres d’Axiomes' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 8. DIPLOMATIE #2
  {
    id: 'evt_dipl_conclave_maisons',
    category: 'DIPLOMATIE',
    threadId: 'thread_conclave_dynastique',
    title: 'Le Grand Conclave des Cinq Maisons Nobles',
    narrative:
      'Les représentants des Maisons Valerius, Astraea, Silvanus, Orion et Celestis demandent audience au Forum. Chacune revendique la maîtrise d’œuvre du prochain programme monumental et propose d’engager ses propres réserves.',
    choices: [
      {
        id: 'c_dipl_maisons_union',
        label: 'Instituer le Conseil Paritaire des Maisons',
        summary: 'Consolide l’harmonie politique (+9 Stabilité, +7 Influence).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_HABITAT,
            name: 'Curie Sénatoriale des Maisons',
            description: 'Édifice civique à colonnade dorée réunissant les cinq bannières.',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 9, reason: 'Équilibre constitutionnel entre les Maisons' },
          { resource: 'influence', delta: 7, reason: 'Unité dynastique proclamée au Forum' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_dipl_maisons_industrie',
        label: 'Confier le mandat aux guildes d’Orion et d’Astraea',
        summary: 'Accélère la production technologique (+8 Énergie, +8 Nanocomposants, -3 Stabilité).',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Préfet Caelus Orion',
            role: 'Ingénieur Quantique',
            bio: 'Haut commissaire aux forges et relais énergétiques.',
            mood: 'Énergique',
          },
        ],
        economicEffects: [
          { resource: 'energy', delta: 8, reason: 'Priorité accordée aux relais d’Orion' },
          { resource: 'parts', delta: 8, reason: 'Commandes d’État en Nanocomposants' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 9. CRISE #1 (Subject to rhythm guard: never consecutive, max 2 in last 10 turns)
  {
    id: 'evt_crise_orage_ionique',
    category: 'CRISE',
    threadId: 'thread_anomalie_magnetique',
    title: 'Tempête Magnétique sur la Grille d’Hélios',
    narrative:
      'Une brusque éruption coronale fait vibrer la magnétosphère du plateau. Des arcs électriques parcourent les crêtes rocheuses et menacent de saturer les condensateurs si la charge n’est pas immédiatement dérivée ou dissipée.',
    choices: [
      {
        id: 'c_crise_orage_bouclier',
        label: 'Ériger un Paratonnerre Relais et canaliser la foudre',
        summary: 'Protège les cités et convertit la surtension (+11 Énergie Hélios, -4 Prospérité).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_RELAY_TOWER,
            name: 'Pylône Parafoudre Égide',
            description: 'Tour de dissipation magnétique protégeant les quartiers urbains.',
          },
          {
            type: 'AMBIENCE',
            skyTint: '#0284c7',
            lightIntensity: 1.55,
            particleDensity: 1.4,
            weatherEffect: 'electrical_storm',
            stormIntensity: 0.75,
            eventNote: 'Orage ionique canalisé vers le Pylône Égide.',
          },
        ],
        economicEffects: [
          { resource: 'energy', delta: 11, reason: 'Captage d’urgence de la décharge coronale' },
          { resource: 'prosperity', delta: -4, reason: 'Mobilisation d’urgence des équipes de garde' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_crise_orage_confinement',
        label: 'Mettre les dômes en veille protectrice et secourir les colons',
        summary: 'Préserve la Stabilité civique (+6 Stabilité, -5 Énergie Hélios).',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Centurion Cassian',
            role: 'Sentinelle de Bord',
            bio: 'Officier ayant coordonné la mise à l’abri des quartiers.',
            mood: 'Vigilant',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 6, reason: 'Protection exemplaire des citoyens' },
          { resource: 'energy', delta: -5, reason: 'Décharge volontaire des accumulateurs' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 10. CRISE #2
  {
    id: 'evt_crise_faille_tellurique',
    category: 'CRISE',
    threadId: 'thread_stabilite_socle',
    title: 'Frémissement Sédimentaire sous l’Esplanade Sud',
    narrative:
      'Les sismographes de l’Observatoire détectent un tassement dans les strates calcaires soutenant la bordure méridionale du plateau. Les ingénieurs recommandent d’injecter des piliers d’alliage adamantin pour consolider définitivement l’assise.',
    choices: [
      {
        id: 'c_crise_faille_consolider',
        label: 'Couler des contreforts en Alliages Adamantins',
        summary: 'Renforce durablement le socle (+8 Stabilité, -6 Alliages Adamantins).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_HABITAT,
            name: 'Bastion d’Assise Méridional',
            description: 'Ouvrage d’ancrage architectural stabilisant la terrasse sud.',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 8, reason: 'Consolidation pérenne des strates du plateau' },
          { resource: 'alloy', delta: -6, reason: 'Injection de poutrelles adamantines' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_crise_faille_etude',
        label: 'Sonder la faille pour capter la chaleur géothermique',
        summary: 'Transforme le risque en source d’énergie (+9 Énergie, +6 Savoir, -3 Stabilité).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_RELAY_TOWER,
            name: 'Puits Géothermique d’Obsidienne',
            description: 'Capteur thermique profond ancré sur la ligne de faille.',
          },
        ],
        economicEffects: [
          { resource: 'energy', delta: 9, reason: 'Exploitation du gradient géothermique profond' },
          { resource: 'stability', delta: -3, reason: 'Inquiétude passagère des riverains' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 11. CEREMONIE #1
  {
    id: 'evt_cerem_jubile_solaire',
    category: 'CEREMONIE',
    threadId: 'thread_fastes_solaires',
    title: 'Grand Jubilé de la Couronne de l’Aurore',
    narrative:
      'Lorsque l’astre franchit le zénith du plateau, ses rayons embrasent d’or blanc le voile de nuages de la Couronne. Le peuple et les Maisons Nobles se rassemblent sur la mosaïque du Forum pour célébrer la prospérité du domaine.',
    choices: [
      {
        id: 'c_cerem_jubile_fete',
        label: 'Proclamer les Jeux Solaires et illuminer le ciel',
        summary: 'Exalte la concorde (+9 Stabilité, +8 Influence) sous un rideau d’aurore boréale.',
        mutations: [
          {
            type: 'AMBIENCE',
            skyTint: '#fbbf24',
            lightIntensity: 1.5,
            particleDensity: 1.25,
            weatherEffect: 'aurora_curtain',
            stormIntensity: 0.5,
            eventNote: 'Rideau d’aurore dorée saluant le Grand Jubilé Solaire.',
          },
        ],
        economicEffects: [
          { resource: 'stability', delta: 9, reason: 'Ferveur civique lors des Jeux Solaires' },
          { resource: 'influence', delta: 8, reason: 'Prestige des célébrations impériales' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_cerem_jubile_mecenat',
        label: 'Décerner les Lauriers de la Science aux Érudits',
        summary: 'Stimule l’innovation (+8 Savoir, +7 Axiomes) et attire un savant.',
        mutations: [
          {
            type: 'SPAWN_NPC',
            name: 'Maître Solon Astraea',
            role: 'Chroniqueur Stellaire',
            bio: 'Lauréat du Grand Prix d’Astronomie du Jubilé.',
            mood: 'Honoré et inspiré',
          },
        ],
        economicEffects: [
          { resource: 'knowledge', delta: 8, reason: 'Concours académique du Jubilé' },
          { resource: 'data', delta: 7, reason: 'Dépôt de nouveaux traités au Codex' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },

  // 12. CEREMONIE #2
  {
    id: 'evt_cerem_investiture_patricienne',
    category: 'CEREMONIE',
    threadId: 'thread_investiture_empire',
    title: 'Investiture des Bâtisseurs du Bio-Dôme',
    narrative:
      'Les guildes d’architectes et d’agronomes présentent au Souverain les plans de la nouvelle ère monumentale. Une cérémonie solennelle au pied des colonnes de marbre de Carrare scelle l’alliance entre la science et l’art.',
    choices: [
      {
        id: 'c_cerem_invest_monument',
        label: 'Élever la Grande Rotonde des Arts et des Sciences',
        summary: 'Érige un monument civique (+7 Influence, +7 Savoir, +6 Marbre).',
        mutations: [
          {
            type: 'BUILD',
            buildingType: bld_TYPE_OBSERVATION,
            name: 'Rotonde des Arts et des Sciences',
            description: 'Sanctuaire architectural célébrant le génie des bâtisseurs.',
          },
        ],
        economicEffects: [
          { resource: 'influence', delta: 7, reason: 'Chef-d’œuvre néo-classique inauguré' },
          { resource: 'knowledge', delta: 7, reason: 'Chaires permanentes d’architecture' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
      {
        id: 'c_cerem_invest_dotation',
        label: 'Distribuer les dividendes d’abondance aux citoyens',
        summary: 'Renforce la Prospérité et la Stabilité (+8 Prospérité, +7 Stabilité).',
        mutations: [
          {
            type: 'AMBIENCE',
            skyTint: '#38bdf8',
            lightIntensity: 1.38,
            particleDensity: 0.9,
            weatherEffect: 'calm',
            stormIntensity: 0.1,
            eventNote: 'Zénith radieux et paisible sur l’ensemble des quartiers.',
          },
        ],
        economicEffects: [
          { resource: 'prosperity', delta: 8, reason: 'Distribution des surplus aux guildes' },
          { resource: 'stability', delta: 7, reason: 'Reconnaissance envers les artisans' },
        ],
        pendingEffects: [],
        causalRefs: [],
      },
    ],
  },
];

function bindDynamicCausalRefs(
  template: ExtendedNarrativeTemplate,
  context: FallbackContext
): NarrativeEventV2 {
  const brief = context.worldBrief;
  const firstBld = brief?.buildings[0];
  const firstNpc = brief?.npcs[0];

  const causalRefs: string[] = [];
  if (firstBld) causalRefs.push(firstBld.id);
  if (firstNpc) causalRefs.push(firstNpc.id);

  const actorMention =
    firstBld && firstNpc
      ? `Autour de « ${firstBld.name} », ${firstNpc.name} (${firstNpc.role}) rapporte au Conseil : `
      : firstBld
      ? `Depuis « ${firstBld.name} », les rapporteurs annoncent : `
      : '';

  const narrative = `${actorMention}${template.narrative}`;

  return {
    id: `${template.id}_t${context.turnNumber}`,
    category: template.category,
    threadId: template.threadId,
    title: `${template.title} (An ${1200 + context.turnNumber * 12})`,
    narrative,
    choices: template.choices.map((c) => ({
      ...c,
      causalRefs: causalRefs.slice(0, 3),
    })),
  };
}

/**
 * Generates a deterministic 2-event turn batch from the 12-template catalog,
 * strictly enforcing rhythm invariants (never two consecutive CRISE, max 2 in last 10 turns).
 */
export function generateFallbackEventBatch(context: FallbackContext): TurnBatch {
  const prng = createPRNG(`${context.seed}_turn_${context.turnNumber}`);
  const brief = context.worldBrief;

  const lastCat = brief?.rhythm.lastCategory ?? 'FONDATION';
  const crisisCount = brief?.rhythm.crisisCountLastTen ?? 0;
  const recentTitles = new Set(brief?.rhythm.recentTitles ?? context.recentChronicleTitles ?? []);
  const allowCrisis = lastCat !== 'CRISE' && crisisCount < 2;

  const eligiblePool = EXTENDED_FALLBACK_CATALOG.filter((tmpl) => {
    if (!allowCrisis && tmpl.category === 'CRISE') return false;
    const candidateTitle = `${tmpl.title} (An ${1200 + context.turnNumber * 12})`;
    if (recentTitles.has(candidateTitle) || recentTitles.has(tmpl.title)) return false;
    return true;
  });

  const pool = eligiblePool.length >= 2 ? eligiblePool : EXTENDED_FALLBACK_CATALOG.filter((t) => t.category !== 'CRISE');
  const firstIdx = Math.floor(prng() * pool.length);
  const firstTemplate = pool[firstIdx];

  // Pick a second distinct event (never a second CRISE in the same batch)
  const secondPool = pool.filter(
    (t, idx) =>
      idx !== firstIdx &&
      t.id !== firstTemplate.id &&
      (firstTemplate.category !== 'CRISE' || t.category !== 'CRISE')
  );
  const secondTemplate =
    secondPool.length > 0
      ? secondPool[Math.floor(prng() * secondPool.length)]
      : EXTENDED_FALLBACK_CATALOG[0];

  const ev1 = bindDynamicCausalRefs(firstTemplate, context);
  const ev2 = bindDynamicCausalRefs(secondTemplate, context);

  return {
    title: ev1.title,
    narrative: ev1.narrative,
    choices: ev1.choices,
    category: ev1.category,
    threadId: ev1.threadId,
    sectorCode: `CHRONIQUE • ${context.sectorName.toUpperCase()}`,
    events: [ev1, ev2],
    chronicleNote: `Lot impérial T${context.turnNumber} (${ev1.category} & ${ev2.category})`,
  };
}
