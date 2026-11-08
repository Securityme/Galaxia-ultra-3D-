/**
 * GALAXIA ULTRA • Realistic Natural Planetary Biomes & Internal Sub-Biomes
 * Features natural Earth & planetary colors (Mediterranean sunlight, Arctic snow & glacier ice,
 * Volcanic basalt & geothermal ash, Golden solar oasis, and Celtic misty highlands).
 */

import { WorldPreset } from '../contracts/schemas';

export const WORLD_PRESETS: readonly WorldPreset[] = [
  {
    id: 'terra_blue',
    name: 'Archipel Héliocentrique',
    subtitle: 'Biome Méditerranéen & Zénith Très Ensoleillé',
    climateEffectLabel: '☀️ Très Ensoleillé • Brise Marine & Lumière Dorée',
    climateEffectType: 'very_sunny',
    groundLowColor: '#e6c994',    // Realistic warm golden beach sand
    groundBaseColor: '#4d8b55',   // Natural olive & cypress meadow green
    groundAccentColor: '#82a36b', // Sunlit limestone hills & garrigue
    groundPeakColor: '#f4f6f8',   // White marble & alpine snow summits
    oceanDeepColor: '#0b5583',    // Natural deep Mediterranean azure
    oceanShallowColor: '#36a9c7', // Crystal turquoise coastal lagoon
    edgeColor: '#f59e0b',
    waterOrEnergyColor: '#0ea5e9',
    atmosphereColor: '#7dd3fc',
    fogColor: '#12263f',
    sunLightIntensity: 2.35,
    starfieldIntensity: 0.85,
    reliefMultiplier: 1.35,
    subBiomes: [
      {
        id: 'sub_med_lagoon',
        name: 'Plages d’Or & Lagune Turquoise',
        climateTag: 'Littoral Ensoleillé (28°C)',
        colorHex: '#e6c994',
        description: 'Criques de sable blond bordées d’eaux cristallines et de pins parasol.',
      },
      {
        id: 'sub_med_groves',
        name: 'Vallée des Oliviers & Cyprès',
        climateTag: 'Plaine Tempérée Douce (24°C)',
        colorHex: '#4d8b55',
        description: 'Collines verdoyantes propices aux villas patriciennes et aux jardins.',
      },
      {
        id: 'sub_med_limestone',
        name: 'Coteaux Calcaires & Terrasses',
        climateTag: 'Plateau Sec & Lumineux (26°C)',
        colorHex: '#b8b096',
        description: 'Falaises de pierre blanche réverbérant la lumière du zénith.',
      },
      {
        id: 'sub_med_peaks',
        name: 'Cimes de Marbre & Névés',
        climateTag: 'Haute Altitude Pure (4°C)',
        colorHex: '#f4f6f8',
        description: 'Sommets couronnés de neige claire alimentant les sources du plateau.',
      },
    ],
    description:
      'Un monde tempéré baigné d’un soleil radieux : plages de sable blond, lagons turquoise, bosquets de cyprès verdoyants et sommets de calcaire blanc.',
  },
  {
    id: 'glacial_aurora',
    name: 'Hyperborée Boréale',
    subtitle: 'Biome Neige, Glaciers Bleutés & Taïga',
    climateEffectLabel: '❄️ Neige & Glace • Cristaux de Givre & Aurores',
    climateEffectType: 'snow_ice',
    groundLowColor: '#b8d4e3',    // Frosted coastal shingle & shore ice
    groundBaseColor: '#5c7c6e',   // Boreal pine taiga & snowy moss
    groundAccentColor: '#d9e8f2', // Deep powder snow slopes
    groundPeakColor: '#ffffff',   // Pure glacier ice & white summits
    oceanDeepColor: '#0c3c5c',    // Deep Arctic sapphire sea
    oceanShallowColor: '#6ab7d6', // Icy translucent fjord water
    edgeColor: '#7dd3fc',
    waterOrEnergyColor: '#38bdf8',
    atmosphereColor: '#bae6fd',
    fogColor: '#0d1e2e',
    sunLightIntensity: 1.75,
    starfieldIntensity: 1.35,
    reliefMultiplier: 1.5,
    subBiomes: [
      {
        id: 'sub_ice_fjord',
        name: 'Banquise Côtière & Fjord Glaciaire',
        climateTag: 'Glace Vive (-8°C)',
        colorHex: '#93c5fd',
        description: 'Berges de glace translucide et eaux polaires riches en minéraux.',
      },
      {
        id: 'sub_ice_taiga',
        name: 'Taïga d’Épicéas Enneigés',
        climateTag: 'Forêt Boréale (-4°C)',
        colorHex: '#4f7363',
        description: 'Forêts résineuses denses sous un manteau de neige fraîche.',
      },
      {
        id: 'sub_ice_tundra',
        name: 'Steppes de Neige Poudreuse',
        climateTag: 'Blizzard Léger (-12°C)',
        colorHex: '#e2edf5',
        description: 'Grands plateaux immaculés balayés par les vents cristallins.',
      },
      {
        id: 'sub_ice_serac',
        name: 'Dôme Glaciaire & Séracs Éternels',
        climateTag: 'Froid Polaire (-22°C)',
        colorHex: '#ffffff',
        description: 'Cathédrales de glace bleutée culminant au-dessus des nuages.',
      },
    ],
    description:
      'Terres nordiques réalistes mêlant forêts de sapins enneigés, fjords de glace translucide, vallées de poudreuse blanche et chutes de neige.',
  },
  {
    id: 'volcanic_core',
    name: 'Caldeira de Vulcain',
    subtitle: 'Biome Volcanique, Basalte & Terres Fertiles',
    climateEffectLabel: '🌋 Volcan & Géothermie • Veines de Lave & Vapeurs',
    climateEffectType: 'volcanic_magma',
    groundLowColor: '#c96232',    // Glowing geothermal shoreline & warm black-gold sand
    groundBaseColor: '#5c5549',   // Realistic volcanic basalt & dark fertile soil
    groundAccentColor: '#697a55', // Lush volcanic ash highland moss (Icelandic style)
    groundPeakColor: '#d6c5b3',   // Pale pumice ash & sulfur-rimmed craters
    oceanDeepColor: '#163242',    // Deep thermal mineral sea
    oceanShallowColor: '#d96b27', // Warm geothermal & magma-heated shallows
    edgeColor: '#f97316',
    waterOrEnergyColor: '#ea580c',
    atmosphereColor: '#fdba74',
    fogColor: '#1c1613',
    sunLightIntensity: 1.95,
    starfieldIntensity: 1.0,
    reliefMultiplier: 1.65,
    subBiomes: [
      {
        id: 'sub_volc_magma',
        name: 'Failles de Lave & Rivage Géothermal',
        climateTag: 'Activité Volcanique (42°C)',
        colorHex: '#ea580c',
        description: 'Fissures basaltiques incandescentes fournissant une énergie abondante.',
      },
      {
        id: 'sub_volc_moss',
        name: 'Terrasses de Cendres Fertiles (Style Islandais)',
        climateTag: 'Terreau Volcanique (21°C)',
        colorHex: '#697a55',
        description: 'Mousses émeraude très fertiles poussant sur le basalte refroidi.',
      },
      {
        id: 'sub_volc_basalt',
        name: 'Chaussée des Géants en Basalte',
        climateTag: 'Roche Magmatique (27°C)',
        colorHex: '#5c5549',
        description: 'Colonnes rocheuses sombres et geysers de vapeur minérale.',
      },
      {
        id: 'sub_volc_crater',
        name: 'Cratère Fumerollien & Pierre Ponce',
        climateTag: 'Panache Thermique (35°C)',
        colorHex: '#d6c5b3',
        description: 'Cimes volcaniques couronnées de cendres claires et de fumerolles.',
      },
    ],
    description:
      'Inspiré des terres volcaniques d’Islande et de Sicile : roches de basalte naturel, terrasses de mousse verte très fertiles, sources chaudes et veines de magma.',
  },
  {
    id: 'neon_alien',
    name: 'Oasis d’Héliopolis',
    subtitle: 'Biome Désert Solaire, Canyons d’Ocre & Palmeraies',
    climateEffectLabel: '☀️ Zénith Désertique • Dunes d’Or & Oasis Fertiles',
    climateEffectType: 'desert_sun',
    groundLowColor: '#4c8f68',    // Lush green oasis shoreline around water!
    groundBaseColor: '#deb471',   // Realistic golden desert sand
    groundAccentColor: '#c27951', // Red-ochre sandstone canyons (Petra / Wadi Rum)
    groundPeakColor: '#f3e5ce',   // Sun-bleached sandstone mesas
    oceanDeepColor: '#0d5c63',    // Deep emerald oasis basin
    oceanShallowColor: '#2bb3a3', // Clear turquoise oasis springs
    edgeColor: '#fbbf24',
    waterOrEnergyColor: '#14b8a6',
    atmosphereColor: '#fde68a',
    fogColor: '#241a10',
    sunLightIntensity: 2.55,
    starfieldIntensity: 0.9,
    reliefMultiplier: 1.42,
    subBiomes: [
      {
        id: 'sub_des_oasis',
        name: 'Palmeraie & Bassin d’Oasis Émeraude',
        climateTag: 'Micro-Climat Humide (25°C)',
        colorHex: '#3b8c62',
        description: 'Bordures d’eau verdoyantes où prospèrent palmiers et jardins suspendus.',
      },
      {
        id: 'sub_des_dunes',
        name: 'Grand Erg des Dunes Dorées',
        climateTag: 'Ensoleillement Maximal (36°C)',
        colorHex: '#deb471',
        description: 'Ondulations de sable d’or étincelant sous le soleil zénithal.',
      },
      {
        id: 'sub_des_canyon',
        name: 'Canyons de Grès Rose & Ocre',
        climateTag: 'Vent Thermique Sec (31°C)',
        colorHex: '#c27951',
        description: 'Massifs sculptés dans la roche rouge rappelant les cités nabatéennes.',
      },
      {
        id: 'sub_des_mesa',
        name: 'Haut-Plateau de Calcaire Solaire',
        climateTag: 'Ciel Pur Zénithal (28°C)',
        colorHex: '#f3e5ce',
        description: 'Tables rocheuses claires idéales pour les observatoires astronomiques.',
      },
    ],
    description:
      'Désert réaliste et majestueux : dunes de sable doré, canyons de grès rose-ocre et oasis d’émeraude luxuriantes autour des bassins d’eau.',
  },
  {
    id: 'highland_fjord',
    name: 'Hautes-Terres d’Avalon',
    subtitle: 'Biome Fjords Saphir, Landes & Sommets Alpins',
    climateEffectLabel: '🌤️ Brume & Rayons d’Or • Fjords, Forêts & Névés',
    climateEffectType: 'alpine_mist',
    groundLowColor: '#cfc4af',    // Natural coastal pebble & sand beaches
    groundBaseColor: '#487a56',   // Rich highland pasture & pine green
    groundAccentColor: '#8c7a5b', // Autumn heather & granite moorland
    groundPeakColor: '#f1f5f9',   // Snow-capped granite peaks
    oceanDeepColor: '#134054',    // Deep Nordic fjord blue
    oceanShallowColor: '#3b9AB2', // Clear cold coastal cove water
    edgeColor: '#34d399',
    waterOrEnergyColor: '#38bdf8',
    atmosphereColor: '#93c5fd',
    fogColor: '#101f2b',
    sunLightIntensity: 1.9,
    starfieldIntensity: 1.1,
    reliefMultiplier: 1.55,
    subBiomes: [
      {
        id: 'sub_high_cove',
        name: 'Grèves de Galets & Lochs Saphir',
        climateTag: 'Air Marin Tonique (16°C)',
        colorHex: '#cfc4af',
        description: 'Rivages découpés où les rivières de montagne rejoignent l’océan.',
      },
      {
        id: 'sub_high_glen',
        name: 'Vallons d’Émeraude & Sources',
        climateTag: 'Prairie Humide (18°C)',
        colorHex: '#487a56',
        description: 'Vallées fertiles tapissées de mousses et de forêts anciennes.',
      },
      {
        id: 'sub_high_moor',
        name: 'Landes Ambrées & Roches Granitiques',
        climateTag: 'Brume Légère (13°C)',
        colorHex: '#8c7a5b',
        description: 'Plateaux vallonnés aux teintes cuivrées et bruyères sauvages.',
      },
      {
        id: 'sub_high_peak',
        name: 'Aiguilles de Granit & Glaciers Alpins',
        climateTag: 'Neige d’Altitude (-3°C)',
        colorHex: '#f1f5f9',
        description: 'Hauts sommets rocheux coiffés de neiges éternelles.',
      },
    ],
    description:
      'Hautes-terres sauvages et réalistes : lochs saphir, vallées verdoyantes, landes cuivrées et sommets granitiques enneigés sous une brume dorée.',
  },
] as const;

export const DEFAULT_PRESET = WORLD_PRESETS[0];

/**
 * Retrieves a preset by ID or returns the default preset.
 */
export function getPresetById(id: string): WorldPreset {
  return WORLD_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}
