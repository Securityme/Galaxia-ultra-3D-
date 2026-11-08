/**
 * GALAXIA ULTRA • Bio-Dôme de Poche // Zod Boundary Contracts v2 (D1-GU-PT v1.0.0 & v2.0.0)
 * Strict schemas for:
 * - PT-51: Hierarchical World Brief Payload (`worldBriefSchema`)
 * - PT-52 & PT-61: Event Categories, Economic Effects (`rsc_` Imperial, Material & Tech), Latent Effects (`pendingEffectSchema`), Causal Refs & Turn Batch v2 (`turnBatchSchemaV2`)
 * - PT-56: Entity Provenance (`entityProvenanceSchema`) & Narrative Threads (`threadId`)
 * - PT-57: Deterministic Turn Ledger Records (`turnLedgerRecordSchema`)
 */

import { z } from 'zod';
import {
  bld_TYPES,
  rsc_ALL_TYPES,
  rsc_IMPERIAL_TYPES,
  wtr_TYPES,
} from '../config/constants';

/* ==========================================================================
   Mutations: Typed Actions that Alter the World
   ========================================================================== */

export const buildMutationSchema = z.object({
  type: z.literal('BUILD'),
  buildingType: z.enum(bld_TYPES),
  name: z.string().min(2).max(60),
  description: z.string().min(5).max(200),
  x: z.number().optional(),
  z: z.number().optional(),
});

export const spawnNpcMutationSchema = z.object({
  type: z.literal('SPAWN_NPC'),
  name: z.string().min(2).max(40),
  role: z.string().min(2).max(50),
  bio: z.string().min(5).max(200),
  mood: z.string().optional().default('Serein et concentré'),
  x: z.number().optional(),
  z: z.number().optional(),
});

export const ambienceMutationSchema = z.object({
  type: z.literal('AMBIENCE'),
  skyTint: z.string().optional(),
  lightIntensity: z.number().min(0.2).max(3.0).optional(),
  particleDensity: z.number().min(0.2).max(2.5).optional(),
  weatherEffect: z.enum(wtr_TYPES).optional(),
  stormIntensity: z.number().min(0).max(1.0).optional(),
  eventNote: z.string().min(3).max(180),
});

export const mutationSchema = z.discriminatedUnion('type', [
  buildMutationSchema,
  spawnNpcMutationSchema,
  ambienceMutationSchema,
]);

export type Mutation = z.infer<typeof mutationSchema>;
export type BuildMutation = z.infer<typeof buildMutationSchema>;
export type SpawnNpcMutation = z.infer<typeof spawnNpcMutationSchema>;
export type AmbienceMutation = z.infer<typeof ambienceMutationSchema>;

/* ==========================================================================
   PT-52 & PT-61: Categories, Economic Effects (rsc_), Latent Effects & Causal Refs
   ========================================================================== */

export const EVENT_CATEGORIES = [
  'FONDATION',
  'EXPLORATION',
  'DIPLOMATIE',
  'CRISE',
  'CEREMONIE',
] as const;

export const eventCategorySchema = z.enum(EVENT_CATEGORIES);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const economicEffectSchema = z.object({
  resource: z.enum(rsc_ALL_TYPES),
  delta: z.number().min(-25).max(25),
  reason: z.string().min(3).max(120),
});

export type EconomicEffect = z.infer<typeof economicEffectSchema>;

export const pendingEffectSchema = z.object({
  id: z.string().min(1).max(40),
  dueInTurns: z.number().int().min(1).max(3),
  hint: z.string().min(5).max(160), // Diegetic hint shown to the Sovereign
  mutations: z.array(mutationSchema).min(1).max(2),
});

export type PendingEffect = z.infer<typeof pendingEffectSchema>;

export const turnChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(3).max(80),
  summary: z.string().min(10).max(180),
  mutations: z.array(mutationSchema).min(1).max(3),
  economicEffects: z.array(economicEffectSchema).max(2).optional().default([]),
  pendingEffects: z.array(pendingEffectSchema).max(1).optional().default([]),
  causalRefs: z.array(z.string()).max(3).optional().default([]),
});

export const turnChoiceSchemaV2 = turnChoiceSchema;
export type TurnChoice = z.infer<typeof turnChoiceSchema>;

export const eventSchema = z.object({
  id: z.string().min(3).max(40),
  category: eventCategorySchema,
  threadId: z.string().min(2).max(40).optional(),
  title: z.string().min(3).max(90),
  narrative: z.string().min(40).max(620),
  choices: z.array(turnChoiceSchemaV2).min(2).max(3),
});

