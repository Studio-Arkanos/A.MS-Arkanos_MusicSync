# Guide de développement — A.MS

## Environnement

| Outil | Version requise |
| --- | --- |
| Node.js | ≥ 22 (Capacitor 8 l'exige) |
| npm | ≥ 10 |
| Java (JDK) | 17 (build Android uniquement) |
| Android Studio | pour le développement/ débogage APK |

> Node.js et les outils servent **uniquement à la compilation**.
> L'application installée n'a besoin de rien de tout cela.

## Commandes réelles

```bash
npm ci                  # installation verrouillée (package-lock.json)
npm run dev             # dev web (http://localhost:5173)
npm run build           # tsc + vite → dist/
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint
npm test                # Vitest (logique métier)
npm run cap:sync        # build web + injection dans android/
npm run cap:open:android
npm run android:build   # ./gradlew assembleDebug (nécessite le SDK)
```

## Structure du projet Android

```
android/
├── app/
│   ├── build.gradle              # module app (Kotlin + kapt + Room)
│   ├── capacitor.build.gradle    # généré par Capacitor
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/public/        # bundle web injecté par `cap sync`
│       ├── java/com/arkanos/ams/
│       │   ├── MainActivity.kt        # BridgeActivity + enregistrement plugins
│       │   ├── plugins/AmsNativePlugin.kt
│       │   ├── plugins/AmsPlayerPlugin.kt   # MediaPlayer (fichiers locaux)
│       │   └── data/
│       │       ├── AppDatabase.kt     # Room
│       │       ├── TrackDao.kt
│       │       └── TrackEntity.kt
│       └── res/
├── build.gradle                  # classpath Kotlin
├── settings.gradle
├── variables.gradle              # versions verrouillées
└── gradlew                       # wrapper Gradle 8.14.3
```

## Ajouter un module métier

1. Créer `src/modules/<nom>/` avec l'**interface** d'abord, puis l'implémentation.
2. Câbler dans `src/app/services.ts`.
3. Mettre à jour `FEATURES` dans `src/config/app.config.ts`.
4. Tests unitaires à côté (`*.test.ts`) — Vitest, environnement Node.
5. Mettre à jour `docs/ROADMAP.md` si la fonctionnalité change de statut.

## Ajouter une méthode au plugin natif

1. Kotlin : `@PluginMethod` dans `AmsNativePlugin.kt`
   (ou `AmsPlayerPlugin.kt` pour la lecture).
2. TypeScript : signature dans `src/plugins/amsNative.ts`
   (ou `src/plugins/amsPlayer.ts`).
3. Gérer l'indisponibilité côté web (rejet propre).

## Tests

```bash
npm test
```
Couverture (165 tests, étape 3+) :
- normalisation : exemples du cahier (4 variantes
  « Gims - Spider » → « gims spider »), qualité,
  promotionnels, marqueurs de version conservés ;
- matching : seuils 95 %/80 %, trois états, original
  vs remix jamais confondus, artiste divergent ;
- playlist : vide ≠ erreur ≠ indisponible, clé manquante,
  pagination, vidéos privées/supprimées (fetch simulé) ;
- scan : formats, fichiers sans métadonnée, dossier
  vide, dossier inaccessible ;
- exclusions : individuelles, groupées, persistance
  (redémarrage), réinitialisation, isolation entre
  playlists ;
- décisions : création, résolutions, persistance ;
- planificateur : les règles de bibliothèque,
  prime des exclusions, décisions lève-ambiguïté ;
- téléchargement : jamais d'écrasement d'un fichier
  préexistant, décollision de nom bornée ;
- lecteur : file d'attente, bouclage suivant/précédent,
  pause/reprise, avance rapide, fin automatique,
  erreurs honnêtes ;
- favoris et playlists utilisateur : CRUD, persistance
  (redémarrage), stockage corrompu ignoré.

## CI (GitHub Actions)

`.github/workflows/ci.yml` :
- Job `web` : lint, typecheck, tests, build.
- Job `android` : build de l'APK de débogage + artefact téléchargeable.

## Conventions de commits

Commits conventionnels, ex. :
`feat(ams): initialize Android application`, `feat(sync): …`,
`fix(normalization): …`, `docs: …`.

## Résolution de problèmes

- **`gradlew assembleDebug` échoue localement** : installez le SDK
  Android 36 via Android Studio (`sdkmanager "platforms;android-36"`).
- **Capacitor ne voit pas les dernières modifications** :
  `npm run build && npx cap sync android`.
- **Le bouton « Synchroniser maintenant » est grisé** : c'est
  intentionnel à l'étape 1 (`SYNC_ENGINE_READY = false`).
