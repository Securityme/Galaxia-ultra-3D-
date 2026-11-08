/**
 * GALAXIA ULTRA • Bio-Dôme de Poche Configuration Constants
 * Named architectural constants (wld_, bld_, npc_, cam_, wtr_, rsc_, evt_, ast_, ui_).
 */

/* ==========================================================================
   WLD_: World, Expanded Curved Plateau, Aurora Horizon Crown & 3D Planet Globe
   ========================================================================== */

export const wld_PLATEAU_WIDTH = 112;
export const wld_PLATEAU_LENGTH = 112;
export const wld_PLATEAU_THICKNESS = 5.5;
export const wld_PLATEAU_SUBDIVISIONS = 160;

// Spherical curvature radius for the plateau surface (simulates a real spherical planet surface)
export const wld_SPHERICAL_CURVATURE_RADIUS = 185;

export const wld_PLANET_RADIUS = 19.5;
export const wld_PLANET_SUBDIVISIONS = 96;
export const wld_PLANET_ATMO_RADIUS = 21.2;

export const wld_DEFAULT_RELIEF_SCALE = 1.55;
export const wld_MAX_RELIEF_SCALE = 3.2;

export const wld_BOUNDS_X_MIN = -46;
export const wld_BOUNDS_X_MAX = 46;
export const wld_BOUNDS_Z_MIN = -46;
export const wld_BOUNDS_Z_MAX = 46;

// Dedicated 3D Plateau Arrival Zone coordinates (Esplanade & Porte Impériale)
export const wld_ARRIVAL_ZONE_X = 0;
export const wld_ARRIVAL_ZONE_Z = 24.0;
export const wld_ARRIVAL_ZONE_RADIUS = 5.2;
export const wld_ARRIVAL_ZONE_ELEVATION = 1.35;

// PT-60: Immersive Horizon « Couronne de l'Aurore » (H1..H4 deterministic layers)
export const wld_HORIZON_CROWN_INNER = 68;
export const wld_HORIZON_CROWN_OUTER = 96;
export const wld_HORIZON_PEAK_MAX = 14;
export const wld_CLOUD_BAND_Y = 10;
export const wld_CLOUD_SPRITE_COUNT_CINEMA = 28;
export const wld_CLOUD_SPRITE_COUNT_PERFORMANCE = 14;
export const wld_CLOUD_DRIFT_PER_TICK = 0.00045;
export const wld_MOON_ORBIT_PER_TICK = 0.00032;

export const wld_STAR_COUNT = 3200;
export const wld_ASTEROID_COUNT = 18;
export const wld_NEBULA_SPRITE_COUNT = 8;
export const wld_DUST_PARTICLE_COUNT = 180;

export const wld_CELESTIAL_CYCLE_RATE = 0.04;

/* ==========================================================================
   EVT_: Fixed-Tick Simulation & Event Orchestration Constants (PT-47)
   ========================================================================== */

export const evt_TICK_HZ = 10;
export const evt_TICK_INTERVAL_SEC = 1 / evt_TICK_HZ;
export const evt_MAX_OFFLINE_HOURS = 4;
export const evt_CRISIS_MAX_LAST_TEN = 2;

/* ==========================================================================
   RSC_: Canonical Imperial, Material & Technological Resource Registry (PT-61)
   ========================================================================== */

export const rsc_STABILITY = 'stability' as const;
export const rsc_PROSPERITY = 'prosperity' as const;
export const rsc_KNOWLEDGE = 'knowledge' as const;
export const rsc_INFLUENCE = 'influence' as const;

export const rsc_IMPERIAL_TYPES = [
  rsc_STABILITY,
  rsc_PROSPERITY,
  rsc_KNOWLEDGE,
  rsc_INFLUENCE,
] as const;

export const rsc_MARBLE = 'marble' as const;
export const rsc_BASALT = 'basalt' as const;
export const rsc_CRYSTAL = 'crystal' as const;
export const rsc_BIOMASS = 'biomass' as const;

export const rsc_MATERIAL_TYPES = [
  rsc_MARBLE,
  rsc_BASALT,
  rsc_CRYSTAL,
  rsc_BIOMASS,
] as const;

// PT-61: Technological Resource Registry (Helios Sector Lineage AA-3)
export const rsc_ENERGY = 'energy' as const;
export const rsc_ALLOY = 'alloy' as const;
export const rsc_DATA = 'data' as const;
export const rsc_PARTS = 'parts' as const;

export const rsc_TECH_TYPES = [
  rsc_ENERGY,
  rsc_ALLOY,
  rsc_DATA,
  rsc_PARTS,
] as const;

export const rsc_ALL_TYPES = [
  ...rsc_IMPERIAL_TYPES,
  ...rsc_MATERIAL_TYPES,
  ...rsc_TECH_TYPES,
] as const;

export type ImperialResourceType = (typeof rsc_IMPERIAL_TYPES)[number];
export type MaterialResourceType = (typeof rsc_MATERIAL_TYPES)[number];
export type TechResourceType = (typeof rsc_TECH_TYPES)[number];
export type AnyResourceType = (typeof rsc_ALL_TYPES)[number];

/* ==========================================================================
   VIEW_: Primary 3D World View Modes (Plateau vs 3D Planet Map)
   ========================================================================== */

export const view_MODE_PLATEAU = 'plateau_world' as const;
export const view_MODE_PLANET_3D = 'planet_globe' as const;

export type WorldViewMode = typeof view_MODE_PLATEAU | typeof view_MODE_PLANET_3D;

