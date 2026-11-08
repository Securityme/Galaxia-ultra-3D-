/**
 * GALAXIA ULTRA • Bio-Dôme de Poche — AI Turn & Semantic Embedding Service (PT-51, PT-53, PT-55, PT-58, PT-78, GEC-01-R)
 * Communicates with the backend Gemini chronicler endpoint, validates payloads via Zod v2,
 * arbitrates narrative rhythm via turnOrchestrator, and fetches server-side semantic embeddings.
 */

import { TurnBatch, turnBatchSchema, WorldBrief } from '../contracts/schemas';
import { generateFallbackEventBatch, FallbackContext } from '../core/fallbackEvents';
import { arbitrateTurnBatch } from '../core/events/turnOrchestrator';
import { computeDeterministicSemanticVector } from '../core/events/semanticMemory';

export interface RequestTurnOptions {
  worldBrief?: WorldBrief;
  fallbackContext: FallbackContext;
}

export async function requestNextHistoricalTurn(
  contextOrOptions: FallbackContext | RequestTurnOptions
): Promise<TurnBatch> {
  const isOptions = 'fallbackContext' in contextOrOptions;
  const fallbackContext = isOptions ? contextOrOptions.fallbackContext : contextOrOptions;
  const worldBrief = isOptions ? contextOrOptions.worldBrief : fallbackContext.worldBrief;

  try {
    const response = await fetch('/api/ai/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldBrief ? { worldBrief, ...fallbackContext } : fallbackContext),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const validation = turnBatchSchema.safeParse(data.event);
    if (validation.success) {
      if (worldBrief) {
        return arbitrateTurnBatch(validation.data, worldBrief).batch;
      }
      return validation.data;
    }
    return generateFallbackEventBatch(fallbackContext);
  } catch {
    return generateFallbackEventBatch(fallbackContext);
  }
}

/**
 * Requests a 48-dim normalized semantic embedding vector from `/api/ai/embed` (PT-78),
 * falling back to deterministic client-side projection if offline.
 */
export async function requestChronicleEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/ai/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return computeDeterministicSemanticVector(text);
    }
    const data = await response.json();
    if (Array.isArray(data.vector) && data.vector.length > 0) {
      return data.vector;
    }
    return computeDeterministicSemanticVector(text);
  } catch {
    return computeDeterministicSemanticVector(text);
  }
}
