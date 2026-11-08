# CREDITS & GOUVERNANCE DES LICENCES D'ASSETS (PT-63)

**Projet** : `GALAXIA ULTRA • Bio-Dôme de Poche`  
**Branche** : `Pocket Terrarium` (`D1-GU-PT v2.0.0`)  
**Politique de Licences** : **CC0-1.0 & Domaine Public d'abord** (Attribution `CC-BY-4.0` consignée ci-dessous le cas échéant ; licences Copyleft/GPL et Non-Commerciales `NC` strictement interdites).

---

## 1. Principes d'Intégration (`PT-62` & `PT-63`)

1. **Base Procédurale Souveraine (`GN-01`)** : Toutes les géométries, textures PBR (Albedo, Normal Maps Sobel 3×3, Roughness Maps) et cartes planétaires disposent d'un générateur procédural déterministe (`Mulberry32`) garantissant le fonctionnement intégral hors-ligne.
2. **Budget Strict** : Chaque asset compressé (`glTF + Meshopt/Draco`, `KTX2/Basis`) est plafonné à `< 250 Ko` et le budget cumulé est plafonné à `< 8 Mo`.
3. **Registre Canonique (`ast_`)** : Consigné dans `src/three/materials/materialManager.ts` (`OPEN_ASSET_REGISTRY`).

---

## 2. Catalogues Ouverts Référencés

| ID Registre (`ast_`) | Catalogue Source | Licence | Usage dans GALAXIA ULTRA • Bio-Dôme de Poche | Attribution / Lien |
| --- | --- | --- | --- | --- |
| `ast_kenney_modular_colonies_v1` | **Kenney** (Space & Modular Kits) | `CC0-1.0` (Domaine Public) | Props du Lot Êta, balises d'astroport, éléments d'interface et kits de constructions modulaires | Kenney.nl — CC0 1.0 Universal |
| `ast_poly_pizza_biome_props_v1` | **Poly Pizza** (Archive CC0) | `CC0-1.0` (Domaine Public) | Props low-poly par sous-biome, jalons méridiens et affleurements cristallins | Poly.pizza CC0 Collection |
| `ast_quaternius_citizen_rigs_v1` | **Quaternius** (Low-Poly Characters) | `CC0-1.0` (Domaine Public) | Variantes de colons articulés par Maison Noble et convois logistiques | Quaternius.com — CC0 1.0 Universal |
| `ast_poly_haven_cosmic_hdri_v1` | **Poly Haven** (HDRIs & Textures) | `CC0-1.0` (Domaine Public) | Références HDRI cosmiques par preset renforçant le générateur PMREM (`PT-22`) | Polyhaven.com — CC0 1.0 Universal |
| `ast_ambientcg_carrara_marble_v1` | **ambientCG** (PBR Materials) | `CC0-1.0` (Domaine Public) | Étalons PBR Albedo/Normal/Roughness/AO pour Marbre de Carrare, Basalte et Or (`mat_`) | ambientCG.com — CC0 1.0 Universal |
| `ast_nasa_planetary_albedo_v1` | **NASA 3D Resources** | `Public-Domain-USGov` | Cartes planétaires de référence pour le Globe 3D, calottes polaires et anneaux | NASA Visualization Technology Applications and Development (VTAD) |
