# GALAXIA ULTRA • Bio-Dôme de Poche // Blueprint Plan de Mise à Jour (v4.1.0)

Mise à niveau majeure du framework Vite pour **GALAXIA ULTRA • Bio-Dôme de Poche**, apportant la gestion d'état asynchrone ultra-performante via **TanStack Query**, la persistance locale hors-ligne via **Dexie.js (IndexedDB)**, un **Visualiseur 3D Architecte Holographique** pour la prévisualisation des édifices, et un **Gestionnaire de Sauvegardes Multi-Slots** synchronisé sur Firebase Cloud.

---

## Decision Log & User Feedback

> [!IMPORTANT]
> - **Kits & Package Vite Confirmés** : Integration de `@tanstack/react-query` pour les requêtes d'événements et d'embeddings, et `dexie` pour l'IndexDB transactionnel hors-ligne.
> - **Focus Fonctionnel** : Visualiseur 3D Architecte (Prévisualisation Hologramme Cyan) + Gestionnaire de Sauvegardes Multi-Slots (Firebase Cloud + Export/Import JSON).
> - **Axe Visuel & UX** : Maintien de l'esthétique *Glassmorphic Cyber-Gold* avec typographie haute lisibilité WCAG 2.2 AA (Plus Jakarta Sans, Outfit, JetBrains Mono).

---

## 1. Vue d'Ensemble & Architecture du Framework

Le framework v4.1.0 s'articule autour de 4 couches indépendantes et réversibles :

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      INTERFACE REACT 19 & GLASS-PANEL HUD                        │
│ (Plus Jakarta Sans • TopTelemetryBar • BottomControlDock • Modals & Drawers)    │
└─────────────────────────┬────────────────────────────────────────────────────────┘
                          │
  ┌───────────────────────┼─────────────────────────┐
  ▼                       ▼                         ▼
┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────────┐
│ TANSTACK QUERY   │    │ JOTAI REACTIVE     │    │ DEXIE.JS INDEXEDDB      │
│ (Async Events &  │    │ STATE ATOMS        │    │ (Local Storage &        │
│ Chronicle Memory)│    │ (HUD & View Modes) │    │ Multi-Slot Replay)      │
└─────────┬────────┘    └─────────┬──────────┘    └────────────┬────────────┘
          │                       │                            │
          └───────────────────────┼────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│              PONT DE SIMULATION PT-74 / PT-75 (WASM & TS FALLBACK)               │
│ (WebAssembly Kernel v4.0.0 • FNV-1a Parity Check • Web Worker Texture Factory)   │
└─────────────────────────────────┬────────────────────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  MOTEUR DE RENDU THREE.JS 3D (PLATEAU & GLOBE)                   │
│ (Hologramme Architecte • Faune/Flore Dyn. • Météo Procédurale • Post-Processing) │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Plan des Modifications & Nouveaux Modules

### Lot 1 : Nouveaux Packages Vite & Intégration
- **`@tanstack/react-query`** :
  - Fournisseur `QueryClientProvider` dans `/src/App.tsx`.
  - Cache réactif pour la génération des événements narration IA et l'analyse de similarité cosinus des souvenirs.
- **`dexie` & `dexie-react-hooks`** :
  - Classe `BioDomeDatabase` dans `/src/services/db/dexieDb.ts`.
  - Enregistrement transactionnel des chroniques, mutations et snapshots de sauvegarde multi-slots.

### Lot 2 : Visualiseur 3D Architecte Holographique
- **Prévisualisation Hologramme Cyan/Ambre (`/src/three/world/architectHologram.ts`)** :
  - Mode de placement 3D projetant le gabarit wireframe d'un édifice sélectionné sur le plateau.
  - Test d'interpénétration avec le relief et les bâtiments existants.
- **Bouton & Modal Architecte dans le Bottom Control Dock** :
  - Sélection d'un projet de construction (Serre, Habitat, Observatoire, Relais) avec prévisualisation 3D en direct avant ratification.

### Lot 3 : Multi-Slot Cloud Save Manager & Export/Import
- **Gestionnaire de Sauvegarde Amélioré (`/src/services/saveService.ts` & `SaveManagerModal.tsx`)** :
  - 4 Slots d'archivage avec nom personnalisé, horodatage, tour et captures de ressources.
  - Intégration transparente avec Firebase Firestore (`saveWorldSlotToCloud`) si l'utilisateur est authentifié.
  - Export instantané au format `.json` et restauration par glisser-déposer.

---

## 3. Plan de Vérification & Tests

1. **Compilation & Linting** :
   - Co-exécution de `compile_applet` et `lint_applet` (`tsc --noEmit`).
2. **Test de Parité WASM/TS** :
   - Vérification `verifyDeterministicKernelParity()` sur `wasmBridge.ts`.
3. **Validation Serveur Dev** :
   - Redémarrage propre via `restart_dev_server`.
