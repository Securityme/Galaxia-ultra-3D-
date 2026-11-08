/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * PT-78 — Mémoire Sémantique du Grand Chroniqueur
 * Computes and compares semantic embeddings (server-side Gemini embeddings with deterministic
 * lexical-trigram vector fallback) via cosine similarity so distant historical turns
 * can resurface when contextually relevant (e.g. Turn 4 haunting Turn 60).
 */

import { ChronicleEntry, TurnLedgerRecord } from '../../contracts/schemas';

export const SEMANTIC_VECTOR_DIM = 48;

export interface SemanticMemoryMatch {
  turn: number;
  title: string;
  chosenLabel: string;
  category?: string;
  similarityScore: number;
  excerpt: string;
}

/**
 * Generates a deterministic normalized 48-dimensional semantic vector from French chronicle text.
 * Used both as an instant client-side vector and as the deterministic fallback when server
 * embeddings are offline, guaranteeing GU-14 determinism.
 */
export function computeDeterministicSemanticVector(text: string): number[] {
  const vec = new Array<number>(SEMANTIC_VECTOR_DIM).fill(0);
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  if (!normalized) {
    vec[0] = 1;
    return vec;
  }

  // Domain semantic anchors for planetary bio-dome themes
  const semanticThemes: string[][] = [
    ['energie', 'helios', 'relais', 'plasma', 'solaire', 'surcharge', 'pylone'],
    ['biosphere', 'biodome', 'flore', 'serre', 'biomasse', 'botanique', 'eau'],
    ['savoir', 'observatoire', 'axiome', 'science', 'astre', 'etoile', 'calcul'],
    ['politique', 'maison', 'senat', 'souverain', 'decret', 'concorde', 'loyaute'],
    ['crise', 'tempete', 'faille', 'orage', 'alerte', 'penurie', 'instabilite'],
    ['exploration', 'ruine', 'sonde', 'monolithe', 'horizon', 'couronne', 'lune'],
    ['industrie', 'alliage', 'marbre', 'basalte', 'cristal', 'forge', 'nanocomposant'],
    ['diplomatie', 'convoi', 'flotte', 'ambassade', 'pacte', 'influence', 'commerce'],
  ];

  const words = normalized.split(/\s+/);

  for (const word of words) {
    if (word.length < 2) continue;

    semanticThemes.forEach((keywords, themeIdx) => {
      if (keywords.some((kw) => word.includes(kw) || kw.includes(word))) {
        vec[themeIdx] += 2.2;
      }
    });

    for (let i = 0; i <= Math.max(0, word.length - 3); i++) {
      const trigram = word.slice(i, i + 3);
      let h = 2166136261;
      for (let c = 0; c < trigram.length; c++) {
        h ^= trigram.charCodeAt(c);
        h = Math.imul(h, 16777619);
      }
      const bucket = 8 + (Math.abs(h) % (SEMANTIC_VECTOR_DIM - 8));
      vec[bucket] += 1.0;
    }
  }

  return normalizeVector(vec);
}

/**
 * Normalizes any numeric vector (including 768-dim or 3072-dim server embeddings projected to 48-dim)
 * to unit L2 norm.
 */
export function normalizeVector(raw: number[]): number[] {
  const projected = new Array<number>(SEMANTIC_VECTOR_DIM).fill(0);
  for (let i = 0; i < raw.length; i++) {
    projected[i % SEMANTIC_VECTOR_DIM] += raw[i];
  }
  let sumSq = 0;
  for (let i = 0; i < SEMANTIC_VECTOR_DIM; i++) {
    sumSq += projected[i] * projected[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  return projected.map((v) => Number((v / norm).toFixed(5)));
}

/**
 * Computes cosine similarity in [-1, 1] between two normalized vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-9) return 0;
  return Number((dot / denom).toFixed(4));
}

/**
 * Retrieves the top-K (default 3) most semantically similar historical memories
 * from the Chronicle & Ledger via cosine similarity (PT-78).
 */
export function recallSemanticMemories(
  queryContextText: string,
  chronicles: ChronicleEntry[],
  ledgerRecords: TurnLedgerRecord[] = [],
  topK = 3
): SemanticMemoryMatch[] {
  const queryVec = computeDeterministicSemanticVector(queryContextText);

  const ledgerEmbeddingMap = new Map<number, number[]>();
  for (const rec of ledgerRecords) {
    if (rec.embeddingVector && rec.embeddingVector.length > 0) {
      ledgerEmbeddingMap.set(rec.turnNumber, normalizeVector(rec.embeddingVector));
    }
  }

  const scored: SemanticMemoryMatch[] = chronicles.map((entry) => {
    const candidateText = `${entry.title} ${entry.narrative} ${entry.chosenChoiceLabel}`;
    const entryVec =
      ledgerEmbeddingMap.get(entry.turnNumber) ??
      computeDeterministicSemanticVector(candidateText);
    const similarityScore = cosineSimilarity(queryVec, entryVec);

    return {
      turn: entry.turnNumber,
      title: entry.title.slice(0, 90),
      chosenLabel: entry.chosenChoiceLabel.slice(0, 80),
      category: entry.category,
      similarityScore,
      excerpt: entry.narrative.slice(0, 140),
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.similarityScore - a.similarityScore) > 0.01) {
      return b.similarityScore - a.similarityScore;
    }
    return a.turn - b.turn;
  });

  return scored.slice(0, topK);
}
