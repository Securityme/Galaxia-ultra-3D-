import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Activity,
  Check,
  CloudLightning,
  Copy,
  Globe,
  RefreshCw,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  activePresetAtom,
  activePresetIdAtom,
  ambienceOverrideAtom,
  buildingsAtom,
  cameraZoomStepSignalAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  commanderAuthUserAtom,
  graphicsQualityPresetAtom,
  isPerfHudOpenAtom,
  isSettingsOpenAtom,
  npcsAtom,
  reducedMotionAtom,
  reliefScaleAtom,
  resourceStocksAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import {
  WeatherType,
  wtr_CALM,
  wtr_LIGHT_RAIN,
  wtr_MIST,
  wtr_STARDUST_DRIFT,
  wtr_ELECTRICAL_STORM,
  wtr_AURORA_CURTAIN,
} from '../../config/constants';
import {
  GRAPHICS_PRESET_SPECS,
  GraphicsQualityPreset,
} from '../../three/postfx/blenderComposer';
import { createPRNG } from '../../core/prng';
import { computeStateFingerprint } from '../../core/simulation/simulationKernel';
import {
  decodeCommanderShareCode,
  encodeCommanderShareCode,
  isTauriDesktopShell,
  listCommanderHubWorlds,
  publishWorldToCommanderHub,
} from '../../services/seedHubService';
import { GlassPanel } from '../ui/GlassPanel';

