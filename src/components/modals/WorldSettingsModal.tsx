import React from 'react';
import { useAtom } from 'jotai';
import { CloudLightning, RefreshCw, Settings2, Sun, X } from 'lucide-react';
import {
  ambienceOverrideAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  isSettingsOpenAtom,
  reliefScaleAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import {
  WeatherType,
  wtr_CALM,
  wtr_STARDUST_DRIFT,
  wtr_ELECTRICAL_STORM,
  wtr_AURORA_CURTAIN,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

export const WorldSettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isSettingsOpenAtom);
  const [seed, setSeed] = useAtom(worldSeedAtom);
  const [reliefScale, setReliefScale] = useAtom(reliefScaleAtom);
  const [celestialTime, setCelestialTime] = useAtom(celestialTimeAtom);
  const [autoCycleTime, setAutoCycleTime] = useAtom(celestialAutoCycleAtom);
  const [ambience, setAmbience] = useAtom(ambienceOverrideAtom);

  if (!isOpen) return null;

  const activeWeather = ambience?.weatherEffect ?? wtr_CALM;
  const particleDensity = ambience?.particleDensity ?? 0.5;

  const weatherOptions: { id: WeatherType; label: string }[] = [
    { id: wtr_CALM, label: 'Clair & Serein' },
    { id: wtr_STARDUST_DRIFT, label: 'Brume Dorée' },
    { id: wtr_ELECTRICAL_STORM, label: 'Orage Électrique' },
    { id: wtr_AURORA_CURTAIN, label: 'Aurore Boréale' },
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Topographie, Climat & Cycle Céleste
              </h2>
              <p className="text-xs text-slate-400">
                Paramètres géométriques et atmosphériques temps réel
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

        <div className="mt-5 space-y-4 text-xs sm:text-sm">
          {/* Seed */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div>
              <span className="font-medium text-slate-200 block">Graine Continentale (Seed)</span>
              <span className="font-mono text-xs text-amber-300">{seed}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSeed(`PAX-${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 89)}`)
              }
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
                <span className="text-slate-300">Densité de Brume Atmosphérique</span>
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
