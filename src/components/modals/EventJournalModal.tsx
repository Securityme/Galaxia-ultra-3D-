import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { BookOpen, Clock, Fingerprint, Sparkles, X } from 'lucide-react';
import {
  chroniclesAtom,
  isJournalOpenAtom,
  pendingEffectsQueueAtom,
  turnLedgerAtom,
} from '../../stores/worldStore';
import { GlassPanel } from '../ui/GlassPanel';

export const EventJournalModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isJournalOpenAtom);
  const chronicles = useAtomValue(chroniclesAtom);
  const pendingQueue = useAtomValue(pendingEffectsQueueAtom);
  const turnLedger = useAtomValue(turnLedgerAtom);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-3xl max-h-[85vh] flex flex-col p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Grandes Annales du Bio-Dôme de Poche
              </h2>
              <p className="text-xs text-slate-400">
                Chronique historique, mémoire sémantique (PT-78) et registre déterministe d’empreintes (PT-58)
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

        {/* Active Latent Effects Queue (PT-56) */}
        {pendingQueue.length > 0 && (
          <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3 text-xs">
            <div className="font-mono text-[10px] uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Effets Latents en Maturation ({pendingQueue.length})
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pendingQueue.map((item) => (
                <span
                  key={item.id}
                  className="rounded-lg bg-purple-950/60 border border-purple-400/30 px-2.5 py-1 text-[11px] text-purple-100"
                >
                  Échéance Cycle {item.dueTurn} : {item.hint} ({item.originEventTitle})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {chronicles.map((entry) => {
            const matchingLedger = turnLedger.find((l) => l.turnNumber === entry.turnNumber);
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-300/90">
                  <div className="flex items-center gap-2">
                    <span>AN {1200 + entry.turnNumber * 12} • CYCLE {entry.turnNumber}</span>
                    {entry.category && (
                      <span className="rounded bg-amber-400/15 border border-amber-300/30 px-1.5 py-0.5 text-[10px] text-amber-200">
                        {entry.category}
                      </span>
                    )}
                    {entry.embeddingVector && entry.embeddingVector.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.5 text-[10px] text-cyan-200"
                        title="Indexé dans la mémoire vectorielle sémantique du Grand Chroniqueur (PT-78)"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Vecteur PT-78
                      </span>
                    )}
                  </div>
                  {matchingLedger && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-300/90">
                      <Fingerprint className="w-3 h-3" />
                      {matchingLedger.stateFingerprint}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-serif text-base font-semibold text-slate-100">
                  {entry.title}
                </h3>
                <div className="mt-1.5 inline-block rounded-md bg-amber-400/15 border border-amber-300/25 px-2 py-0.5 text-[11px] text-amber-200">
                  Décret : {entry.chosenChoiceLabel}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {entry.narrative}
                </p>
                {entry.mutationsSummary.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {entry.mutationsSummary.map((m, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-sky-200"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
};
