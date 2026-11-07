# src/stores • State Management with Jotai

Gère l'état global réactif de l'application via des atomes modulaires.

## Fichiers & Responsabilités

| Fichier | Rôle unique |
| :--- | :--- |
| `worldStore.ts` | Atomes d'état : graine, secteur, entités, chroniques, cycle céleste et caméras |

## Invariants

- La scène 3D ne modifie jamais les atomes directement.
- Les interactions 3D (clics raycastés) sont relayées sous forme d'événements aux composants React qui mettent à jour les atomes.
