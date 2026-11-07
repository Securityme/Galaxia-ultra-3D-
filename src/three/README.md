# src/three • Three.js WebGL Rendering Subsystem

Couche de rendu 3D pure. Lit l'état depuis le store sans écrire dedans.

## Fichiers & Responsabilités

| Fichier | Rôle unique |
| :--- | :--- |
| `director.ts` | Orchestration Three.js, boucle RAF amortie, pause visibilité, raycasting |
| `spaceEnvironment.ts` | Champ d'étoiles, nébuleuses en sprites additifs, astéroïdes et lumières |
| `plateauTerrain.ts` | Mesh rectangulaire subdivisé, quille biseautée et trim plasma |
| `buildings.ts` | Structures sci-fi low-poly, animation d'assemblage et ancrage hauteur |
| `npcs.ts` | Explorateurs low-poly, déambulation autonome et orientation terrain |
| `particles.ts` | Motes de poussière stellaire scintillantes au-dessus du relief |
| `weatherSystem.ts` | Tempêtes d'arcs ioniques sur les relais, vortex de poussières et aurores |
| `cameraRig.ts` | Caméra spectateur : Mode Orbite 360° à inertie et Mode Vue Plateau |
