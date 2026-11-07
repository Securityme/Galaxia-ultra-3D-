# GALAXIA ULTRA • Bio-Dôme de Poche // Monde-Plateau Spectateur

Application interactive Next.js / Express + WebGL/Three.js + Jotai + Gemini API.
Le spectateur contemple un plateau spatial miniature flottant dans le cosmos et arbitre son développement via des événements narratifs générés par LLM.

## Architecture

| Dossier | Responsabilité |
| :--- | :--- |
| `server.ts` | Serveur Express, endpoint `/api/ai/turn` (Gemini SDK), Vite dev |
| `src/lib/` | Moteurs purs mathématiques, PRNG, bruit fractal, contrats Zod, fallback |
| `src/three/` | Scène WebGL pure (plateau, espace, bâtiments low-poly, PNJ, caméra spectateur) |
| `src/stores/` | Atomes d'état Jotai (la 3D lit le store sans jamais y écrire) |
| `src/components/` | Interface verre dépoli Tailwind, HUD télémétrique, dialogues d'événements |

## Invariants & Règles

1. **Spectateur Pur** : Pas de globe ni de personnage piloté. Caméras Orbite 360° et Plateau.
2. **LLM Arbitré** : Le LLM propose, les contrats Zod valident, le moteur pur applique.
3. **Zéro Rupture** : Générateur procédural de secours si aucune clé API n'est fournie.
