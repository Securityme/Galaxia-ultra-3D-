import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  ArrowLeft,
  ArrowRight,
  CloudLightning,
  Compass,
  Crown,
  Globe2,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import {
  activePresetIdAtom,
  activeZoneIdAtom,
  ambienceOverrideAtom,
  chroniclesAtom,
  isBootScreenOpenAtom,
  isGameConfigModalOpenAtom,
  pendingEffectsQueueAtom,
  reliefScaleAtom,
  resourceStocksAtom,
  turnLedgerAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
  zonesRuntimeMapAtom,
} from '../../stores/worldStore';
import { WORLD_PRESETS } from '../../config/presets';
import {
  PLANETARY_ZONES,
  buildInitialZonesRuntimeMap,
} from '../../config/planetaryZones';
import {
  WeatherType,
  npc_ROLE_SOVEREIGN,
  wld_ARRIVAL_ZONE_X,
  wld_ARRIVAL_ZONE_Z,
  wtr_AURORA_CURTAIN,
  wtr_CALM,
  wtr_ELECTRICAL_STORM,
  wtr_SOLAR_FLARE,
  wtr_STARDUST_DRIFT,
} from '../../config/constants';
import { createPRNG } from '../../core/prng';
import { createInitialResourceStocks } from '../../core/simulation/simulationKernel';
import { GlassPanel } from '../ui/GlassPanel';

interface SovereignPreset {
  id: string;
  name: string;
  title: string;
  archetype: string;
  colorHex: string;
  bio: string;
  bonusText: string;
}

const SOVEREIGN_PRESETS: readonly SovereignPreset[] = [
  {
    id: 'sov_cartographer',
    name: 'Archonte Valerius',
    title: 'Grand Cartographe des Méridiens',
    archetype: 'Exploration & Diplomatie',
    colorHex: '#fbbf24',
    bio: 'Souverain érudit ayant unifié les cartes des six plateaux continentaux.',
    bonusText: '+15% Savoir & Cartographie Orbitale',
  },
  {
    id: 'sov_engineer',
    name: 'Impératrice Astraea',
    title: 'Bâtisseuse des Phares Souverains',
    archetype: 'Architecture & Énergie',
    colorHex: '#38bdf8',
    bio: 'Architecte visionnaire spécialisée dans les citadelles et réseaux géothermiques.',
    bonusText: '+20% Prospérité & Édifices Monumentaux',
  },
  {
    id: 'sov_botanist',
    name: 'Seigneur Silvanus',
    title: 'Gardien des Biodômes Émeraude',
    archetype: 'Écologie & Xénobotanique',
    colorHex: '#34d399',
    bio: 'Maître des écosystèmes planétaires et des jardins suspendus.',
    bonusText: '+20% Stabilité & Croissance Démographique',
  },
  {
    id: 'sov_admiral',
    name: 'Haut-Consul Orion',
    title: 'Commandant des Flottes Célestes',
    archetype: 'Logistique & Astroports',
    colorHex: '#f472b6',
    bio: 'Coordonne les navettes impériales entre les Portes d’Arrivée de la planète.',
    bonusText: '+20% Influence & Convois Orbitaux',
  },
] as const;

interface WeatherPresetOption {
  id: WeatherType;
  name: string;
  subtitle: string;
  particleDensity: number;
  lightIntensity: number;
  badgeColor: string;
}

