/**
 * PAX HISTORIA 3D • AI Turn Service
 * Communicates with the backend Gemini chronicler endpoint and validates payloads via Zod.
 */

import { TurnBatch, turnBatchSchema } from '../contracts/schemas';
import { generateFallbackEventBatch, FallbackContext } from '../core/fallbackEvents';

export async function requestNextHistoricalTurn(context: FallbackContext): Promise<TurnBatch> {
  try {
    const response = await fetch('/api/ai/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const validation = turnBatchSchema.safeParse(data.event);
    if (validation.success) {
      return validation.data;
    }
    return generateFallbackEventBatch(context);
  } catch {
    return generateFallbackEventBatch(context);
  }
}
