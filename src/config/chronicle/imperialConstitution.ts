/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // PT-54: Constitution du Prompt Système Versionnée
 * Définit l'identité canonique du Grand Chroniqueur Impérial, les registres lexicaux par biome,
 * les règles de rythme (quota de crise <= 20%, jamais deux crises consécutives), la causalité
 * et l'économie motivée (ressources impériales, matières et technologies rsc_).
 */

import {
  bld_TYPES,
  rsc_ALL_TYPES,
  rsc_IMPERIAL_TYPES,
  rsc_MATERIAL_TYPES,
  rsc_TECH_TYPES,
  wtr_TYPES,
} from '../constants';
import { WorldBrief } from '../../contracts/schemas';

export const CHRONICLE_CONSTITUTION_VERSION = 'D1-GU-PT-v2.0.0' as const;

export const BIOME_NARRATIVE_REGISTERS: Record<
  string,
  {
    lexicon: string;
    typicalHazards: string;
    architecturalMotif: string;
  }
> = {
  terra_blue: {
    lexicon: 'lagunes d’azur, terrasses de cyprès, promontoires de marbre clair, brises thalassiques',
    typicalHazards: 'marées d’équinoxe, orages magnétiques côtiers, rivalités portuaires',
    architecturalMotif: 'rotondes corinthiennes et péristyles ouverts sur l’archipel',
  },
  cryo_glacier: {
    lexicon: 'banquises boréales, aiguilles de givre, sanctuaires géothermiques, aurores polaires',
    typicalHazards: 'blizzards ioniques, fissuration des dômes de cristal, gel des conduites',
    architecturalMotif: 'coupoles pressurisées à nervures de bronze chauffé',
  },
  pyro_volcano: {
    lexicon: 'failles basaltiques, rivières de magma, forges d’obsidienne, fumeroles d’ambre',
    typicalHazards: 'séismes telluriques, pluies de cendres ardentes, surtensions géothermiques',
    architecturalMotif: 'citadelles d’obsidienne et pylônes capteurs de flux tellurique',
  },
  dune_oasis: {
    lexicon: 'ergs dorés, chotts cristallins, aqueducs souterrains, vents stellaires',
    typicalHazards: 'tempêtes de silice, tarissement des nappes, mirages électromagnétiques',
    architecturalMotif: 'jardins suspendus d’argile ocre et tours à vent héliocentriques',
  },
  emerald_highlands: {
    lexicon: 'hauts plateaux brumeux, forêts de cèdres anciens, cascades d’altitude, pics alpins',
    typicalHazards: 'brouillards d’éther, glissements de strates, isolement des observatoires',
    architecturalMotif: 'monastères astronomiques en travertin vert et ponts de pierre',
  },
};

export function buildSystemConstitutionPrompt(): string {
  return `Tu es le Grand Chroniqueur Impérial de « GALAXIA ULTRA • Bio-Dôme de Poche » (version ${CHRONICLE_CONSTITUTION_VERSION}), jeu de gouvernance d'un monde miniature en archipel de plateaux planétaires.

IDENTITÉ ET TON — Solennel, précis, jamais familier. Titres à la manière des chartes et traités impériaux. Français soigné. Aucune balise markdown, aucun commentaire : uniquement du JSON strict conforme au schéma imposé.

LE MONDE — Tu ne racontes que ce que le Brief autorise. Aucune invention d'entité non listée : tu cites les bâtiments et les citoyens par leur nom exact et leur identifiant dans causalRefs. Chaque événement s'inscrit dans l'époque et le biome actifs.

CATALOGUES VERROUILLÉS —
- Catégories d'événements : FONDATION, EXPLORATION, DIPLOMATIE, CRISE, CEREMONIE
- Édifices (BUILD.buildingType) : ${bld_TYPES.join(', ')}
- Météores (AMBIENCE.weatherEffect) : ${wtr_TYPES.join(', ')}
- Ressources Impériales : ${rsc_IMPERIAL_TYPES.join(', ')}
- Matières Premières : ${rsc_MATERIAL_TYPES.join(', ')}
- Ressources Technologiques (rsc_) : ${rsc_TECH_TYPES.join(', ')} (energy = Énergie Hélios, alloy = Alliages Adamantins, data = Axiomes, parts = Nanocomposants)
- Toutes les ressources autorisées dans economicEffects.resource : ${rsc_ALL_TYPES.join(', ')} (deltas compris entre -25 et +25).

RYTHME — Un lot (events) contient 1 à 2 événements. La catégorie CRISE ne peut apparaître que si rhythm.crisisCountLastTen < 2 et si la catégorie du tour précédent (rhythm.lastCategory) n'était pas CRISE. Ne jamais reprendre un titre proche des trois précédents (rhythm.recentTitles). 60 à 120 mots par narration.

CAUSALITÉ — Continue les fils narratifs (threadId) : si un citoyen ou un édifice du Brief peut légitimement être l'acteur de l'événement, fais-le figurer et ajoute son id dans causalRefs. Un choix peut porter un effet latent (pendingEffects, max 1 par choix) à échéance 1 à 3 tours (dueInTurns), dont seul le hint diégétique est annoncé au joueur.

ÉCONOMIE — Les effets économiques (economicEffects) sont motivés : chaque delta porte sa raison d'état (reason). Stabilité et Savoir ne s'effondrent jamais sans narration.`;
}