const WEATHER_PRESETS: readonly WeatherPresetOption[] = [
  {
    id: wtr_CALM,
    name: 'Zénith Impérial Serein',
    subtitle: 'Ciel limpide, visibilité maximale et lumière dorée équilibrée',
    particleDensity: 0.4,
    lightIntensity: 2.1,
    badgeColor: '#38bdf8',
  },
  {
    id: wtr_STARDUST_DRIFT,
    name: 'Alizés de Poussière d’Or',
    subtitle: 'Brume stellaire ambrée dérivant doucement sur les reliefs',
    particleDensity: 0.85,
    lightIntensity: 2.0,
    badgeColor: '#fbbf24',
  },
  {
    id: wtr_AURORA_CURTAIN,
    name: 'Voile d’Aurores Magnétiques',
    subtitle: 'Draperies boréales émeraude illuminant la haute atmosphère',
    particleDensity: 0.65,
    lightIntensity: 1.95,
    badgeColor: '#34d399',
  },
  {
    id: wtr_ELECTRICAL_STORM,
    name: 'Tempête Géomagnétique',
    subtitle: 'Arcs électriques autour des tours-relais et atmosphère chargée',
    particleDensity: 0.75,
    lightIntensity: 1.85,
    badgeColor: '#60a5fa',
  },
  {
    id: wtr_SOLAR_FLARE,
    name: 'Couronne Solaire Ardente',
    subtitle: 'Clarté zénithale intense et reflets cuivrés sur les océans',
    particleDensity: 0.7,
    lightIntensity: 2.35,
    badgeColor: '#f97316',
  },
] as const;

/**
 * 2-Step New Game Configuration Wizard:
 * - Step 1: Configure Played Sovereign Character via Presets (Name, Title, Archetype, Emblem Color)
 * - Step 2: Configure World, Planetary Biome Preset, Weather Preset, Starting Plateau Zone & Relief
 */
