/**
 * GALAXIA ULTRA • PAX HISTORIA 3D Configuration Constants
 * Named architectural constants (wld_, bld_, npc_, cam_, wtr_, ui_).
 */

/* ==========================================================================
   WLD_: World, Expanded Curved Plateau & 3D Planet Globe Constants
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

export const wld_STAR_COUNT = 3200;
export const wld_ASTEROID_COUNT = 18;
export const wld_NEBULA_SPRITE_COUNT = 8;
export const wld_DUST_PARTICLE_COUNT = 180;

export const wld_CELESTIAL_CYCLE_RATE = 0.04;

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
export const wtr_STARDUST_DRIFT = 'stardust_drift' as const;
export const wtr_ELECTRICAL_STORM = 'electrical_storm' as const;
export const wtr_AURORA_CURTAIN = 'aurora_curtain' as const;
export const wtr_SOLAR_FLARE = 'solar_flare' as const;

export const wtr_TYPES = [
  wtr_CALM,
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
   CAM_: Spectator Camera Framing Modes & Inertia
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

/* ==========================================================================
   UI_: Interface & Touch Constants
   ========================================================================== */

export const ui_TOUCH_TARGET_MIN_PX = 44;
export const ui_MAX_SAVE_SLOTS = 4;
