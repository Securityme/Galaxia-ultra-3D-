import React, { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Activity,
  CheckCircle2,
  FileCode2,
  FolderTree,
  Gamepad2,
  Layers,
  Play,
  X,
} from 'lucide-react';
import {
  isBlueprintModalOpenAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import { runGoldenAcceptanceSimulation } from '../../core/events/turnOrchestrator';
import {
  getActiveKernelBackendInfo,
  verifyDeterministicKernelParity,
} from '../../core/simulation/wasmBridge';
import {
  detectRenderHardwareCapabilities,
  RenderHardwareCapabilities,
} from '../../three/capabilitiesBridge';
import { OPEN_ASSET_REGISTRY } from '../../three/materials/materialManager';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Interactive In-App Blueprint & Architecture Specification Viewer (D1-GU-PT v1.0.0 .. v4.0.0).
 * Includes the live 100-Turn Deterministic Golden Benchmark (PT-58) & TS/WASM Parity Check (PT-74).
 */
export const BlueprintArchitectureModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isBlueprintModalOpenAtom);
  const seed = useAtomValue(worldSeedAtom);

  const [hwCaps, setHwCaps] = useState<RenderHardwareCapabilities | null>(null);
  const [benchResult, setBenchResult] = useState<{
    turnsSimulated: number;
    parityVerified: boolean;
    initialFingerprint: string;
    finalFingerprint: string;
    replayFingerprint: string;
    crisisSharePct: number;
    wasmParityPassed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setHwCaps(detectRenderHardwareCapabilities());
  }, [isOpen]);

  if (!isOpen) return null;

  const kernelInfo = getActiveKernelBackendInfo();

  const handleRunGoldenBenchmark = () => {
    const golden = runGoldenAcceptanceSimulation(seed, 100);
    const wasmParity = verifyDeterministicKernelParity(seed);

    setBenchResult({
      turnsSimulated: golden.turnsSimulated,
      parityVerified: golden.replayDeterministicMatch,
      initialFingerprint: wasmParity.fingerprintA,
      finalFingerprint: golden.initialRunFingerprint,
      replayFingerprint: golden.replayedLedgerFingerprint,
      crisisSharePct: golden.crisisSharePct,
      wasmParityPassed: wasmParity.passed,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6">
      <GlassPanel className="w-full max-w-5xl max-h-[90vh] flex flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-400/15 border border-sky-300/35 flex items-center justify-center text-sky-300">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-amber-50">
                Blueprint Officiel • GALAXIA ULTRA • Bio-Dôme de Poche (D1-GU-PT v4.0.0)
              </h2>
              <p className="text-xs text-slate-400">
                Registre Canonique PT-17 à PT-81 • Noyau Tick-Exact 10 Hz • Couronne de l’Aurore • Pile Puissance Supérieure
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-2 text-xs text-slate-200 leading-relaxed">
          {/* Interactive Golden Test & Parity Suite (PT-58 / PT-74 / PT-76) */}
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-semibold text-emerald-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-300" />
                  Banc d’Essai Déterministe 100 Tours & Parité TS/WASM (PT-58 • PT-74 • PT-76)
                </h3>
                <p className="text-slate-300 mt-0.5">
                  Vérifie en direct le rejeu bit-à-bit sur 100 tours consécutifs et la parité d’empreinte FNV-1a du noyau.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunGoldenBenchmark}
                className="flex items-center gap-2 rounded-xl bg-emerald-400/25 border border-emerald-300/50 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/35 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Exécuter Banc 100 Tours</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
              <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
                <span className="text-slate-400 block">Noyau Simulation (PT-74)</span>
                <span className="text-amber-200 font-semibold">
                  {kernelInfo.backend.toUpperCase()} • {kernelInfo.tickHz} Hz
                </span>
              </div>
              <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
                <span className="text-slate-400 block">Backend Graphique (PT-76)</span>
                <span className="text-sky-200 font-semibold">
                  {hwCaps
                    ? `${hwCaps.activeBackendLabel} (Offscreen: ${
                        hwCaps.offscreenCanvasSupported ? 'OUI' : 'NON'
                      })`
                    : 'Détection...'}
                </span>
              </div>
              <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
                <span className="text-slate-400 block">Cible Déploiement (PT-80)</span>
                <span className="text-purple-200 font-semibold">
                  Web PWA + Tauri 2.12 Ready
                </span>
              </div>
            </div>

            {benchResult && (
              <div className="rounded-xl bg-black/45 border border-emerald-400/40 p-3 font-mono text-[11px] space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-300 font-semibold">
                  <span>
                    ✓ {benchResult.turnsSimulated} Tours Simulés sans erreur • Rejeu Ledger :{' '}
                    {benchResult.parityVerified ? 'IDENTIQUE BIT-À-BIT' : 'ÉCART'}
                  </span>
                  <span>
                    Part Crises : {benchResult.crisisSharePct}% • Parité TS/WASM :{' '}
                    {benchResult.wasmParityPassed ? 'CONFORME' : 'ÉCART'}
                  </span>
                </div>
                <div className="text-slate-300">
                  Empreinte Initiale : <span className="text-amber-200">{benchResult.initialFingerprint}</span> →
                  Empreinte Finale (T100) : <span className="text-emerald-200">{benchResult.finalFingerprint}</span>{' '}
                  (Rejeu : <span className="text-sky-200">{benchResult.replayFingerprint}</span>)
                </div>
              </div>
            )}
          </section>

          {/* 1. Vision UX, Gameplay & Game Loop */}
          <section className="rounded-2xl border border-amber-300/25 bg-amber-400/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-amber-200 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-300" />
              1. Identité Canonique & Invariants (GEC-01-R • GU-14 • GN-01 • R-PT-59)
            </h3>
            <p>
              <strong>Identité Canonique :</strong>{' '}
              <span className="text-amber-300 font-medium">
                GALAXIA ULTRA • Bio-Dôme de Poche
              </span>{' '}
              — Monde-Plateau Spectateur & Chrono-Builder Dynastique 3D.
            </p>
            <p>
              <strong>Navigation Pure Gestuelle (R-PT-59) :</strong> Conformément à l’invariant « Spectateur Pur », le panneau flottant et le clavier directionnel ZQSD/WASD sont supprimés. La carte se pilote exclusivement par gestes directs sur le canevas 3D (glisser 1 doigt, torsion/inclinaison 2 doigts, pincement/molette) et boutons de zoom d’accessibilité WCAG dans le menu Paramètres.
            </p>
          </section>

          {/* 2. Liste Complète des Vagues Intégrées */}
          <section className="rounded-2xl border border-sky-400/25 bg-sky-500/5 p-4 space-y-2.5">
            <h3 className="font-serif text-base font-semibold text-sky-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-300" />
              2. Propositions Ratifiées Intégrées (PT-17 à PT-81)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                'PT-17..PT-32 : Pipeline EffectComposer Niveau Blender, Bloom Sélectif, Sobel 3x3 Normal/Roughness, Eau Gerstner 4 houles (PT-25) & Forêts Instanciées (PT-27).',
                'PT-47..PT-50 : Noyau Simulation 10 Hz déterministe, Registres Diff-Réconciliés O(1), QualityDirector adaptatif à hystérésis et MaterialManager LRU.',
                'PT-51..PT-58 : WorldBrief hiérarchique (~1200 tokens), Économie persistante hybride, Cycle 7 phases, Double Carte Simultanée, Effets Latents dueInTurns, Provenance Causale & Rejeu FNV-1a.',
                'PT-59 (R-PT-59) : Navigation Spectateur Pur 100% gestuelle + Zoom Accessibilité WCAG dans WorldSettingsModal.',
                'PT-60 : Horizon Planétaire « Couronne de l’Aurore » en 4 couches déterministes (H1 Océan R=128, H2 Archipels 16 îles, H3 Cordillère 48 sommets, H4 Nuages & Anneau Orbital).',
                'PT-61 : Ressources Technologiques (rsc_ : energy, alloy, data, parts), Grand Livre à 3 Familles, Monument Hélios Palier IV & Décrets du Codex Solaire.',
                'PT-62 & PT-63 : Registre d’Assets Ouverts CC0 (ast_) et fichier CREDITS.md à la racine.',
                'PT-74..PT-81 (Pile Puissance v4.0.0) : Pont TS/WASM réversible, Détecteur WebGPU/OffscreenCanvas, Mémoire Sémantique Vectorielle Gemini (/api/ai/embed) & Hub des Graines du Commandant (GXP4).',
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-black/30 border border-white/10 p-2.5 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Open Asset Registry (PT-62 / PT-63) */}
          <section className="rounded-2xl border border-purple-400/25 bg-purple-500/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-purple-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-300" />
              3. Registre d’Assets Ouverts CC0 (PT-62 / PT-63)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPEN_ASSET_REGISTRY.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl bg-black/35 border border-white/10 p-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-amber-100">{asset.catalog} — {asset.usage}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {asset.id} • {asset.format} • {Math.round(asset.compressedSizeBytes / 1024)} Ko
                    </div>
                  </div>
                  <span className="rounded bg-purple-400/20 border border-purple-300/35 px-2 py-0.5 text-[10px] font-mono text-purple-200">
                    {asset.license}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Arborescence Granulaire de /src */}
          <section className="rounded-2xl border border-sky-400/25 bg-sky-500/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-sky-200 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-sky-300" />
              4. Arborescence Modulaire Canonique (/src)
            </h3>
            <pre className="rounded-xl bg-black/50 border border-white/10 p-3.5 font-mono text-[11px] text-amber-100 overflow-x-auto leading-relaxed">
{`/src
├── App.tsx                                  # Orchestrateur (WorldBrief PT-51, Gestes R-PT-59)
├── config/
│   ├── constants.ts                         # Constantes (wld_HORIZON_, evt_TICK_HZ, rsc_, cam_GESTURE_)
│   ├── chronicle/imperialConstitution.ts    # Constitution Impériale & Mémoire Sémantique (PT-54/78)
│   └── rpgCatalogs.ts                       # 3 Familles de Ressources, Codex Solaire, Palier IV (PT-61)
├── contracts/
│   └── schemas.ts                           # Contrats Zod v4 (WorldBrief, TurnBatch, Cartes, Vecteurs)
├── core/
│   ├── simulation/
│   │   ├── simulationKernel.ts              # Noyau déterministe 10 Hz & Empreinte FNV-1a (PT-47/58)
│   │   └── wasmBridge.ts                    # Pont réversible TS / Rust-WASM & Parité (PT-74/75)
│   ├── events/
│   │   ├── turnOrchestrator.ts              # Cycle 7 phases, Arbitre de Rythme & Banc 100 Tours (PT-53)
│   │   └── semanticMemory.ts                # Mémoire Vectorielle & Similarité Cosinus (PT-78)
│   └── fallbackEvents.ts                    # 12 Modèles Catégorisés déterministes (PT-55)
├── services/
│   ├── aiTurnService.ts                     # Client /api/ai/turn & /api/ai/embed (PT-54/78)
│   └── seedHubService.ts                    # Hub des Graines GXP4 & Détection Tauri (PT-80/81)
└── three/
    ├── capabilitiesBridge.ts                # Détecteur WebGPU/WebGL2 & Pont OffscreenCanvas (PT-76/77)
    ├── registries/entityRegistries.ts       # Registres Diff-Réconciliés O(1) (PT-48)
    ├── quality/qualityDirector.ts           # Directeur Qualité Adaptatif à Hystérésis (PT-49)
    ├── materials/materialManager.ts         # Cache Matériaux LRU & Registre CC0 (PT-50/62)
    └── world/
        ├── horizonCrown.ts                  # Couronne de l'Aurore H1..H4 (PT-60)
        ├── gerstnerWater.ts                 # Eau Analytique Gerstner 4 Houles (PT-25)
        └── instancedForests.ts              # Forêts Instanciées & Chablis par biome (PT-27)`}
            </pre>
          </section>
        </div>
      </GlassPanel>
    </div>
  );
};