export function formatWorldBriefForPrompt(brief: WorldBrief): string {
  const biomeKey = Object.keys(BIOME_NARRATIVE_REGISTERS).find((k) =>
    brief.activeZone.biome.toLowerCase().includes(k.split('_')[0])
  );
  const register =
    BIOME_NARRATIVE_REGISTERS[biomeKey ?? 'terra_blue'] ??
    BIOME_NARRATIVE_REGISTERS.terra_blue;

  const buildingsLines =
    brief.buildings.length > 0
      ? brief.buildings
          .map(
            (b) =>
              `  * [${b.id}] "${b.name}" (${b.buildingType}, Palier ${b.tier}, ${b.assignedColonists} colons${
                b.provenance ? `, ${b.provenance}` : ''
              })`
          )
          .join('\n')
      : '  * Aucun édifice nommé';

  const npcsLines =
    brief.npcs.length > 0
      ? brief.npcs
          .map((n) => `  * [${n.id}] "${n.name}" (${n.role} — ${n.provenance})`)
          .join('\n')
      : '  * Aucun citoyen nommé';

  const resourcesLines = brief.resources
    .map(
      (r) =>
        `  * ${r.resource}: valeur=${r.value}, tauxNet=${
          r.netRate >= 0 ? `+${r.netRate}` : r.netRate
        }/tour`
    )
    .join('\n');

  const chronicleLines =
    brief.chronicleWindow.length > 0
      ? brief.chronicleWindow
          .map(
            (c) =>
              `  * T${c.turn} [${c.category}] "${c.title}" -> Choix: "${c.chosenLabel}"`
          )
          .join('\n')
      : '  * Fondation initiale du domaine';

  const pendingLines =
    brief.pendingHints.length > 0
      ? brief.pendingHints
          .map((p) => `  * (Échéance ${p.dueInTurns}t) "${p.hint}"`)
          .join('\n')
      : '  * Aucun effet latent en attente';

  const semanticLines =
    brief.semanticMemories && brief.semanticMemories.length > 0
      ? brief.semanticMemories
          .map(
            (m) =>
              `  * [Résonance cos=${m.similarityScore.toFixed(2)} • Tour ${m.turn}] "${m.title}" (Décret: "${m.chosenLabel}") — ${m.excerpt}`
          )
          .join('\n')
      : '  * Aucune résonance sémantique profonde antérieure';

  const crisisAllowed =
    brief.rhythm.lastCategory !== 'CRISE' && brief.rhythm.crisisCountLastTen < 2;

  return `WORLD BRIEF HIÉRARCHIQUE (Tour ${brief.turnNumber} • Graine ${brief.seed}) :
- Empire : ${brief.empireName} | Époque : ${brief.epoch.name} (An Impérial ${brief.epoch.imperialYear})
- Zone active : [${brief.activeZone.id}] ${brief.activeZone.name} — Biome : ${brief.activeZone.biome}
- Sous-biomes : ${brief.activeZone.subBiomes.join(', ')}
- Registre lexical du biome : ${register.lexicon} | Aléas : ${register.typicalHazards}
- État des Ressources :
${resourcesLines}
- Édifices présents (${brief.buildings.length}) :
${buildingsLines}
- Citoyens présents (${brief.npcs.length}) :
${npcsLines}
- Fenêtre de Mémoire Causale Récente (5 derniers tours) :
${chronicleLines}
- Mémoire Sémantique Profonde (PT-78 • Top-3 Souvenirs par Similarité Cosinus) :
${semanticLines}
- Indices Latents Actifs :
${pendingLines}
- Contraintes de Rythme :
  * Dernière catégorie : ${brief.rhythm.lastCategory}
  * Crises sur les 10 derniers tours : ${brief.rhythm.crisisCountLastTen}/2
  * Catégorie CRISE autorisée ce tour : ${crisisAllowed ? 'OUI (max 1)' : 'INTERDITE CE TOUR'}
  * Titres récents interdits de répétition : ${brief.rhythm.recentTitles.join(' | ') || 'Aucun'}

Génère un objet JSON conforme à turnBatchSchemaV2 contenant 2 événements (events) complémentaires pour ce tour, chacun muni de 2 à 3 choix (choices) avec mutations, economicEffects, pendingEffects éventuel et causalRefs citant les identifiants exacts ci-dessus.`;
}

export const IMPERIAL_CONSTITUTION_VERSION = CHRONICLE_CONSTITUTION_VERSION;
