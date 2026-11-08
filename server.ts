/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * Full-Stack Server Entry Point providing server-side Gemini LLM historical chronicle turns
 * enriched with the canonical WorldBrief payload (PT-51), Imperial Constitution (PT-54),
 * 1x automatic Zod repair retry, session rate-limiting, 12-template fallback (PT-58, GEC-01-R),
 * and server-side Semantic Chronicle Embeddings (PT-78).
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import {
  turnBatchSchema,
  worldBriefSchema,
  WorldBrief,
} from './src/contracts/schemas';
import {
  generateFallbackEventBatch,
  FallbackContext,
} from './src/core/fallbackEvents';
import {
  buildSystemConstitutionPrompt,
  formatWorldBriefForPrompt,
  CHRONICLE_CONSTITUTION_VERSION,
} from './src/config/chronicle/imperialConstitution';
import { arbitrateTurnBatch } from './src/core/events/turnOrchestrator';
import {
  computeDeterministicSemanticVector,
  normalizeVector,
} from './src/core/events/semanticMemory';
import { rsc_ALL_TYPES } from './src/config/constants';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '512kb' }));

// Initialize GoogleGenAI SDK on server side only
const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
const apiKey = rawApiKey !== '' && rawApiKey !== 'MY_GEMINI_API_KEY' ? rawApiKey : '';
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Per-session rate-limit memory guard (PT-58)
const sessionLastCallMap = new Map<string, number>();
const MIN_SESSION_INTERVAL_MS = 650;

/**
 * Normalizes an incoming request body into both a canonical WorldBrief (PT-51)
 * and a FallbackContext so both structured WorldBrief and flat calls work seamlessly.
 */
function normalizeBriefAndFallback(body: Record<string, unknown>): {
  brief: WorldBrief;
  fallbackCtx: FallbackContext;
} {
  const candidate = (body.worldBrief ?? body) as unknown;
  const parsedBrief = worldBriefSchema.safeParse(candidate);

  if (parsedBrief.success) {
    const b = parsedBrief.data;
    const fb: FallbackContext = {
      turnNumber: b.turnNumber,
      seed: b.seed,
      buildingCount: b.buildings.length,
      population: b.npcs.length,
      sectorName: b.activeZone.name,
      empireName: b.empireName,
      biomeName: b.activeZone.biome,
      climateEffectLabel: b.epoch.name,
      subBiomeNames: b.activeZone.subBiomes,
      activeBuildingsSummary: b.buildings.map(
        (bld) => `${bld.name} (${bld.buildingType}, Niv.${bld.tier})`
      ),
      activeCitizensSummary: b.npcs.map((c) => `${c.name} (${c.role})`),
      recentChronicleTitles: b.chronicleWindow.map((c) => c.title),
      worldBrief: b,
    };
    return { brief: b, fallbackCtx: fb };
  }

  // Fallback normalization from flat FallbackContext payload
  const turnNumber = Math.max(1, Number(body.turnNumber ?? 2));
  const seed =
    typeof body.seed === 'string' && body.seed.trim()
      ? body.seed.trim()
      : 'GALAXIA-OMEGA-77';
  const sectorName =
    typeof body.sectorName === 'string' ? body.sectorName : 'Terre Bleue';
  const empireName =
    typeof body.empireName === 'string'
      ? body.empireName
      : 'Bio-Dôme Souverain d’Hélios';
  const biomeName =
    typeof body.biomeName === 'string'
      ? body.biomeName
      : 'Terre Bleue & Continents Verts';
  const climateEffectLabel =
    typeof body.climateEffectLabel === 'string'
      ? body.climateEffectLabel
      : 'Ensoleillement Tempéré';
  const subBiomeNames = Array.isArray(body.subBiomeNames)
    ? body.subBiomeNames.map(String).slice(0, 4)
    : ['Lagune', 'Massif Alpin'];

  const activeBuildingsSummary = Array.isArray(body.activeBuildingsSummary)
    ? body.activeBuildingsSummary.map(String)
    : [];
  const activeCitizensSummary = Array.isArray(body.activeCitizensSummary)
    ? body.activeCitizensSummary.map(String)
    : [];
  const recentChronicleTitles = Array.isArray(body.recentChronicleTitles)
    ? body.recentChronicleTitles.map(String)
    : [];

  const synthesizedBrief: WorldBrief = {
    turnNumber,
    seed,
    empireName: empireName.slice(0, 60),
    epoch: {
      name: 'Âge des Fondations',
      imperialYear: 1200 + turnNumber * 12,
    },
    activeZone: {
      id: 'zone_olympus',
      name: sectorName.slice(0, 60),
      biome: biomeName.slice(0, 60),
      subBiomes: subBiomeNames.map((s) => s.slice(0, 60)),
    },
    resources: rsc_ALL_TYPES.map((rKey) => ({
      resource: rKey,
      value: 55,
      netRate: 2,
    })),
    buildings: activeBuildingsSummary.slice(0, 12).map((label, idx) => ({
      id: `bld_init_${idx + 1}`,
      name: label.slice(0, 60),
      buildingType: 'observation_station',
      tier: 1,
      assignedColonists: 1,
      provenance: 'Fondation initiale',
    })),
    npcs: activeCitizensSummary.slice(0, 12).map((label, idx) => ({
      id: `npc_init_${idx + 1}`,
      name: label.slice(0, 40),
      role: 'Chercheur en Exobiologie',
      provenance: 'Pionnier fondateur T1',
    })),
    chronicleWindow: recentChronicleTitles.slice(0, 5).map((title, idx) => ({
      turn: Math.max(1, turnNumber - idx - 1),
      title: title.slice(0, 90),
      chosenLabel: 'Décret ratifié',
      category: 'FONDATION',
    })),
    pendingHints: [],
    activeThreads: [],
    semanticMemories: [],
    rhythm: {
      lastCategory: 'FONDATION',
      crisisCountLastTen: 0,
      recentTitles: recentChronicleTitles.slice(0, 3).map((t) => t.slice(0, 90)),
    },
  };

  const fallbackCtx: FallbackContext = {
    turnNumber,
    seed,
    buildingCount: Number(
      body.buildingCount ?? Math.max(1, activeBuildingsSummary.length)
    ),
    population: Number(
      body.population ?? Math.max(1, activeCitizensSummary.length)
    ),
    sectorName,
    empireName,
    biomeName,
    climateEffectLabel,
    subBiomeNames,
    activeBuildingsSummary,
    activeCitizensSummary,
    recentChronicleTitles,
    worldBrief: synthesizedBrief,
  };

  return { brief: synthesizedBrief, fallbackCtx };
}

