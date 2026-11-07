import React from 'react';
import { useAtom } from 'jotai';
import { Check, Globe2, Map, X } from 'lucide-react';
import { activePresetIdAtom, isPresetsOpenAtom } from '../../stores/worldStore';
import { WORLD_PRESETS } from '../../config/presets';
import { GlassPanel } from '../ui/GlassPanel';

export const SectorPresetsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isPresetsOpenAtom);
  const [activePresetId, setActivePresetId] = useAtom(activePresetIdAtom);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-2xl p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Map className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Biomes & Cartographie Planétaire
              </h2>
              <p className="text-xs text-slate-400">
                Affecte immédiatement les textures HD du Plateau 3D et de la Mappemonde Planétaire 3D
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

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {WORLD_PRESETS.map((preset) => {
            const isSelected = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setActivePresetId(preset.id);
                  setIsOpen(false);
                }}
                className={`text-left rounded-2xl border p-4 transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-300 bg-amber-400/15 shadow-lg'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-base text-amber-50 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-sky-300" />
                    {preset.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-amber-300" />}
                </div>
                <span className="block text-[11px] font-mono text-amber-200/80 mt-0.5">
                  {preset.subtitle}
                </span>

                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  {preset.description}
                </p>

                {/* Biome Color Swatches */}
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.oceanDeepColor }}
                    title="Océan Abyssal"
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.oceanShallowColor }}
                    title="Lagons Côtiers"
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.groundLowColor }}
                    title="Rivages"
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.groundBaseColor }}
                    title="Plaines & Bassins"
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.groundAccentColor }}
                    title="Hauts Plateaux"
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.groundPeakColor }}
                    title="Sommets"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
};
