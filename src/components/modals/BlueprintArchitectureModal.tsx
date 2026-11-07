import React from 'react';
import { useAtom } from 'jotai';
import {
  CheckCircle2,
  Cpu,
  FileCode2,
  FolderTree,
  Gamepad2,
  Globe2,
  X,
} from 'lucide-react';
import { isBlueprintModalOpenAtom } from '../../stores/worldStore';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * Interactive In-App Blueprint & Architecture Specification Viewer (v4.0).
 * Documents the full feature list, /src directory tree, tech stack, UX vision, gameplay & world build.
 */
export const BlueprintArchitectureModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isBlueprintModalOpenAtom);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6">
      <GlassPanel className="w-full max-w-5xl max-h-[88vh] flex flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-400/15 border border-sky-300/35 flex items-center justify-center text-sky-300">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-amber-50">
                Blueprint Officiel • GALAXIA ULTRA : PAX HISTORIA 3D (v4.0)
              </h2>
              <p className="text-xs text-slate-400">
                Style « Astral Antiquity » • Grand-Strategy Narrative sur Monde Courbe, Chrono-Builder Dynastique & God-Game Encyclopédique 3D
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-2 text-xs text-slate-200 leading-relaxed">
          {/* 1. Vision UX, Gameplay & Game Loop */}
          <section className="rounded-2xl border border-amber-300/25 bg-amber-400/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-amber-200 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-300" />
              1. Identité du Style, Vision UX, Gameplay & Game Loop
            </h3>
            <p>
              <strong>Dénomination du Style :</strong>{' '}
              <span className="text-amber-300 font-medium">
                Esthétique « Astral Antiquity »
              </span>{' '}
              combinée au genre{' '}
              <span className="text-sky-300 font-medium">
                « Grand-Strategy Narrative sur Monde Courbe • Chrono-Builder Dynastique & God-Game Encyclopédique 3D »
              </span>.
            </p>
            <p>
              <strong>Game Loop (Boucle de Jeu) :</strong> Le joueur incarne un Souverain Fondateur arrivant par vaisseau amiral en orbite, s’authentifie via Google Firebase, configure son Souverain et son Monde (Biome, Météo, Zone), puis descend sur la Porte Céleste du Plateau 3D. À chaque Tour (bouton Play), le moteur génère un événement géopolitique et historique (via Gemini AI ou le moteur déterministe local). Le décret choisi par le joueur fait surgir organiquement de nouveaux édifices, des quartiers urbains pavés, des citoyens affiliés à des Maisons nobles et des mutations météorologiques.
            </p>
          </section>

          {/* 2. Liste Complète des Features Intégrées */}
          <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-4 space-y-2.5">
            <h3 className="font-serif text-base font-semibold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              2. Liste Exhaustive des Features Intégrées (v4.0)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                'Boot Cinématique 3D Orbital avec approche du Vaisseau Amiral Impérial en temps réel pendant le préchargement.',
                'Écran de Connexion Obligatoire Google Firebase (signInWithPopup) + Synchronisation Cloud Firestore Zero-Trust.',
                'Menu Principal Impérial superposé à la scène orbitale 3D vivante.',
                'Double Vue 3D : Vue Plateau Incurvé (112x112m, courbure sphérique R=185) + Vue Globe Planétaire 3D.',
                'Horizon Planétaire Vivant : Jupe océanique courbée, chaîne de 28 montagnes enneigées lointaines et dôme atmosphérique.',
                'Géomorphologie 3D & 5 Micro-Climats Horizontaux : Plages de sable doré & lagune, Massifs montagneux alpins, Bosquet sylvestre, Steppe d’ambre et Quartiers Urbains Pavés.',
                '6 Zones Plateaux modélisées directement sur le Globe 3D avec bannières cartographiques et Routes Commerciales Orbitales animées.',
                'PNJ 3D Hybrides : Chargeur Web GLTF/GLB (Soldier.glb + AnimationMixer) + Rig RPG articulé avec tenues de caste, capes, couronnes et navette Maison ↔ Travail.',
                'Grand Catalogue RPG : 5 Maisons Nobles, 6 Tenues 3D, 5 Points d’Aptitudes (/20), Compétences, Traits Bonus/Malus et Liens Relationnels.',
                'HUD Minimaliste : Header avec ressources rétractables + Dock inférieur pliable avec tiroirs contextuels « Vue » et « Play ».',
                'Cartes d’Inspection (Personnage, Bâtiment, Porte d’Arrivée) ancrées proprement au-dessus du footer sans jamais masquer le header ni le footer.',
                'Navigation Tactile & Gestuelle : Swipe 1 doigt (avant/arrière/gauche/droite), Rotation 2 doigts en sens inverse, Pinch Zoom et Clavier WASD/ZQSD.',
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-black/30 border border-white/10 p-2.5 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Stack Technologique */}
          <section className="rounded-2xl border border-sky-400/25 bg-sky-500/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-sky-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-300" />
              3. Spécifications du Stack Technologique
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Frontend & UI :</strong> React 19 + TypeScript Strict + Tailwind CSS v4 (Design Glassmorphism Impérial).</li>
              <li><strong>Moteur 3D Temps Réel :</strong> Three.js r186 (WebGLRenderer ACESFilmicToneMapping, sRGB, PMREM RoomEnvironment, GLTFLoader, SkeletonUtils).</li>
              <li><strong>Gestion d’État Réactive :</strong> Jotai v3 (Atoms modulaires scopés par Zone Planétaire, zéro état métier dans la scène 3D).</li>
              <li><strong>Authentification & Cloud DB :</strong> Google Firebase Auth + Cloud Firestore Enterprise avec règles Zero-Trust (`firestore.rules`).</li>
              <li><strong>Contrats & Validation :</strong> Zod v4 + Schemas JSON pour les tours générés par Gemini AI (`@google/genai`).</li>
            </ul>
          </section>

          {/* 4. Arborescence Granulaire de /src */}
          <section className="rounded-2xl border border-purple-400/25 bg-purple-500/5 p-4 space-y-2">
            <h3 className="font-serif text-base font-semibold text-purple-200 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-purple-300" />
              4. Arborescence Modulaire du Code Source (/src)
            </h3>
            <pre className="rounded-xl bg-black/50 border border-white/10 p-3.5 font-mono text-[11px] text-amber-100 overflow-x-auto leading-relaxed">
{`/src
├── App.tsx                                  # Orchestrateur principal (Canvas 3D + HUD + Modales)
├── config/
│   ├── constants.ts                         # Constantes typées (wld_, bld_, npc_, cam_, wtr_)
│   ├── gameDefaults.ts                      # État initial & chroniques de fondation
│   ├── planetaryZones.ts                    # Catalogue des 6 Zones Plateaux sur le Globe 3D
│   ├── presets.ts                           # Palettes de Biomes Planétaires sRGB lumineuses
│   └── rpgCatalogs.ts                       # 5 Maisons Nobles, Tenues 3D, Aptitudes, Traits & Relations
├── contracts/
│   └── schemas.ts                           # Contrats Zod v4 (Mutations, Entités, Sauvegardes)
├── core/
│   ├── fallbackEvents.ts                    # Générateur déterministe d'événements Pax Historia
│   ├── noise.ts                             # Bruit Simplex/Fractal 2D & 3D multi-octaves
│   ├── prng.ts                              # Générateur pseudo-aléatoire Mulberry32 seedé
│   └── terrainMath.ts                       # Courbure sphérique, 5 Micro-Climats, Plages, Montagnes
├── services/
│   ├── aiTurnService.ts                     # Client API pour la génération de tours Gemini AI
│   ├── assetPreloader.ts                    # Pré-calcul asynchrone durant le Boot Cinématique 3D
│   ├── firebaseService.ts                   # Auth Google Firebase + Cloud Firestore World Saves
│   └── saveService.ts                       # Persistance multi-slots locale + Import/Export JSON
├── stores/
│   └── worldStore.ts                        # Store Jotai (Zones, Ressources, Tiroirs HUD, Auth)
├── three/
│   ├── director.ts                          # Directeur WebGL (Gestes 1/2 doigts, Raycast, Boucle)
│   ├── camera/cameraRig.ts                  # Caméra Orbite, Surface, Porte d'Arrivée & Globe 3D
│   ├── entities/
│   │   ├── buildings.ts                     # Édifices 3D multi-parties néo-classiques & stellaires
│   │   └── npcs.ts                          # PNJ 3D (Import GLTF/GLB Web + Rig RPG Articulé)
│   ├── textures/proceduralTextures.ts       # Textures PBR sRGB (Plages, Pavés Urbains, Globe)
│   └── world/
│       ├── arrivalZone.ts                   # Porte Céleste 3D & Navette Impériale
│       ├── particles.ts                     # Particules atmosphériques circulaires douces
│       ├── planetGlobe.ts                   # Globe 3D, 6 Terrasses, Routes Commerciales & Vaisseau
│       ├── plateauTerrain.ts                # Plateau 112x112m, Quartiers Urbains, Montagnes & Horizon
│       ├── spaceEnvironment.ts              # Éclairage céleste, Soleil, Anneaux & Nébuleuses
│       └── weatherSystem.ts                 # Météo dynamique (Aurores, Poussière d'Or, Orages)
└── components/
    ├── boot/BootSequenceScreen.tsx          # Boot 3D Orbital -> Login Google Firebase -> Menu
    ├── canvas/TerrariumMount.tsx            # Pont isolé React <-> SceneDirector Three.js
    ├── hud/
    │   ├── TopTelemetryBar.tsx              # Header minimaliste avec ressources rétractables
    │   ├── BottomControlDock.tsx            # Dock pliable avec tiroirs « Vue » et « Play »
    │   ├── PlanetaryZonesPanel.tsx          # Sélecteur rapide des 6 Zones Planétaires
    │   └── TouchNavigationPad.tsx           # Pad directionnel & rotation tactile
    ├── inspectors/                          # Cartes ancrées proprement au-dessus du footer
    │   ├── NpcInspectorModal.tsx            # Fiche RPG (Maison, Tenue, Maison/Travail, 5 Aptitudes)
    │   ├── BuildingInspectorModal.tsx       # Fiche Bâtiment, Quartier Urbain & Citoyens affectés
    │   └── ArrivalZoneInspectorModal.tsx    # Fiche Astroport & Appel de convois
    └── modals/
        ├── RpgCatalogsAndArchitectModal.tsx # Grand Catalogue RPG, Maisons, Tenues & Mode Architecte
        ├── BlueprintArchitectureModal.tsx   # Blueprint complet v4.0 intégré
        ├── GameConfigModal.tsx              # Assistant 2 étapes (Personnage -> Monde/Biome/Météo)
        └── SaveManagerModal.tsx             # Sauvegardes Cloud Firestore & Locales`}
            </pre>
          </section>
        </div>
      </GlassPanel>
    </div>
  );
};