/* ==========================================================================
   BLD_: Building Catalog & Assembly Constants
   ========================================================================== */

export const bld_TYPE_OBSERVATION = 'observation_station' as const;
export const bld_TYPE_BIO_DOME = 'bio_research_dome' as const;
export const bld_TYPE_RELAY_TOWER = 'energy_relay_tower' as const;
export const bld_TYPE_HABITAT = 'modular_habitat' as const;
export const bld_TYPE_GREENHOUSE = 'hydroponic_greenhouse' as const;

export const bld_TYPES = [
  bld_TYPE_OBSERVATION,
  bld_TYPE_BIO_DOME,
  bld_TYPE_RELAY_TOWER,
  bld_TYPE_HABITAT,
  bld_TYPE_GREENHOUSE,
] as const;

export type BuildingType = (typeof bld_TYPES)[number];

export const bld_ANIMATION_ASSEMBLY_DURATION = 1.2;
export const bld_HOLOGRAM_GLOW_INTENSITY = 1.6;

/* ==========================================================================
   WTR_: Dynamic Weather System Constants
   ========================================================================== */

export const wtr_CALM = 'calm' as const;
export const wtr_LIGHT_RAIN = 'light_rain' as const;
export const wtr_MIST = 'mist' as const;
export const wtr_STARDUST_DRIFT = 'stardust_drift' as const;
export const wtr_ELECTRICAL_STORM = 'electrical_storm' as const;
export const wtr_AURORA_CURTAIN = 'aurora_curtain' as const;
export const wtr_SOLAR_FLARE = 'solar_flare' as const;

export const wtr_TYPES = [
  wtr_CALM,
  wtr_LIGHT_RAIN,
  wtr_MIST,
  wtr_STARDUST_DRIFT,
  wtr_ELECTRICAL_STORM,
  wtr_AURORA_CURTAIN,
  wtr_SOLAR_FLARE,
] as const;

export type WeatherType = (typeof wtr_TYPES)[number];

/* ==========================================================================
   NPC_: Non-Player Characters & Sovereign Archetypes
   ========================================================================== */

export const npc_ROLE_SOVEREIGN = 'Souverain Fondateur';
export const npc_ROLE_RESEARCHER = 'Chercheur en Exobiologie';
export const npc_ROLE_ENGINEER = 'Ingénieur Quantique';
export const npc_ROLE_PILOT = 'Pilote de Navette';
export const npc_ROLE_BOTANIST = 'Botaniste Stellaire';
export const npc_ROLE_SECURITY = 'Sentinelle de Bord';
export const npc_ROLE_CHRONICLER = 'Chroniqueur Stellaire';

export const npc_ROLES = [
  npc_ROLE_SOVEREIGN,
  npc_ROLE_RESEARCHER,
  npc_ROLE_ENGINEER,
  npc_ROLE_PILOT,
  npc_ROLE_BOTANIST,
  npc_ROLE_SECURITY,
  npc_ROLE_CHRONICLER,
] as const;

export type NpcRole = (typeof npc_ROLES)[number];

export const npc_WALK_SPEED_MIN = 0.8;
export const npc_WALK_SPEED_MAX = 1.8;
export const npc_WANDER_RADIUS = 14.0;
export const npc_BOB_FREQUENCY = 7.0;
export const npc_BOB_AMPLITUDE = 0.08;

/* ==========================================================================
   CAM_: Spectator Camera Framing Modes, Inertia & Native Gesture Thresholds (R-PT-59)
   ========================================================================== */

export const cam_MODE_ORBIT = 'orbit' as const;
export const cam_MODE_PLATEAU = 'plateau' as const;
export const cam_MODE_ARRIVAL = 'arrival' as const;
export const cam_MODE_GLOBE = 'globe' as const;

export type CameraMode =
  | typeof cam_MODE_ORBIT
  | typeof cam_MODE_PLATEAU
  | typeof cam_MODE_ARRIVAL
  | typeof cam_MODE_GLOBE;

export const cam_ORBIT_DISTANCE_DEFAULT = 68;
export const cam_ORBIT_DISTANCE_MIN = 18;
export const cam_ORBIT_DISTANCE_MAX = 135;
export const cam_GLOBE_DISTANCE_DEFAULT = 52;

export const cam_PLATEAU_POS = { x: 0, y: 42, z: 44 };
export const cam_PLATEAU_TARGET = { x: 0, y: 1.5, z: 0 };

export const cam_INERTIA_DAMPING = 0.095;
export const cam_MODE_TRANSITION_SPEED = 3.5;

// R-PT-59: Canonical Native Gesture Thresholds & Sensitivities
export const cam_GESTURE_TAP_THRESHOLD = 7;
export const cam_GESTURE_PAN_SENSITIVITY = 0.062;
export const cam_GESTURE_ROTATE_SENSITIVITY = 0.0065;
export const cam_GESTURE_PINCH_SENSITIVITY = 0.11;
export const cam_GESTURE_TWIST_SENSITIVITY = 1.85;

/* ==========================================================================
   UI_: Interface & Save Constants
   ========================================================================== */

export const ui_MAX_SAVE_SLOTS = 4;

/* ==========================================================================
   AST_: Asset Registry & PT-74 WASM Kernel Versioning
   ========================================================================== */

export const ast_WASM_SIM_KERNEL_ID = 'ast_wasm_sim_kernel_v4_0_0';
export const ast_WASM_SIM_KERNEL_VERSION = 'v4.0.0';
export const ast_WASM_EXPECTED_FINGERPRINT = 'fnv1a64:8f4e2c19a70b3d51';

