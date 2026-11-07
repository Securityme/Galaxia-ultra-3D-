/**
 * PAX HISTORIA 3D • Full-Stack Server Entry Point.
 * Provides server-side Gemini API historical chronicle turns and serves Vite applet.
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { turnBatchSchema } from './src/contracts/schemas';
import { generateFallbackEventBatch } from './src/core/fallbackEvents';
import { bld_TYPES, wtr_TYPES } from './src/config/constants';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

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

/**
 * POST /api/ai/turn
 * Generates an interactive Pax Historia 3D historical decree / event with choices and typed mutations.
 */
app.post('/api/ai/turn', async (req: Request, res: Response) => {
  const {
    turnNumber = 2,
    seed = 'PAX-HISTORIA-77',
    buildingCount = 3,
    population = 4,
    sectorName = 'Terre Bleue',
  } = req.body || {};

  if (!aiClient || !apiKey) {
    const fallbackBatch = generateFallbackEventBatch({
      turnNumber,
      seed,
      buildingCount,
      population,
      sectorName,
    });
    return res.json({ event: fallbackBatch, source: 'fallback' });
  }

  try {
    const prompt = `Tu es le Grand Chroniqueur Impérial d'un jeu de grande stratégie et d'histoire planétaire (« Pax Historia 3D »).
Le Souverain gouverne un monde miniature 3D doté d'un Plateau Stratégique et d'un Globe Planétaire.
État actuel de l'Empire :
- Cycle historique : An ${1200 + Number(turnNumber) * 12} (Tour ${turnNumber})
- Biome & Cartographie : ${sectorName}
- Citoyens & Émissaires actifs : ${population}
- Édifices souverains bâtis : ${buildingCount}

Génère le prochain dilemme géopolitique, scientifique ou écologique sous forme de JSON strict.
Consignes :
1. Titre historique solennel en français (ex: "Le Traité des Méridiens", "Charte des Cités Franches d'Aurélia").
2. Narration de 60 à 120 mots décrivant une opportunité de civilisation, d'exploration cartographique ou de fondation.
3. 2 à 3 décrets (choices) distincts.
4. Chaque choix DOIT inclure au moins 1 mutation typée parmi :
   - BUILD : ériger un édifice parmi : ${bld_TYPES.join(', ')} avec un nom et une description courte.
   - SPAWN_NPC : accueillir un nouvel émissaire ou savant avec son nom, son rôle, sa bio et son humeur.
   - AMBIENCE : modifier le climat planétaire (skyTint en hexadécimal, lightIntensity entre 0.8 et 2.2, eventNote, weatherEffect parmi ${wtr_TYPES.join(', ')}, stormIntensity entre 0.1 et 1.0).

Génère uniquement du JSON valide sans balise markdown.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 9s')), 9000)
    );

    const response = await Promise.race([
      aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              narrative: { type: Type.STRING },
              choices: {
                type: Type.ARRAY,
                items: {
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
                  },
                  required: ['id', 'label', 'summary', 'mutations'],
                },
              },
              sectorCode: { type: Type.STRING },
            },
            required: ['title', 'narrative', 'choices'],
          },
        },
      }),
      timeoutPromise,
    ]);

    const rawText = response.text || '';
    const parsedJson = JSON.parse(rawText);

    const validation = turnBatchSchema.safeParse(parsedJson);

    if (validation.success) {
      return res.json({ event: validation.data, source: 'gemini' });
    } else {
      const fallbackBatch = generateFallbackEventBatch({
        turnNumber,
        seed,
        buildingCount,
        population,
        sectorName,
      });
      return res.json({ event: fallbackBatch, source: 'fallback_validation' });
    }
  } catch {
    const fallbackBatch = generateFallbackEventBatch({
      turnNumber,
      seed,
      buildingCount,
      population,
      sectorName,
    });
    return res.json({ event: fallbackBatch, source: 'fallback_error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
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
    console.log(`PAX HISTORIA 3D server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