export type NarrativeEventV2 = z.infer<typeof eventSchema>;

export const turnBatchSchemaV2 = z.object({
  events: z.array(eventSchema).min(1).max(2),
  chronicleNote: z.string().max(200).optional(),
  sectorCode: z.string().min(2).max(40).optional().default('GALAXIA-OMEGA-77'),
});

export type TurnBatchV2 = z.infer<typeof turnBatchSchemaV2>;

// Unified TurnBatch supporting both 1..2 events (V2) and direct access to primary event fields
export const turnBatchSchema = z.object({
  title: z.string().min(3).max(90),
  narrative: z.string().min(40).max(800),
  choices: z.array(turnChoiceSchema).min(2).max(4),
  sectorCode: z.string().min(2).max(40).default('GALAXIA-OMEGA-77'),
  category: eventCategorySchema.optional().default('FONDATION'),
  threadId: z.string().optional(),
  events: z.array(eventSchema).min(1).max(2).optional(),
  chronicleNote: z.string().max(200).optional(),
});

export type TurnBatch = z.infer<typeof turnBatchSchema>;

/* ==========================================================================
   PT-51: Hierarchical World Brief Schema (Client -> Server /api/ai/turn)
   ========================================================================== */

export const worldBriefSchema = z.object({
  turnNumber: z.number().int().min(1),
  seed: z.string().min(2).max(60),
  empireName: z.string().max(60).optional().default('Aethelgard Prime'),
  epoch: z.object({
    name: z.string().max(60),
    imperialYear: z.number().int(),
  }),
  activeZone: z.object({
    id: z.string(),
    name: z.string().max(60),
    biome: z.string().max(60),
    subBiomes: z.array(z.string().max(60)).max(4),
  }),
  resources: z
    .array(
      z.object({
        resource: z.enum(rsc_ALL_TYPES),
        value: z.number(),
        netRate: z.number(),
      })
    )
    .max(12),
  buildings: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(60),
        buildingType: z.enum(bld_TYPES),
        tier: z.number().int().min(1).max(4),
        assignedColonists: z.number().int().min(0),
        provenance: z.string().max(120).optional(),
      })
    )
    .max(24),
  npcs: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(40),
        role: z.string().max(50),
        provenance: z.string().max(120),
      })
    )
    .max(24),
  chronicleWindow: z
    .array(
      z.object({
        turn: z.number().int(),
        title: z.string().max(90),
        chosenLabel: z.string().max(80),
        category: eventCategorySchema,
      })
    )
    .max(5),
  pendingHints: z
    .array(
      z.object({
        hint: z.string().max(160),
        dueInTurns: z.number().int().min(1).max(3),
      })
    )
    .max(3),
  activeThreads: z.array(z.string().max(40)).max(4).optional().default([]),
  semanticMemories: z
    .array(
      z.object({
        turn: z.number().int(),
        title: z.string().max(90),
        chosenLabel: z.string().max(80),
        similarityScore: z.number(),
        excerpt: z.string().max(160),
      })
    )
    .max(3)
    .optional()
    .default([]),
  rhythm: z.object({
    lastCategory: eventCategorySchema,
    crisisCountLastTen: z.number().int().min(0).max(10),
    recentTitles: z.array(z.string().max(90)).max(3),
  }),
});

export type WorldBrief = z.infer<typeof worldBriefSchema>;

/* ==========================================================================
   Entities in Scene & Provenance (PT-56)
   ========================================================================== */

export const entityProvenanceSchema = z.object({
  originTurn: z.number().int().min(0),
  originEventId: z.string(),
  originEventTitle: z.string(),
  threadId: z.string().optional(),
});

export type EntityProvenance = z.infer<typeof entityProvenanceSchema>;

export const placedBuildingSchema = z.object({
  id: z.string(),
  buildingType: z.enum(bld_TYPES),
  name: z.string(),
  description: z.string(),
  x: z.number(),
  z: z.number(),
  rotation: z.number(),
  scale: z.number(),
  tier: z.number().int().min(1).max(4).optional(),
  materialPreset: z
    .enum([
      'carrara_gold',
      'obsidian_bronze',
      'porphyry_imperial',
      'celestial_azure',
      'emerald_travertine',
    ])
    .optional(),
  provenance: entityProvenanceSchema.optional(),
  assembledAt: z.number(),
});