const CHOICE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    summary: { type: Type.STRING },
    mutations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          buildingType: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          role: { type: Type.STRING },
          bio: { type: Type.STRING },
          mood: { type: Type.STRING },
          skyTint: { type: Type.STRING },
          lightIntensity: { type: Type.NUMBER },
          particleDensity: { type: Type.NUMBER },
          weatherEffect: { type: Type.STRING },
          stormIntensity: { type: Type.NUMBER },
          eventNote: { type: Type.STRING },
        },
        required: ['type'],
      },
    },
    economicEffects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          resource: { type: Type.STRING },
          delta: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ['resource', 'delta', 'reason'],
      },
    },
    pendingEffects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          dueInTurns: { type: Type.INTEGER },
          hint: { type: Type.STRING },
          mutations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                buildingType: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                role: { type: Type.STRING },
                bio: { type: Type.STRING },
                mood: { type: Type.STRING },
                eventNote: { type: Type.STRING },
              },
              required: ['type'],
            },
          },
        },
        required: ['id', 'dueInTurns', 'hint', 'mutations'],
      },
    },
    causalRefs: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['id', 'label', 'summary', 'mutations', 'economicEffects'],
};

const EVENT_ITEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    category: { type: Type.STRING },
    threadId: { type: Type.STRING },
    title: { type: Type.STRING },
    narrative: { type: Type.STRING },
    choices: {
      type: Type.ARRAY,
      items: CHOICE_SCHEMA,
    },
  },
  required: ['id', 'category', 'title', 'narrative', 'choices'],
};

const TURN_BATCH_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    narrative: { type: Type.STRING },
    category: { type: Type.STRING },
    threadId: { type: Type.STRING },
    choices: {
      type: Type.ARRAY,
      items: CHOICE_SCHEMA,
    },
    events: {
      type: Type.ARRAY,
      items: EVENT_ITEM_SCHEMA,
    },
    sectorCode: { type: Type.STRING },
    chronicleNote: { type: Type.STRING },
  },
  required: ['title', 'narrative', 'choices', 'events'],
};