export const GameConfigModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isGameConfigModalOpenAtom);

  const [worldName, setWorldName] = useAtom(worldNameAtom);
  const [seed, setSeed] = useAtom(worldSeedAtom);
  const [presetId, setPresetId] = useAtom(activePresetIdAtom);
  const [reliefScale, setReliefScale] = useAtom(reliefScaleAtom);

  const setActiveZoneId = useSetAtom(activeZoneIdAtom);
  const setZonesMap = useSetAtom(zonesRuntimeMapAtom);
  const setTurnNumber = useSetAtom(turnNumberAtom);
  const setAmbience = useSetAtom(ambienceOverrideAtom);
  const setChronicles = useSetAtom(chroniclesAtom);
  const setResourceStocks = useSetAtom(resourceStocksAtom);
  const setPendingEffects = useSetAtom(pendingEffectsQueueAtom);
  const setTurnLedger = useSetAtom(turnLedgerAtom);
  const setIsBootScreenOpen = useSetAtom(isBootScreenOpenAtom);

  const [step, setStep] = useState<1 | 2>(1);
  const [seedSalt, setSeedSalt] = useState(1);

  // Step 1 State: Sovereign Character
  const [selectedSovPresetId, setSelectedSovPresetId] = useState(SOVEREIGN_PRESETS[0].id);
  const [leaderName, setLeaderName] = useState(SOVEREIGN_PRESETS[0].name);
  const [leaderTitle, setLeaderTitle] = useState(SOVEREIGN_PRESETS[0].title);
  const [leaderColor, setLeaderColor] = useState(SOVEREIGN_PRESETS[0].colorHex);
  const [leaderBio, setLeaderBio] = useState(SOVEREIGN_PRESETS[0].bio);

  // Step 2 State: World, Biome Preset, Weather Preset, Starting Zone
  const [draftWorldName, setDraftWorldName] = useState(worldName);
  const [draftSeed, setDraftSeed] = useState(seed);
  const [draftPresetId, setDraftPresetId] = useState(presetId);
  const [draftWeatherId, setDraftWeatherId] = useState<WeatherType>(wtr_CALM);
  const [draftZoneId, setDraftZoneId] = useState(PLANETARY_ZONES[0].id);
  const [draftRelief, setDraftRelief] = useState(reliefScale);
  const [startingCrewCount, setStartingCrewCount] = useState(4);

  if (!isOpen) return null;

  const handleSelectSovereignPreset = (preset: SovereignPreset) => {
    setSelectedSovPresetId(preset.id);
    setLeaderName(preset.name);
    setLeaderTitle(preset.title);
    setLeaderColor(preset.colorHex);
    setLeaderBio(preset.bio);
  };

  const handleLaunchNewGame = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWorldName = draftWorldName.trim() || 'Aethelgard Prime';
    const cleanSeed = draftSeed.trim() || 'GALAXIA-OMEGA-77';
    const cleanLeaderName = leaderName.trim() || 'Archonte Valerius';
    const weatherPreset =
      WEATHER_PRESETS.find((w) => w.id === draftWeatherId) ?? WEATHER_PRESETS[0];

    const freshZonesMap = buildInitialZonesRuntimeMap();
    const targetZone = freshZonesMap[draftZoneId];
    if (targetZone) {
      const sovereignNpc = {
        id: 'npc_sovereign_t1',
        name: `${cleanLeaderName} (${leaderTitle})`,
        role: npc_ROLE_SOVEREIGN,
        bio: leaderBio,
        mood: 'Souverain et visionnaire',
        x: wld_ARRIVAL_ZONE_X,
        z: wld_ARRIVAL_ZONE_Z - 2.0,
        targetX: 0,
        targetZ: -1.5,
        colorHex: leaderColor,
        spawnedAt: 1000,
      };
      targetZone.npcs = [
        sovereignNpc,
        ...targetZone.npcs.slice(0, Math.max(1, startingCrewCount - 1)),
      ];
    }

    setWorldName(cleanWorldName);
    setSeed(cleanSeed);
    setActiveZoneId(draftZoneId);
    setPresetId(draftPresetId);
    setReliefScale(draftRelief);
    setZonesMap(freshZonesMap);
    setTurnNumber(1);
    setResourceStocks(createInitialResourceStocks());
    setPendingEffects([]);
    setTurnLedger([]);

    setAmbience({
      weatherEffect: weatherPreset.id,
      particleDensity: weatherPreset.particleDensity,
      lightIntensity: weatherPreset.lightIntensity,
      note: `${weatherPreset.name} — ${weatherPreset.subtitle}`,
    });

    setChronicles([
      {
        id: 'chr_init_t1',
        timestamp: 1000,
        turnNumber: 1,
        category: 'FONDATION',
        title: `Avènement de ${cleanLeaderName} sur ${cleanWorldName}`,
        narrative: `Sous le titre de « ${leaderTitle} », ${cleanLeaderName} inaugure la Porte Céleste du plateau de départ sous un climat « ${weatherPreset.name} ».`,
        chosenChoiceLabel: 'Proclamer la Charte de Fondation Planétaire',
        mutationsSummary: [
          `Souverain : ${cleanLeaderName}`,
          `Météo : ${weatherPreset.name}`,
        ],
        economicDeltasSummary: [],
        causalRefs: ['npc_sovereign_t1'],
      },
    ]);

    setIsOpen(false);
    setIsBootScreenOpen(true);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4">
      <GlassPanel className="w-full max-w-2xl max-h-[90dvh] flex flex-col p-5 sm:p-6">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            {step === 1 ? (
              <Crown className="w-5 h-5 text-amber-300" />
            ) : (
              <Globe2 className="w-5 h-5 text-sky-300" />
            )}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
                Étape {step} sur 2 •{' '}
                {step === 1
                  ? 'Personnage Joué (Souverain)'
                  : 'Monde, Biome Planétaire & Météo'}
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-amber-50">
                {step === 1
                  ? 'Configuration du Souverain Fondateur'
                  : 'Configuration du Monde, des Biomes & du Climat'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Pills */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition cursor-pointer ${
              step === 1
                ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>1. Personnage & Archétype</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition cursor-pointer ${
              step === 2
                ? 'border-sky-300 bg-sky-400/20 text-sky-100'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>2. Biome, Météo & Planète</span>
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleLaunchNewGame}
          className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm"
        >
          {step === 1 ? (
            <>
              {/* Sovereign Archetype Presets */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Choisir un Preset de Souverain / Personnage Joué
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SOVEREIGN_PRESETS.map((preset) => {
                    const isSelected = selectedSovPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectSovereignPreset(preset)}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-300 bg-amber-400/15 shadow-md'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-semibold text-sm text-amber-50">
                            {preset.name}
                          </span>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/30"
                            style={{ backgroundColor: preset.colorHex }}
                          />
                        </div>
                        <span className="block text-[11px] font-mono text-amber-200/80 mt-0.5">
                          {preset.archetype}
                        </span>
                        <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                          {preset.bio}
                        </p>
                        <span className="mt-1.5 inline-block text-[10px] font-mono text-emerald-300">
                          {preset.bonusText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Sovereign Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Nom du Personnage / Souverain
                  </label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    maxLength={36}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs sm:text-sm text-amber-50 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Titre Impérial
                  </label>
                  <input
                    type="text"
                    value={leaderTitle}
                    onChange={(e) => setLeaderTitle(e.target.value)}
                    maxLength={44}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs sm:text-sm text-amber-50 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* World Name & Seed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nom de l’Empire / Planète
                  </label>
                  <input
                    type="text"
                    value={draftWorldName}
                    onChange={(e) => setDraftWorldName(e.target.value)}
                    maxLength={40}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs sm:text-sm text-amber-50 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-300 font-medium mb-1">
                      Graine Planétaire (Seed)
                    </label>
                    <input
                      type="text"
                      value={draftSeed}
                      onChange={(e) => setDraftSeed(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs sm:text-sm text-amber-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const rng = createPRNG(`${draftSeed}_${seedSalt}`);
                      const a = Math.floor(100 + rng() * 900);
                      const b = Math.floor(10 + rng() * 89);
                      setSeedSalt((prev) => prev + 1);
                      setDraftSeed(`GALAXIA-${a}-${b}`);
                    }}
                    className="rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/25 transition cursor-pointer"
                    title="Graine déterministe suivante"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Planetary Biome Preset Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Preset de Biome Planétaire
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WORLD_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDraftPresetId(p.id)}
                      className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        draftPresetId === p.id
                          ? 'border-amber-300 bg-amber-400/15 text-amber-50'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.oceanShallowColor }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.groundBaseColor }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.groundPeakColor }}
                          />
                        </div>
                      </div>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                        {p.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Planetary Weather Preset Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
                  <CloudLightning className="w-3.5 h-3.5 text-sky-300" />
                  Preset de Météo & Climat Planétaire
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WEATHER_PRESETS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setDraftWeatherId(w.id)}
                      className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        draftWeatherId === w.id
                          ? 'border-sky-300 bg-sky-400/15 text-sky-50'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">{w.name}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: w.badgeColor }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                        {w.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Zone & Relief */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Zone Plateau de Départ
                  </label>
                  <select
                    value={draftZoneId}
                    onChange={(e) => {
                      const z = PLANETARY_ZONES.find((item) => item.id === e.target.value);
                      setDraftZoneId(e.target.value);
                      if (z) {
                        setDraftPresetId(z.presetId);
                        setDraftRelief(z.reliefScale);
                      }
                    }}
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-xs text-amber-100"
                  >
                    {PLANETARY_ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">Relief & Courbure</span>
                    <span className="font-mono text-amber-300">{draftRelief.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={2.6}
                    step={0.05}
                    value={draftRelief}
                    onChange={(e) => setDraftRelief(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">Émissaires Initiaux</span>
                    <span className="font-mono text-amber-300">{startingCrewCount}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={startingCrewCount}
                    onChange={(e) => setStartingCrewCount(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer Navigation */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2.5">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  <span>Suivant : Configurer le Monde & la Météo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour au Personnage</span>
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Fonder l’Empire & Lancer</span>
                </button>
              </>
            )}
          </div>
        </form>
      </GlassPanel>
    </div>
  );
};