export type PlacedBuilding = z.infer<typeof placedBuildingSchema>;

export const placedNpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  bio: z.string(),
  mood: z.string(),
  x: z.number(),
  z: z.number(),
  targetX: z.number(),
  targetZ: z.number(),
  colorHex: z.string(),
  provenance: entityProvenanceSchema.optional(),
  spawnedAt: z.number(),
});

export type PlacedNpc = z.infer<typeof placedNpcSchema>;

export const chronicleEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  turnNumber: z.number(),
  category: eventCategorySchema.optional(),
  threadId: z.string().optional(),
  title: z.string(),
  narrative: z.string(),
  chosenChoiceLabel: z.string(),
  mutationsSummary: z.array(z.string()),
  economicDeltasSummary: z.array(z.string()).optional(),
  causalRefs: z.array(z.string()).optional(),
  embeddingVector: z.array(z.number()).optional(),
});

export type ChronicleEntry = z.infer<typeof chronicleEntrySchema>;

/* ==========================================================================
   PT-57: Active Latent Effects & Deterministic Turn Ledger Record
   ========================================================================== */

export const scheduledPendingEffectSchema = z.object({
  id: z.string(),
  originTurn: z.number().int(),
  dueTurn: z.number().int(),
  dueTick: z.number().int(),
  originEventTitle: z.string(),
  hint: z.string(),
  mutations: z.array(mutationSchema),
});

export type ScheduledPendingEffect = z.infer<typeof scheduledPendingEffectSchema>;

export const turnLedgerRecordSchema = z.object({
  turnNumber: z.number().int(),
  tickIndex: z.number().int(),
  seed: z.string(),
  events: z.array(eventSchema),
  chosenChoiceIds: z.array(z.string()),
  resultingImperialResources: z.record(z.enum(rsc_IMPERIAL_TYPES), z.number()),
  stateFingerprint: z.string(),
  embeddingVector: z.array(z.number()).optional(),
});

export type TurnLedgerRecord = z.infer<typeof turnLedgerRecordSchema>;

/* ==========================================================================
   World Preset Schema (Realistic Natural Biome Palettes & Internal Sub-Biomes)
   ========================================================================== */

export const subBiomeSchema = z.object({
  id: z.string(),
  name: z.string(),
  climateTag: z.string(),
  colorHex: z.string(),
  description: z.string(),
});

export type SubBiomeDefinition = z.infer<typeof subBiomeSchema>;

export const worldPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
  climateEffectLabel: z.string(),
  climateEffectType: z.enum([
    'very_sunny',
    'snow_ice',
    'volcanic_magma',
    'desert_sun',
    'alpine_mist',
  ]),
  groundLowColor: z.string(),
  groundBaseColor: z.string(),
  groundAccentColor: z.string(),
  groundPeakColor: z.string(),
  oceanDeepColor: z.string(),
  oceanShallowColor: z.string(),
  edgeColor: z.string(),
  waterOrEnergyColor: z.string(),
  atmosphereColor: z.string(),
  fogColor: z.string(),
  sunLightIntensity: z.number(),
  starfieldIntensity: z.number(),
  reliefMultiplier: z.number(),
  subBiomes: z.array(subBiomeSchema),
  description: z.string(),
});

export type WorldPreset = z.infer<typeof worldPresetSchema>;

/* ==========================================================================
   Game Configuration & Multi-Slot Save Schemas
   ========================================================================== */

export const gameConfigSchema = z.object({
  worldName: z.string().min(2).max(45),
  seed: z.string().min(2).max(40),
  presetId: z.string(),
  reliefScale: z.number().min(0.4).max(3.2),
  initialCrewCount: z.number().int().min(1).max(8),
  autoCycleTime: z.boolean(),
  weatherDynamic: z.boolean(),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export const saveSlotSchema = z.object({
  slotId: z.string(),
  label: z.string(),
  savedAt: z.number(),
  config: gameConfigSchema,
  turnNumber: z.number(),
  celestialTime: z.number(),
  buildings: z.array(placedBuildingSchema),
  npcs: z.array(placedNpcSchema),
  chronicles: z.array(chronicleEntrySchema),
  ledger: z.array(turnLedgerRecordSchema).optional(),
  pendingEffects: z.array(scheduledPendingEffectSchema).optional(),
  resourceStocks: z.record(z.string(), z.number()).optional(),
});

export type SaveSlot = z.infer<typeof saveSlotSchema>;
