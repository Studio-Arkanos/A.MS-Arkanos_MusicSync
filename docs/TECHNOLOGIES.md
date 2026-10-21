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
| Vitest | 5.0.5 | Tests unitaires (85 tests) |
| ESLint + typescript-eslint | 10.13.0 / 8.71.2 | Vérification du code |

Compatibilités vérifiées : `@vitejs/plugin-react@5.2.0` accepte
Vite `^4‖^5‖^6‖^7‖^8` ; `vitest@5` accepte Vite `^6.4‖^7‖^8` ;
`typescript-eslint@8` accepte TypeScript `<6.1`.

## API externes

| API | Usage | Notes |
| --- | --- | --- |
| YouTube Data API v3 | Recherche, métadonnées, playlists | Officielle, clé utilisateur, quota Google respecté (maxResults=20/50). Aucun scraping. Métadonnées ≠ autorisation de téléchargement — téléchargement YouTube jamais proposé. |
| Jamendo API v3 | Recherche + téléchargement autorisé | Officielle, client_id gratuit. Téléchargement uniquement si `audiodownload_allowed`. Licences CC affichées. |

## Conversion audio — décision documentée (étape 3)

**Aucune bibliothèque de conversion n'est intégrée.**
Évaluation :

- **FFmpegKit** (arthenica/ffmpeg-kit) : moteur complet,
  ARM64/Android supporté, activement maintenu — mais
  licences LGPL/GPL/**commerciales** : l'app A.MS est
  MIT, et l'intégration d'un binaire GPL sans vérification
  juridique serait incorrecte. De plus, aucune compilation
  native ne peut être vérifiée dans l'environnement de
  développement (pas de SDK Android).
- **Exigence du cahier** : « la conversion ne doit être
  activée que si une solution réellement compatible Android
  a été vérifiée ».

**Décision** : interface `ConversionManager` prête, stub
honnête (`available = false`), jamais de simulation.
Règles respectées dès maintenant :
- MP3 source → aucune conversion inutile
  (`isConversionNeeded('mp3','mp3') === false`) ;
- si un format ne peut pas être converti, la limitation
  est explicite et le fichier source téléchargé est
  préservé (jamais écrasé, jamais supprimé).

Intégration envisageable (étape 4 ou ultérieure) après
validation juridique de licence et build Android vérifié.

## Couche native / mobile

| Techno | Version | Rôle |
| --- | --- | --- |
| @capacitor/core / cli / android | 8.5.3 | Conteneur hybride (Node ≥ 22 requis ✅) |
| Kotlin | 2.1.21 | Code natif Android |
| AGP (Gradle) | 8.13.0 | Build Android (template Capacitor) |
| Gradle (wrapper) | 8.14.3 | Build Android |
| compileSdk / targetSdk | 36 | Template Capacitor 8 |
| minSdk | 24 | Android 7.0+ |

## Alternatives écartées (documentées)

- **Vite 8** : disponible, mais plugin-react 6 s'appuie sur des peers
  optionnels Rolldown/oxc ; Vite 7 est plus éprouvé à date égale.
- **Room / KSP / kapt** : retirés de cette version, car les entités/DAO n'étaient reliés ni au plugin Android ni à l'interface. La persistance active est localStorage WebView ; annoncer Room opérationnel aurait été trompeur.
- **iOS** : non ajouté (`@capacitor/ios` absent) — le cahier des charges
  vise Android.
- **Framework UI (Material UI, etc.)** : écarté pour les performances
  sur smartphones d'entrée de gamme ; CSS maison (~300 lignes).
- **Bibliothèque i18n** : écartée (une seule langue à ce stade) ;
  chaînes centralisées dans `src/i18n/fr.ts`.
- **SQLite/Room** : non intégré ; les données métier restent dans localStorage de la WebView afin de réduire les dépendances natives et ne pas présenter un pont inexistant comme réel.

## Contraintes d'architecture respectées

- Aucun serveur local, Termux, Python ou PostgreSQL requis sur le téléphone.
- Node.js intervient uniquement lors de la compilation.
- L'APK est autonome et fonctionne hors ligne.
