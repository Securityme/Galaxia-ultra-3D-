# GALAXIA ULTRA • Bio-Dôme de Poche // Monde-Plateau & Globe Planétaire 3D (D1-GU-PT v1.0.0 .. v4.0.0)

Application interactive Vite 8 + React 19 + Express (`server.ts`) + WebGL/Three.js (Pipeline « Niveau Blender » PT-17..PT-32, Horizon « Couronne de l'Aurore » PT-60) + Noyau Simulation Tick-Exact 10 Hz (PT-47..PT-58) + Pile Puissance Supérieure (PT-74..PT-81) + Jotai + Firebase 13 + Gemini API (`@google/genai`).

## Architecture Canonique (Cascade D-18)

| Dossier | Responsabilité |
| :--- | :--- |
| `server.ts` | Serveur Express : `POST /api/ai/turn` (cycle LLM Gemini, Constitution Impériale PT-54, 1x auto-repair Zod, Arbitre de Rythme PT-56) et `POST /api/ai/embed` (embeddings vectoriels 48-dim PT-78) |
| `src/core/simulation/` | `simulationKernel.ts` (noyau déterministe 10 Hz `evt_TICK_HZ`, empreinte FNV-1a PT-58) et `wasmBridge.ts` (pont réversible TS / Rust-WASM avec vérification de parité PT-74/PT-75) |
| `src/core/events/` | `turnOrchestrator.ts` (cycle à 7 phases `YIELD → MATURE → BUILD_BRIEF → GENERATE → PRESENT → APPLY → ARCHIVE`, banc d'essai 100 tours PT-58) et `semanticMemory.ts` (rappel cosinus Top-3 PT-78) |
| `src/three/` | Scène WebGL pure isolée (GN-01) : `director.ts` (navigation 100 % gestuelle R-PT-59, boucle 10 Hz), `horizonCrown.ts` (Couronne de l'Aurore 4 couches H1..H4 PT-60), `gerstnerWater.ts` (PT-25), `instancedForests.ts` (PT-27), `entityRegistries.ts` (PT-48), `qualityDirector.ts` (PT-49), `materialManager.ts` (LRU + registre CC0 PT-50/PT-62), `capabilitiesBridge.ts` (WebGPU/WebGL2 + OffscreenCanvas PT-76/PT-77) |
| `src/stores/` | Atomes Jotai : stocks hybrides persistants (PT-52), 3 familles de ressources (`Impérial`, `Matière`, `Technologie rsc_` PT-61), file d'effets latents (`dueInTurns` PT-56), Ledger de rejeu (PT-58) |
| `src/components/` | Interface verre dépoli Tailwind 4, double carte d'événement simultanée (`EventDialog.tsx`), Grand Livre à 3 familles & Codex Solaire (`ResourceLedgerModal.tsx`), Hub des Graines `GXP4` & Zoom WCAG (`WorldSettingsModal.tsx`) |

## Invariants & Discipline Technique

1. **Identité Canonique (GEC-01-R)** : « GALAXIA ULTRA • Bio-Dôme de Poche ».
2. **Spectateur Pur & Gestes Uniques (R-PT-59)** : Suppression de tout pad directionnel flottant et du clavier ZQSD/WASD ; pilotage direct par gestes 1/2 doigts sur le canevas 3D + boutons de zoom d'accessibilité WCAG dans les Paramètres.
3. **Déterminisme Bit-à-Bit (GU-14 / PT-47 / PT-58)** : Zéro `Math.random()` et zéro `Date.now()` dans la simulation et le rendu ; toutes les mutations et la Couronne de l'Aurore dérivent de `createPRNG(seed)` et sont vérifiées par empreinte FNV-1a (`stateFingerprint`).
4. **Licences Ouvertes (PT-62 / PT-63)** : Tous les assets procéduraux et modèles 3D référencés sont documentés dans `CREDITS.md` et `OPEN_ASSET_REGISTRY`.
