/**
 * GALAXIA ULTRA • Zod Boundary Contracts
 * Strict schemas for API payloads, LLM responses, world presets, game configuration, and save slots.
 */

import { z } from 'zod';
import { bld_TYPES, wtr_TYPES } from '../config/constants';

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
   Turn & Narrative Schemas
   ========================================================================== */

export const turnChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(3).max(80),
  summary: z.string().min(10).max(180),
  mutations: z.array(mutationSchema).min(1).max(3),
});

export type TurnChoice = z.infer<typeof turnChoiceSchema>;

export const turnBatchSchema = z.object({
  title: z.string().min(3).max(90),
  narrative: z.string().min(40).max(800),
  choices: z.array(turnChoiceSchema).min(2).max(4),
  sectorCode: z.string().min(2).max(30).default('GALAXIA-OMEGA-4'),
});

export type TurnBatch = z.infer<typeof turnBatchSchema>;

/* ==========================================================================
   Entities in Scene
   ========================================================================== */

export const placedBuildingSchema = z.object({
  id: z.string(),
  buildingType: z.enum(bld_TYPES),
  name: z.string(),
  description: z.string(),
  x: z.number(),
  z: z.number(),
  rotation: z.number(),
  scale: z.number(),
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
  spawnedAt: z.number(),
});

export type PlacedNpc = z.infer<typeof placedNpcSchema>;

export const chronicleEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  turnNumber: z.number(),
  title: z.string(),
  narrative: z.string(),
  chosenChoiceLabel: z.string(),
  mutationsSummary: z.array(z.string()),
});

export type ChronicleEntry = z.infer<typeof chronicleEntrySchema>;

/* ==========================================================================
   World Preset Schema (Luminous Biome Palettes)
   ========================================================================== */

export const worldPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
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
  starfieldIntensity: z.number(),
  reliefMultiplier: z.number(),
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
});

export type SaveSlot = z.infer<typeof saveSlotSchema>;
