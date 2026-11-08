import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  CloudFog,
  CloudRain,
  Crown,
  Flame,
  GraduationCap,
  Heart,
  Leaf,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import {
  activePresetAtom,
  activeWeatherTypeAtom,
  activeZoneDefAtom,
  buildingsAtom,
  celestialTimeAtom,
  civilizationStatsAtom,
  isBootScreenOpenAtom,
  isColonistAssignmentOpenAtom,
  isHeaderResourcesOpenAtom,
  isPerfHudOpenAtom,
  npcsAtom,
  renderPerfMetricsAtom,
  selectedResourceLedgerKeyAtom,
  turnNumberAtom,
  worldNameAtom,
} from '../../stores/worldStore';
import {
  WeatherType,
  wtr_AURORA_CURTAIN,
  wtr_ELECTRICAL_STORM,
  wtr_LIGHT_RAIN,
  wtr_MIST,
  wtr_SOLAR_FLARE,
  wtr_STARDUST_DRIFT,
} from '../../config/constants';
import {
  getCelestialPhaseInfo,
  getWeatherDisplayInfo,
} from '../../core/sandbox/sandboxProgression';
import { ResourceKey } from '../../config/rpgCatalogs';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Top HUD:
 * - Top-Left Unified Bar: Plateau Title pill, followed immediately by the Date/Weather Telemetry dial and the docked Resources & Demographics Header.
 */
