import React, { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  Link2,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  activePresetIdAtom,
  ambienceOverrideAtom,
  buildingsAtom,
  celestialAutoCycleAtom,
  celestialTimeAtom,
  chroniclesAtom,
  civilizationStatsAtom,
  currentTurnEventAtom,
  npcsAtom,
  pendingEffectsQueueAtom,
  reliefScaleAtom,
  resourceStocksAtom,
  selectedBuildingIdAtom,
  selectedNpcIdAtom,
  simulationTickAtom,
  turnLedgerAtom,
  turnNumberAtom,
  worldNameAtom,
  worldSeedAtom,
} from '../../stores/worldStore';
import {
  Mutation,
  NarrativeEventV2,
  PendingEffect,
  TurnChoice,
} from '../../contracts/schemas';
import { ExtendedResourceKey, RESOURCE_METADATA_CATALOG } from '../../config/rpgCatalogs';
import {
  applyMutations,
  computeStateFingerprint,
  SimulationWorldState,
} from '../../core/simulation/simulationKernel';
import { requestChronicleEmbedding } from '../../services/aiTurnService';
import { AUTO_SAVE_SLOT_ID, saveGameToSlot } from '../../services/saveService';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Interactive GALAXIA ULTRA • Bio-Dôme de Poche Imperial Council Modal (PT-53 / PT-56 / PT-57 / PT-78).
 * - High-legibility typography (Plus Jakarta Sans + Outfit) for effortless reading on mobile & desktop.
 * - Real-time Turn Impact Summary showing combined economic deltas and 3D world mutations.
 * - Auto-highlights newly built 3D edifices or spawned colonists upon ratification.
 */
