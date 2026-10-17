# Choix technologiques — A.MS

Toutes les versions ci-dessous ont été **vérifiées** au moment de
l'initialisation (registry npm / API GitHub) et sont **verrouillées**
(dépendances exactes + `package-lock.json`).

## Pile web (interface + logique métier)

| Techno | Version | Rôle |
| --- | --- | --- |
| React | 19.3.1 | Interface |
| TypeScript | 5.9.3 | Typage strict |
| Vite | 7.3.7 | Build/ dev server |
| @vitejs/plugin-react | 5.2.0 | Plugin React pour Vite |
| react-router-dom | 7.18.4 | Navigation (HashRouter) |
| Vitest | 5.0.5 | Tests unitaires |
| ESLint + typescript-eslint | 10.13.0 / 8.71.2 | Vérification du code |

Compatibilités vérifiées : `@vitejs/plugin-react@5.2.0` accepte
Vite `^4‖^5‖^6‖^7‖^8` ; `vitest@5` accepte Vite `^6.4‖^7‖^8` ;
`typescript-eslint@8` accepte TypeScript `<6.1`.

## Couche native / mobile

| Techno | Version | Rôle |
| --- | --- | --- |
| @capacitor/core / cli / android | 8.5.3 | Conteneur hybride (Node ≥ 22 requis ✅) |
| Kotlin | 2.1.21 | Code natif Android |
| AGP (Gradle) | 8.13.0 | Build Android (template Capacitor) |
| Gradle (wrapper) | 8.14.3 | Build Android |
| Room | 2.6.1 | SQLite (via kapt) |
| compileSdk / targetSdk | 36 | Template Capacitor 8 |
| minSdk | 24 | Android 7.0+ |

## Alternatives écartées (documentées)

- **Vite 8** : disponible, mais plugin-react 6 s'appuie sur des peers
  optionnels Rolldown/oxc ; Vite 7 est plus éprouvé à date égale.
- **KSP** plutôt que kapt : KSP exige un alignement strict de version
  avec le compilateur Kotlin ; kapt (inclus dans le plugin Kotlin) est
  suffisant pour Room à ce stade.
- **iOS** : non ajouté (`@capacitor/ios` absent) — le cahier des charges
  vise Android.
- **Framework UI (Material UI, etc.)** : écarté pour les performances
  sur smartphones d'entrée de gamme ; CSS maison (~300 lignes).
- **Bibliothèque i18n** : écartée (une seule langue à ce stade) ;
  chaînes centralisées dans `src/i18n/fr.ts`.
- **SQLite web (sql.js) côté web** : inutile — la persistance réelle
  sera Room côté Android via le plugin natif.

## Contraintes d'architecture respectées

- Aucun serveur local, Termux, Python ou PostgreSQL requis sur le téléphone.
- Node.js intervient uniquement lors de la compilation.
- L'APK est autonome et fonctionne hors ligne.