export const TopTelemetryBar: React.FC = () => {
  const worldName = useAtomValue(worldNameAtom);
  const preset = useAtomValue(activePresetAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const buildings = useAtomValue(buildingsAtom);
  const npcs = useAtomValue(npcsAtom);
  const civStats = useAtomValue(civilizationStatsAtom);
  const turn = useAtomValue(turnNumberAtom);
  const celestialTime = useAtomValue(celestialTimeAtom);
  const activeWeather = useAtomValue(activeWeatherTypeAtom);
  const isPerfHudOpen = useAtomValue(isPerfHudOpenAtom);
  const perfMetrics = useAtomValue(renderPerfMetricsAtom);

  const [isResourcesOpen, setIsResourcesOpen] = useAtom(isHeaderResourcesOpenAtom);
  const [selectedLedgerKey, setSelectedLedgerKey] = useAtom(selectedResourceLedgerKeyAtom);
  const setIsColonistAssignmentOpen = useSetAtom(isColonistAssignmentOpenAtom);
  const setIsBootScreenOpen = useSetAtom(isBootScreenOpenAtom);

  const celestialInfo = getCelestialPhaseInfo(celestialTime);
  const weatherInfo = getWeatherDisplayInfo(activeWeather);

  const handleOpenResourceLedger = (key: ResourceKey) => {
    setSelectedLedgerKey((prev) => (prev === key ? null : key));
  };

  const formatDelta = (net: number) => (net >= 0 ? `+${net}` : `${net}`);

  const renderCelestialIcon = (phase: 'dawn' | 'noon' | 'dusk' | 'night') => {
    switch (phase) {
      case 'dawn':
        return <Sunrise className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case 'noon':
        return <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'dusk':
        return <Sunset className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case 'night':
        return <Moon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />;
    }
  };

  const renderWeatherIcon = (weather: WeatherType) => {
    switch (weather) {
      case wtr_LIGHT_RAIN:
        return <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case wtr_MIST:
        return <CloudFog className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
      case wtr_AURORA_CURTAIN:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case wtr_ELECTRICAL_STORM:
        return <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case wtr_SOLAR_FLARE:
        return <Sun className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case wtr_STARDUST_DRIFT:
        return <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-2.5 pt-2 sm:px-4 sm:pt-3">
      <div className="w-full flex items-start justify-between gap-2">
        {/* TOP-LEFT UNIFIED DOCKED BAR: Plateau Title + Date/Weather Dial + Glued Resource Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Plateau Title Pill */}
          <GlassPanel
            disableWindowControls
            className="pointer-events-auto px-2.5 py-1 flex items-center gap-2 rounded-xl border-amber-300/25 shadow-md"
          >
            <button
              type="button"
              onClick={() => setIsBootScreenOpen(true)}
              title="Ouvrir le Menu Principal Impérial"
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 group-hover:bg-amber-400/30 transition shrink-0">
                <Crown className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-serif font-semibold text-amber-50 tracking-tight truncate max-w-[115px] sm:max-w-[170px]">
                  {activeZone.name}
                </span>
                <span className="hidden md:inline text-slate-500">·</span>
                <span className="hidden md:inline text-[10px] font-mono text-sky-300">
                  {preset.name}
                </span>
              </div>
            </button>
          </GlassPanel>

          {/* 2. Date & Weather Telemetry Dial */}
          <GlassPanel
            disableWindowControls
            className="pointer-events-auto px-2.5 py-1 flex items-center gap-1.5 sm:gap-2 rounded-xl border-white/10 bg-black/55 text-[10px] font-mono text-slate-200 shadow-sm"
          >
            <span
              className="flex items-center gap-1 text-amber-200"
              title={`An Impérial ${civStats.imperialYear} · Tour ${turn}`}
            >
              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-medium">An {civStats.imperialYear}</span>
              <span className="text-amber-400/75 text-[9px]">(T{turn})</span>
            </span>

            <span className="text-white/20">|</span>

            <span
              className="flex items-center gap-1 text-sky-200"
              title={celestialInfo.description}
            >
              {renderCelestialIcon(celestialInfo.phase)}
              <span className="tabular-nums font-semibold">{celestialInfo.hourFormatted}</span>
            </span>

            <span className="text-white/20">|</span>

            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 border"
              style={{
                borderColor: weatherInfo.badgeColor + '40',
                backgroundColor: weatherInfo.badgeColor + '15',
                color: weatherInfo.badgeColor,
              }}
              title={weatherInfo.description}
            >
              {renderWeatherIcon(activeWeather)}
              <span className="truncate max-w-[75px] sm:max-w-none">{weatherInfo.label}</span>
            </span>
          </GlassPanel>

          {/* 3. Glued Resource & Demographics Header (Docked directly right without floating window) */}
          <GlassPanel
            disableWindowControls
            className="pointer-events-auto px-2 py-1.5 sm:px-3 sm:py-1.5 border-amber-300/25 max-w-[95vw] sm:max-w-xl rounded-xl bg-black/60 shadow-md"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[11px]">
                {/* 1. SECTION RESSOURCES ÉCONOMIQUES & IMPÉRIALES */}
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.03] p-0.5 rounded-lg border border-white/10">
                  <span className="hidden xl:inline text-[9px] uppercase tracking-wider font-mono text-amber-300/80 px-1 font-semibold">
                    Éco.
                  </span>

                  {/* Stabilité */}
                  <button
                    type="button"
                    onClick={() => handleOpenResourceLedger('stability')}
                    className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition cursor-pointer ${
                      selectedLedgerKey === 'stability'
                        ? 'border-emerald-300 bg-emerald-400/20'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1]'
                    }`}
                    title="Stabilité Impériale (cliquez pour le Grand-Livre)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums text-[10px]">
                      {civStats.stability}%
                    </span>
                    {isResourcesOpen && (
                      <span className="text-[9px] font-mono text-emerald-200/90 bg-emerald-500/15 px-1 rounded tabular-nums">
                        {formatDelta(civStats.economy.ledgers.stability.netRatePerTurn)}
                      </span>
                    )}
                  </button>

                  {/* Prospérité */}
                  <button
                    type="button"
                    onClick={() => handleOpenResourceLedger('prosperity')}
                    className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition cursor-pointer ${
                      selectedLedgerKey === 'prosperity'
                        ? 'border-amber-300 bg-amber-400/20'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1]'
                    }`}
                    title="Prospérité (cliquez pour le Grand-Livre)"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono font-semibold text-amber-300 tabular-nums text-[10px]">
                      {civStats.prosperity}%
                    </span>
                    {isResourcesOpen && (
                      <span className="text-[9px] font-mono text-amber-200/90 bg-amber-500/15 px-1 rounded tabular-nums">
                        {formatDelta(civStats.economy.ledgers.prosperity.netRatePerTurn)}
                      </span>
                    )}
                  </button>

                  {/* Savoir & Influence (expanded) */}
                  {isResourcesOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenResourceLedger('knowledge')}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition cursor-pointer ${
                          selectedLedgerKey === 'knowledge'
                            ? 'border-sky-300 bg-sky-400/20'
                            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1]'
                        }`}
                        title="Savoir Scientifique"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-mono font-semibold text-sky-300 tabular-nums text-[10px]">
                          {civStats.knowledge}%
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenResourceLedger('influence')}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition cursor-pointer ${
                          selectedLedgerKey === 'influence'
                            ? 'border-purple-300 bg-purple-400/20'
                            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1]'
                        }`}
                        title="Influence Dynastique"
                      >
                        <Scale className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-mono font-semibold text-purple-300 tabular-nums text-[10px]">
                          {civStats.influence}%
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {/* SÉPARATION */}
                <div className="w-px h-4 bg-amber-300/40 shrink-0 mx-0.5" />

                {/* 2. SECTION JAUGES CITOYENNES */}
                <div className="flex items-center gap-1 bg-sky-950/30 p-0.5 rounded-lg border border-sky-400/25">
                  <button
                    type="button"
                    onClick={() => handleOpenResourceLedger('stability')}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-pink-400/35 bg-pink-500/15 text-pink-200 transition cursor-pointer"
                    title={`Bonheur Citoyen : ${civStats.demographics.happiness}%`}
                  >
                    <Heart className="w-3 h-3 text-pink-400 fill-pink-400/35 shrink-0" />
                    <span className="font-mono font-semibold text-pink-100 tabular-nums text-[10px]">
                      {civStats.demographics.happiness}%
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsColonistAssignmentOpen(true)}
                    className="flex items-center gap-1 rounded-md border border-sky-300/40 bg-sky-400/20 hover:bg-sky-400/30 px-1.5 py-0.5 text-sky-100 font-mono text-[10px] transition cursor-pointer"
                    title="Affecter les colons"
                  >
                    <Users className="w-3 h-3 text-sky-300 shrink-0" />
                    <span className="tabular-nums font-semibold">{npcs.length}</span>
                  </button>
                </div>

                {/* Toggle Collapse/Expand */}
                <button
                  type="button"
                  onClick={() => setIsResourcesOpen((prev) => !prev)}
                  className="p-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer ml-0.5"
                  title={isResourcesOpen ? 'Réduire' : 'Déployer'}
                >
                  {isResourcesOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>
              </div>

              {civStats.demographics.activeCrisis && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[9px] font-mono text-rose-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-300 shrink-0" />
                  <span className="truncate">{civStats.demographics.activeCrisis}</span>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Optional GPU Perf Pill on Far Right */}
        {isPerfHudOpen && (
          <GlassPanel
            disableWindowControls
            className="pointer-events-auto px-2.5 py-1 hidden lg:flex items-center gap-2 text-[10px] font-mono text-sky-200 border-sky-300/30 rounded-xl"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{perfMetrics.fps} FPS</span>
            <span className="text-slate-500">·</span>
            <span>{perfMetrics.frameTimeMs} ms</span>
          </GlassPanel>
        )}
      </div>
    </header>
  );
};
export default TopTelemetryBar;