async function invokeGeminiChronicler(
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  if (!aiClient) {
    throw new Error('Gemini client unavailable');
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash'];
  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemini timeout (12s) on ${modelName}`)),
          12000
        )
      );

      const response = await Promise.race([
        aiClient.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: TURN_BATCH_RESPONSE_SCHEMA,
          },
        }),
        timeoutPromise,
      ]);

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('All Gemini models failed');
}

/**
 * POST /api/ai/turn
 * Generates a D1-GU-PT v1.0.0..v4.0.0 TurnBatch (1-2 events, categorized, with rsc_ economicEffects,
 * pendingEffects, and causalRefs) using Gemini LLM + 1x Zod repair attempt + 12-template fallback.
 */
app.post('/api/ai/turn', async (req: Request, res: Response) => {
  const rawBody = (req.body || {}) as Record<string, unknown>;
  const { brief, fallbackCtx } = normalizeBriefAndFallback(rawBody);

  // Per-session rate-limit guard (PT-58)
  const sessionKey = `${req.ip || 'local'}_${brief.seed}`;
  const now = Date.now();
  const lastCall = sessionLastCallMap.get(sessionKey) ?? 0;
  if (now - lastCall < MIN_SESSION_INTERVAL_MS) {
    const fallbackBatch = generateFallbackEventBatch(fallbackCtx);
    return res.json({
      event: fallbackBatch,
      source: 'fallback_ratelimit',
      constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
    });
  }
  sessionLastCallMap.set(sessionKey, now);

  if (!aiClient || !apiKey) {
    const fallbackBatch = generateFallbackEventBatch(fallbackCtx);
    return res.json({
      event: fallbackBatch,
      source: 'fallback',
      constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
    });
  }

  const systemInstruction = buildSystemConstitutionPrompt();
  const worldBriefPrompt = formatWorldBriefForPrompt(brief);

  try {
    const rawText = await invokeGeminiChronicler(
      systemInstruction,
      worldBriefPrompt
    );
    const parsedJson = JSON.parse(rawText);
    const firstValidation = turnBatchSchema.safeParse(parsedJson);

    if (firstValidation.success) {
      const arbitrated = arbitrateTurnBatch(firstValidation.data, brief);
      return res.json({
        event: arbitrated.batch,
        arbitrationLogs: arbitrated.arbitrationLogs,
        source: 'gemini',
        constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
      });
    }

    // 1x Automatic Zod Repair Retry (PT-58)
    const zodIssuesSummary = firstValidation.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(' ; ');

    const repairPrompt = `${worldBriefPrompt}

CORRECTION SCHÉMA ZOD REQUISE :
Ta réponse JSON précédente comportait les erreurs de validation suivantes :
${zodIssuesSummary}
Corrige immédiatement ces champs et renvoie un objet TurnBatch JSON strictement valide.`;

    const repairedText = await invokeGeminiChronicler(
      systemInstruction,
      repairPrompt
    );
    const repairedJson = JSON.parse(repairedText);
    const secondValidation = turnBatchSchema.safeParse(repairedJson);

    if (secondValidation.success) {
      const arbitrated = arbitrateTurnBatch(secondValidation.data, brief);
      return res.json({
        event: arbitrated.batch,
        arbitrationLogs: arbitrated.arbitrationLogs,
        source: 'gemini_repaired',
        constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
      });
    }

    const fallbackBatch = generateFallbackEventBatch(fallbackCtx);
    return res.json({
      event: fallbackBatch,
      source: 'fallback_validation',
      constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
    });
  } catch {
    const fallbackBatch = generateFallbackEventBatch(fallbackCtx);
    return res.json({
      event: fallbackBatch,
      source: 'fallback_error',
      constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
    });
  }
});

/**
 * POST /api/ai/embed
 * PT-78 — Server-side Semantic Chronicle Embedding endpoint.
 * Uses Gemini embedding model when API key is configured, falling back to
 * deterministic 48-dim lexical-trigram projection so embeddings never fail.
 */
app.post('/api/ai/embed', async (req: Request, res: Response) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    return res.json({
      vector: computeDeterministicSemanticVector('fondation bio-dome'),
      source: 'deterministic',
    });
  }

  if (aiClient && apiKey) {
    try {
      const embedRes = await aiClient.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
      });
      const rawValues = embedRes.embeddings?.[0]?.values;
      if (Array.isArray(rawValues) && rawValues.length > 0) {
        return res.json({
          vector: normalizeVector(rawValues),
          source: 'gemini_embedding',
        });
      }
    } catch {
      // Fall through to deterministic vector
    }
  }

  return res.json({
    vector: computeDeterministicSemanticVector(text),
    source: 'deterministic',
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    constitutionVersion: CHRONICLE_CONSTITUTION_VERSION,
    time: Date.now(),
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `GALAXIA ULTRA • Bio-Dôme de Poche server running at http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