export const WorldSettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isSettingsOpenAtom);
  const [worldName, setWorldName] = useAtom(worldNameAtom);
  const [seed, setSeed] = useAtom(worldSeedAtom);
  const [presetId, setPresetId] = useAtom(activePresetIdAtom);
  const activePreset = useAtomValue(activePresetAtom);
  const [reliefScale, setReliefScale] = useAtom(reliefScaleAtom);
  const [celestialTime, setCelestialTime] = useAtom(celestialTimeAtom);
  const [autoCycleTime, setAutoCycleTime] = useAtom(celestialAutoCycleAtom);
  const [ambience, setAmbience] = useAtom(ambienceOverrideAtom);
  const [qualityPreset, setQualityPreset] = useAtom(graphicsQualityPresetAtom);
  const [reducedMotion, setReducedMotion] = useAtom(reducedMotionAtom);
  const [isPerfHudOpen, setIsPerfHudOpen] = useAtom(isPerfHudOpenAtom);
  const [, setZoomSignal] = useAtom(cameraZoomStepSignalAtom);

  const turnNumber = useAtomValue(turnNumberAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const stocks = useAtomValue(resourceStocksAtom);
  const commanderUser = useAtomValue(commanderAuthUserAtom);

  const [copiedCode, setCopiedCode] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [hubWorlds, setHubWorlds] = useState(() => listCommanderHubWorlds());
  const [hubFeedback, setHubFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeWeather = ambience?.weatherEffect ?? wtr_CALM;
  const particleDensity = ambience?.particleDensity ?? 0.5;

  const currentFingerprint = computeStateFingerprint({
    seed,
    turnNumber,
    buildings,
    npcs,
    resourceStocks: stocks,
  });

  const currentShareCode = encodeCommanderShareCode({
    seed,
    presetId,
    turnNumber,
    stateFingerprint: currentFingerprint,
  });

  const weatherOptions: { id: WeatherType; label: string }[] = [
    { id: wtr_CALM, label: 'Clair & Serein' },
    { id: wtr_LIGHT_RAIN, label: 'Pluie Fine Céleste (Orbe)' },
    { id: wtr_MIST, label: 'Brume Volumétrique (Orbe)' },
    { id: wtr_AURORA_CURTAIN, label: 'Aurore Étincelante' },
    { id: wtr_STARDUST_DRIFT, label: 'Poussière d’Étoiles' },
    { id: wtr_ELECTRICAL_STORM, label: 'Orage Électrique' },
  ];

  const qualityPresets: GraphicsQualityPreset[] = [
    'cinema',
    'balanced',
    'performance',
  ];

  const handleWeatherChange = (w: WeatherType) => {
    setAmbience((prev) => ({
      ...(prev ?? {}),
      weatherEffect: w,
    }));
  };

  const handleDensityChange = (d: number) => {
    setAmbience((prev) => ({
      ...(prev ?? {}),
      particleDensity: d,
    }));
  };

  const handleAccessibilityZoom = (delta: number) => {
    setZoomSignal((prev) => ({ seq: prev.seq + 1, delta }));
  };

  const handlePublishAndCopyShareCode = () => {
    const published = publishWorldToCommanderHub({
      worldName,
      seed,
      presetId,
      biomeLabel: activePreset.name,
      turnReached: turnNumber,
      stateFingerprint: currentFingerprint,
      commanderName: commanderUser?.displayName || 'Commandant Souverain',
      createdAtIso: '2026-11-07T12:00:00.000Z',
    });
    setHubWorlds(listCommanderHubWorlds());
    navigator.clipboard?.writeText(published.shareCode).catch(() => {});
    setCopiedCode(true);
    setHubFeedback(`Monde « ${worldName} » publié au Hub et code copié !`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleApplyShareCode = (code: string) => {
    const decoded = decodeCommanderShareCode(code);
    if (!decoded) {
      setHubFeedback('Format de code de graine invalide (attendu : GXP4:...).');
      return;
    }
    setSeed(decoded.seed);
    setPresetId(decoded.presetId);
    setHubFeedback(`Graine « ${decoded.seed} » (${decoded.presetId}) chargée avec succès.`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-2xl p-6 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Pipeline « Niveau Blender », Accessibilité & Hub de Graines
              </h2>
              <p className="text-xs text-slate-400">
                EffectComposer, PBR Sobel, Zoom WCAG (R-PT-59) & Hub Multivers du Commandant (PT-81)
              </p>
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

        <div className="mt-4 space-y-3.5 text-xs sm:text-sm">
          {/* PT-31: Blender Post-Processing Quality Presets */}
          <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-100 font-medium">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Qualité Graphique & Pipeline EffectComposer (PT-17 / PT-31 / PT-77)
              </span>
              <span className="text-[10px] font-mono text-amber-300 uppercase">
                {GRAPHICS_PRESET_SPECS[qualityPreset].label} •{' '}
                {isTauriDesktopShell() ? 'Shell Tauri 2.12' : 'Web Canonique'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {qualityPresets.map((presetKey) => {
                const spec = GRAPHICS_PRESET_SPECS[presetKey];
                const isSelected = qualityPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => setQualityPreset(presetKey)}
                    className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-300 bg-amber-400/25 text-amber-50 shadow'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-semibold text-xs block">{spec.label}</span>
                    <span className="text-[10px] text-slate-300/90 block mt-0.5 leading-snug">
                      {spec.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Mouvements réduits (`prefers-reduced-motion` • PT-30)</span>
              </label>

              <label className="flex items-center gap-2 text-sky-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPerfHudOpen}
                  onChange={(e) => setIsPerfHudOpen(e.target.checked)}
                  className="accent-sky-400"
                />
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  HUD Télémétrie GPU (PT-32)
                </span>
              </label>
            </div>
          </div>

          {/* R-PT-59: Exception Accessibilité WCAG — Zoom Caméra hors écran de jeu */}
          <div className="rounded-xl border border-sky-300/30 bg-sky-400/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-sky-100 block text-xs">
                Accessibilité Caméra WCAG (Exception R-PT-59 hors écran de jeu)
              </span>
              <span className="text-[11px] text-slate-300">
                Navigation carte par gestes natifs purs (glisser 1 doigt, pincer/molette, pivoter 2 doigts).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAccessibilityZoom(-6)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-400/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-400/30 transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Zoom +</span>
              </button>
              <button
                type="button"
                onClick={() => handleAccessibilityZoom(6)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-400/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-400/30 transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span>Zoom -</span>
              </button>
            </div>
          </div>

          {/* PT-81: Hub de Graines du Commandant (Partage de Monde & Galerie) */}
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-emerald-100 font-semibold text-xs">
                <Share2 className="w-4 h-4 text-emerald-300" />
                Hub de Graines du Commandant (PT-81 • Code de Monde Déterministe)
              </span>
              <button
                type="button"
                onClick={handlePublishAndCopyShareCode}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-400 text-slate-950 px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Code Copié & Publié' : 'Partager ce monde'}</span>
              </button>
            </div>

            <div className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 font-mono text-[11px] text-emerald-200 break-all">
              {currentShareCode}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={importCodeInput}
                onChange={(e) => setImportCodeInput(e.target.value)}
                placeholder="Coller un code de graine (ex: GXP4:GALAXIA-HELIOS-01:blue_earth:T14:...)"
                className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-xs text-amber-100 focus:border-emerald-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleApplyShareCode(importCodeInput)}
                className="rounded-lg border border-emerald-300/40 bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30 transition cursor-pointer"
              >
                Charger Code
              </button>
            </div>

            {hubFeedback && (
              <p className="text-[11px] font-mono text-emerald-300">{hubFeedback}</p>
            )}

            <div className="pt-1 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-300" />
                Galerie « Mondes du Commandant » ({hubWorlds.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {hubWorlds.slice(0, 3).map((hw) => (
                  <button
                    key={hw.id}
                    type="button"
                    onClick={() => {
                      setWorldName(hw.worldName);
                      handleApplyShareCode(hw.shareCode);
                    }}
                    className="rounded-lg border border-white/10 bg-black/30 hover:bg-white/10 p-2 text-left transition cursor-pointer"
                  >
                    <span className="font-serif font-semibold text-xs text-amber-100 block truncate">
                      {hw.worldName}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-300 block truncate">
                      {hw.seed} • T{hw.turnReached}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {hw.commanderName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seed */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div>
              <span className="font-medium text-slate-200 block">Graine Continentale (Seed)</span>
              <span className="font-mono text-xs text-amber-300">{seed}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const rng = createPRNG(`${seed}_next`);
                const a = Math.floor(100 + rng() * 900);
                const b = Math.floor(10 + rng() * 89);
                setSeed(`GALAXIA-${a}-${b}`);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-300/30 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/30 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nouvelle Graine</span>
            </button>
          </div>

          {/* Relief */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Amplitude du Relief Montagneux</span>
                <span className="font-mono text-amber-300">{reliefScale.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.8}
                step={0.05}
                value={reliefScale}
                onChange={(e) => setReliefScale(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Lighting & Day/Night */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Sun className="w-4 h-4 text-amber-300" />
                Position Solaire ({Math.round(celestialTime * 100)}%)
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCycleTime}
                  onChange={(e) => setAutoCycleTime(e.target.checked)}
                  className="accent-amber-400"
                />
                Cycle auto
              </label>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={celestialTime}
              onChange={(e) => setCelestialTime(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Densité de Brume & Particules Climatiques</span>
                <span className="font-mono text-amber-300">{Math.round(particleDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={particleDensity}
                onChange={(e) => handleDensityChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Weather Override */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium mb-2.5">
              <CloudLightning className="w-4 h-4 text-sky-300" />
              Phénomène Météorologique Actif
            </span>
            <div className="grid grid-cols-2 gap-2">
              {weatherOptions.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleWeatherChange(w.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium border transition cursor-pointer ${
                    activeWeather === w.id
                      ? 'border-sky-300 bg-sky-400/20 text-sky-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};