export const EventDialog: React.FC = () => {
  const [turnEvent, setTurnEvent] = useAtom(currentTurnEventAtom);
  const [buildings, setBuildings] = useAtom(buildingsAtom);
  const [npcs, setNpcs] = useAtom(npcsAtom);
  const [chronicles, setChronicles] = useAtom(chroniclesAtom);
  const [turnNumber, setTurnNumber] = useAtom(turnNumberAtom);
  const [tickIndex, setTickIndex] = useAtom(simulationTickAtom);
  const [stocks, setStocks] = useAtom(resourceStocksAtom);
  const [pendingQueue, setPendingQueue] = useAtom(pendingEffectsQueueAtom);
  const [turnLedger, setTurnLedger] = useAtom(turnLedgerAtom);
  const [ambience, setAmbience] = useAtom(ambienceOverrideAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);

  const civStats = useAtomValue(civilizationStatsAtom);
  const worldName = useAtomValue(worldNameAtom);
  const seed = useAtomValue(worldSeedAtom);
  const presetId = useAtomValue(activePresetIdAtom);
  const reliefScale = useAtomValue(reliefScaleAtom);
  const celestialTime = useAtomValue(celestialTimeAtom);
  const autoCycleTime = useAtomValue(celestialAutoCycleAtom);

  const [selectedChoiceByCard, setSelectedChoiceByCard] = useState<Record<string, string>>({});
  const [isCommitting, setIsCommitting] = useState(false);

  if (!turnEvent) return null;

  const cards: NarrativeEventV2[] =
    turnEvent.events && turnEvent.events.length > 0
      ? turnEvent.events
      : [
          {
            id: `evt_card_${turnNumber + 1}_0`,
            category: turnEvent.category ?? 'FONDATION',
            threadId: turnEvent.threadId,
            title: turnEvent.title,
            narrative: turnEvent.narrative,
            choices: turnEvent.choices,
          },
        ];

  const getActiveChoiceForCard = (card: NarrativeEventV2): TurnChoice => {
    const chosenId = selectedChoiceByCard[card.id];
    return card.choices.find((c) => c.id === chosenId) ?? card.choices[0];
  };

  // Compute combined economic & 3D impact preview of currently selected choices
  const combinedPreviewDeltas: Record<string, number> = {};
  let newBuildingsCount = 0;
  let newColonistsCount = 0;

  cards.forEach((card) => {
    const ch = getActiveChoiceForCard(card);
    (ch.economicEffects ?? []).forEach((eff) => {
      combinedPreviewDeltas[eff.resource] =
        (combinedPreviewDeltas[eff.resource] ?? 0) + eff.delta;
    });
    ch.mutations.forEach((m) => {
      if (m.type === 'BUILD') newBuildingsCount++;
      if (m.type === 'SPAWN_NPC') newColonistsCount++;
    });
  });

  const handleFocusCausalRef = (entityId: string) => {
    const foundBld = buildings.find((b) => b.id === entityId || b.name.includes(entityId));
    if (foundBld) {
      setSelectedNpcId(null);
      setSelectedBuildingId(foundBld.id);
      return;
    }
    const foundNpc = npcs.find((n) => n.id === entityId || n.name.includes(entityId));
    if (foundNpc) {
      setSelectedBuildingId(null);
      setSelectedNpcId(foundNpc.id);
    }
  };

  const handleCommitCouncilDecrees = async () => {
    if (isCommitting) return;
    setIsCommitting(true);

    try {
      const prevBuildingIds = new Set(buildings.map((b) => b.id));
      const prevNpcIds = new Set(npcs.map((n) => n.id));

      const currentState: SimulationWorldState = {
        seed,
        turnNumber,
        tickIndex,
        celestialTime,
        autoCycleTime,
        buildings,
        npcs,
        resourceStocks: stocks,
        netRatesPerTurn: civStats.netRatesAll,
        pendingEffects: pendingQueue,
        ambience,
        chronicles,
      };

      const selectedChoices = cards.map((card) => ({
        event: card,
        choice: getActiveChoiceForCard(card),
      }));

      // Phase 6 RESOLVE: Apply per-turn yields, selected choices, and mature dueInTurns effects
      const { nextState } = applyMutations(currentState, {
        events: cards,
        selectedChoices,
      });

      // PT-78: Compute semantic embedding for the new turn's primary chronicle entry
      const primaryPair = selectedChoices[0];
      const embeddingText = `${primaryPair.event.category} ${primaryPair.event.title}: ${primaryPair.event.narrative} -> ${primaryPair.choice.label}`;
      const embeddingVector = await requestChronicleEmbedding(embeddingText);

      const enrichedChronicles = nextState.chronicles.map((c, idx) =>
        idx === 0 ? { ...c, embeddingVector } : c
      );

      // Phase 7 ARCHIVE: Compute deterministic stateFingerprint (PT-58)
      const fingerprint = computeStateFingerprint(nextState);

      const newLedgerRecord = {
        turnNumber: nextState.turnNumber,
        tickIndex: nextState.tickIndex,
        seed: nextState.seed,
        events: cards,
        chosenChoiceIds: selectedChoices.map((sc) => sc.choice.id),
        resultingImperialResources: {
          stability: nextState.resourceStocks.stability,
          prosperity: nextState.resourceStocks.prosperity,
          knowledge: nextState.resourceStocks.knowledge,
          influence: nextState.resourceStocks.influence,
        },
        stateFingerprint: fingerprint,
        embeddingVector,
      };

      const nextLedger = [...turnLedger, newLedgerRecord];

      setBuildings(nextState.buildings);
      setNpcs(nextState.npcs);
      setStocks(nextState.resourceStocks);
      setPendingQueue(nextState.pendingEffects);
      setAmbience(nextState.ambience);
      setTurnNumber(nextState.turnNumber);
      setTickIndex(nextState.tickIndex);
      setChronicles(enrichedChronicles);
      setTurnLedger(nextLedger);
      setSelectedChoiceByCard({});
      setTurnEvent(null);

      // Gameloop UX coherence: if a new building or colonist was created on the 3D plateau, highlight it
      const newlyAddedBuilding = nextState.buildings.find((b) => !prevBuildingIds.has(b.id));
      const newlyAddedNpc = nextState.npcs.find((n) => !prevNpcIds.has(n.id));
      if (newlyAddedBuilding) {
        setSelectedNpcId(null);
        setSelectedBuildingId(newlyAddedBuilding.id);
      } else if (newlyAddedNpc) {
        setSelectedBuildingId(null);
        setSelectedNpcId(newlyAddedNpc.id);
      }

      // Deterministic logical timestamp for save slot
      saveGameToSlot({
        slotId: AUTO_SAVE_SLOT_ID,
        label: 'Sauvegarde Automatique',
        savedAt: 1700000000000 + nextState.turnNumber * 60000,
        config: {
          worldName,
          seed,
          presetId,
          reliefScale,
          initialCrewCount: Math.max(1, Math.min(8, nextState.npcs.length)),
          autoCycleTime,
          weatherDynamic: true,
        },
        turnNumber: nextState.turnNumber,
        celestialTime,
        buildings: nextState.buildings,
        npcs: nextState.npcs,
        chronicles: enrichedChronicles,
        ledger: nextLedger,
        pendingEffects: nextState.pendingEffects,
        resourceStocks: nextState.resourceStocks,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-2.5 sm:p-5">
      <GlassPanel
        windowId="imperial-council-event-dialog"
        className="w-full max-w-4xl max-h-[90dvh] flex flex-col p-4 sm:p-6 border-amber-300/40"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider font-semibold">
                Conseil Impérial · Tour {turnNumber + 1} · {cards.length}{' '}
                {cards.length > 1 ? 'Événements' : 'Événement'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Sélectionnez votre décision pour façonner l’économie et le plateau 3D.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTurnEvent(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fermer temporairement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simultaneous Event Cards Grid (1 or 2 cards) */}
        <div
          className={`mt-3.5 flex-1 overflow-y-auto grid gap-4 pr-1 ${
            cards.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {cards.map((card, idx) => {
            const activeChoice = getActiveChoiceForCard(card);
            const cardCausalRefs = Array.from(
              new Set(card.choices.flatMap((ch) => ch.causalRefs ?? []))
            );
            return (
              <div
                key={card.id || idx}
                className="rounded-2xl border border-white/15 bg-[#060d1b]/90 p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg bg-amber-400/15 border border-amber-300/35 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-amber-200 font-medium">
                      {card.category} · {turnEvent.sectorCode}
                    </span>
                    {cardCausalRefs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cardCausalRefs.map((refId: string) => (
                          <button
                            key={refId}
                            type="button"
                            onClick={() => handleFocusCausalRef(refId)}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 text-[11px] font-mono text-sky-200 hover:bg-sky-500/25 transition cursor-pointer"
                            title="Inspecter l'entité référencée sur le plateau 3D"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>{refId}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                    {card.title}
                  </h3>

                  {/* High-legibility narrative box */}
                  <p className="text-sm sm:text-[15px] text-slate-100 leading-relaxed bg-[#030711]/90 border border-white/10 rounded-xl p-3.5 sm:p-4 font-normal">
                    {card.narrative}
                  </p>
                </div>

                {/* Choices for this Card */}
                <div className="space-y-2.5">
                  {card.choices.map((choice: TurnChoice) => {
                    const isSelected = activeChoice.id === choice.id;
                    const econEntries = choice.economicEffects ?? [];
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() =>
                          setSelectedChoiceByCard((prev) => ({
                            ...prev,
                            [card.id]: choice.id,
                          }))
                        }
                        className={`w-full text-left rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-300 bg-amber-400/15 shadow-[0_0_24px_rgba(251,191,36,0.18)]'
                            : 'border-white/12 bg-white/[0.04] hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span className="font-semibold text-sm sm:text-[15px] text-amber-50 leading-snug">
                              {choice.label}
                            </span>
                          </div>
                          <Sparkles
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isSelected ? 'text-amber-300' : 'text-slate-600'
                            }`}
                          />
                        </div>

                        <p className="mt-1.5 pl-6 text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {choice.summary}
                        </p>

                        {/* Economic deltas & Pending latent effects badges */}
                        {(econEntries.length > 0 ||
                          (choice.pendingEffects && choice.pendingEffects.length > 0) ||
                          choice.mutations.length > 0) && (
                          <div className="mt-2.5 pl-6 flex flex-wrap gap-1.5">
                            {econEntries.map((eff, eIdx) => {
                              const meta =
                                RESOURCE_METADATA_CATALOG[eff.resource as ExtendedResourceKey];
                              return (
                                <span
                                  key={`${eff.resource}_${eIdx}`}
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium border ${
                                    eff.delta >= 0
                                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                      : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                                  }`}
                                >
                                  {meta?.shortLabel ?? eff.resource}{' '}
                                  {eff.delta >= 0 ? `+${eff.delta}` : eff.delta}
                                </span>
                              );
                            })}

                            {choice.mutations.map((m: Mutation, mIdx: number) => (
                              <span
                                key={mIdx}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 text-[11px] font-mono font-medium text-sky-100"
                              >
                                {m.type === 'BUILD' ? (
                                  <Building2 className="w-3 h-3 text-sky-300" />
                                ) : m.type === 'SPAWN_NPC' ? (
                                  <Users className="w-3 h-3 text-sky-300" />
                                ) : null}
                                {m.type === 'BUILD'
                                  ? `Bâtir : ${m.name}`
                                  : m.type === 'SPAWN_NPC'
                                  ? `Nouveau Colon : ${m.name}`
                                  : `Climat : ${m.weatherEffect ?? m.eventNote}`}
                              </span>
                            ))}

                            {choice.pendingEffects?.map((pe: PendingEffect, pIdx: number) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[11px] font-mono text-purple-200"
                              >
                                <Clock className="w-3 h-3" />
                                Dans {pe.dueInTurns}t : {pe.hint}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Commit & Real-time Impact Preview */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 mr-1">Bilan immédiat :</span>
            {Object.entries(combinedPreviewDeltas).map(([resKey, delta]) => {
              if (delta === 0) return null;
              const meta = RESOURCE_METADATA_CATALOG[resKey as ExtendedResourceKey];
              return (
                <span
                  key={resKey}
                  className={`rounded-md px-2 py-0.5 text-[11px] border ${
                    delta > 0
                      ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                      : 'border-rose-400/35 bg-rose-500/15 text-rose-200'
                  }`}
                >
                  {meta?.shortLabel ?? resKey} {delta > 0 ? `+${delta}` : delta}
                </span>
              );
            })}
            {newBuildingsCount > 0 && (
              <span className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">
                +{newBuildingsCount} Édifice 3D
              </span>
            )}
            {newColonistsCount > 0 && (
              <span className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">
                +{newColonistsCount} Colon 3D
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isCommitting}
            onClick={handleCommitCouncilDecrees}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isCommitting
                ? 'Application en cours...'
                : `Promulguer & Appliquer au Monde 3D`}
            </span>
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
