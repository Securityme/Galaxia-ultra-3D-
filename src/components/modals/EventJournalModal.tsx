import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { BookOpen, Clock, X } from 'lucide-react';
import { chroniclesAtom, isJournalOpenAtom } from '../../stores/worldStore';
import { GlassPanel } from '../ui/GlassPanel';

export const EventJournalModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isJournalOpenAtom);
  const chronicles = useAtomValue(chroniclesAtom);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-2xl max-h-[82vh] flex flex-col p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-amber-50">
                Grandes Annales de Pax Historia
              </h2>
              <p className="text-xs text-slate-400">
                Chronique historique des décrets, fondations et événements planétaires
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

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {chronicles.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between text-xs font-mono text-amber-300/90">
                <span>AN {1200 + entry.turnNumber * 12} • CYCLE {entry.turnNumber}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
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
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};
