/**
 * GALAXIA ULTRA • World & Sector Presets
 * Luminous, high-contrast palettes ensuring vibrant ground and planetary biome rendering.
 */

import { WorldPreset } from '../contracts/schemas';

export const WORLD_PRESETS: readonly WorldPreset[] = [
  {
    id: 'terra_blue',
    name: 'Terre Bleue',
    subtitle: 'Secteur Oasis Émeraude',
    groundLowColor: '#d4b483',    // Warm golden coastal sand
    groundBaseColor: '#349e6b',   // Lush vibrant meadow emerald
    groundAccentColor: '#68c987', // Bright sunlit highland moss
    groundPeakColor: '#f1f5f9',   // Crisp snow & quartz peaks
    oceanDeepColor: '#0369a1',    // Rich azure ocean
    oceanShallowColor: '#38bdf8', // Luminous turquoise lagoon
    edgeColor: '#38bdf8',
    waterOrEnergyColor: '#0ea5e9',
    atmosphereColor: '#60a5fa',
    fogColor: '#0b192c',
    starfieldIntensity: 1.0,
    reliefMultiplier: 1.35,
    description:
      'Continents verdoyants bordés de lagons turquoise, plaines fertiles lumineuses et sommets de quartz blanc sous une atmosphère azur.',
  },
  {
    id: 'volcanic_core',
    name: 'Monde Volcanique',
    subtitle: 'Secteur Forge d’Ambre',
    groundLowColor: '#ea580c',    // Glowing magma shoreline
    groundBaseColor: '#7c4d3a',   // Warm terracotta & ochre basalt
    groundAccentColor: '#c26d45', // Sun-baked canyon sandstone
    groundPeakColor: '#fcd34d',   // Incandescent sulfur & amber ridge
    oceanDeepColor: '#9a3412',    // Molten caldera sea
    oceanShallowColor: '#f97316', // Bright liquid lava rivers
    edgeColor: '#f97316',
    waterOrEnergyColor: '#fb923c',
    atmosphereColor: '#f97316',
    fogColor: '#1f110c',
    starfieldIntensity: 0.95,
    reliefMultiplier: 1.65,
    description:
      'Plateaux d’ocre rouge et de grès cuivré sillonnés de rivières de magma luminescentes et de crêtes soufrées dorées.',
  },
  {
    id: 'glacial_aurora',
    name: 'Glaciaire Cosmique',
    subtitle: 'Secteur Cryo-Cristallin',
    groundLowColor: '#7dd3fc',    // Translucent glacier ice shelf
    groundBaseColor: '#93c5fd',   // Luminous permafrost blue
    groundAccentColor: '#dbeafe', // Crisp powder snowfields
    groundPeakColor: '#ffffff',   // Pure diamond-white summits
    oceanDeepColor: '#0284c7',    // Arctic sapphire sea
    oceanShallowColor: '#67e8f9', // Crystalline cyan shallows
    edgeColor: '#67e8f9',
    waterOrEnergyColor: '#38bdf8',
    atmosphereColor: '#22d3ee',
    fogColor: '#091826',
    starfieldIntensity: 1.35,
    reliefMultiplier: 1.45,
    description:
      'Étendues de neige immaculée et glaciers de saphir clair reflétant la lueur d’aurores boréales et de cristaux de glace.',
  },
  {
    id: 'neon_alien',
    name: 'Néon Alien',
    subtitle: 'Secteur Bioluminescent Opalin',
    groundLowColor: '#2dd4bf',    // Bioluminescent teal shore
    groundBaseColor: '#7e57c2',   // Vivid amethyst regolith
    groundAccentColor: '#c084fc', // Radiant orchid highland flora
    groundPeakColor: '#f472b6',   // Rose-quartz crystal spires
    oceanDeepColor: '#4c1d95',    // Deep indigo nebula sea
    oceanShallowColor: '#e879f9', // Neon magenta energy tide
    edgeColor: '#ec4899',
    waterOrEnergyColor: '#d946ef',
    atmosphereColor: '#e879f9',
    fogColor: '#160d29',
    starfieldIntensity: 1.25,
    reliefMultiplier: 1.4,
    description:
      'Vallées d’améthyste claire et terrasses d’opale rose pulsant de végétation turquoise et de mers d’énergie magenta.',
  },
] as const;

export const DEFAULT_PRESET = WORLD_PRESETS[0];

/**
 * Retrieves a preset by ID or returns the default Terra Blue preset.
 */
export function getPresetById(id: string): WorldPreset {
  return WORLD_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}
