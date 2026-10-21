# Tests et vérifications

## Exécutés dans ce dépôt (à chaque CI)

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Lint | `npm run lint` | ✅ ESLint propre |
| Types | `npm run typecheck` | ✅ TypeScript strict, 0 erreur |
| Tests unitaires | `npm test` | ✅ 187 tests / 25 fichiers |
| Build web | `npm run build` | ✅ Vite |
| Sync Capacitor | `npx cap sync android` | ✅ |
| Compile Android | `./gradlew assembleDebug --no-daemon` | ⚠️ Non exécuté localement : JDK/JAVA_HOME absents dans cet environnement. CI à exécuter sur cette révision. |

## Couverture unitaire (Vitest, environnement Node)

- **Normalisation** : empreintes, casse, ponctuation,
  marqueurs de version conservés (4 variantes
  « Gims - Spider »).
- **Matching** : seuils 95 %/80 %, trois états,
  original vs remix, artiste divergent.
- **Playlist** : import M3U/PLS local, vide ≠ erreur ≠ indisponible, clé manquante, pagination, vidéos privées/supprimées.
- **Scan local** : formats, sans métadonnée, dossier
  vide, dossier inaccessible.
- **Exclusions** : individuelles, groupées, persistance
  (redémarrage), réinitialisation, isolation.
- **Décisions** : création, résolutions, persistance.
- **Planificateur** : règles de bibliothèque, prime des
  exclusions, décisions lève-ambiguïté.
- **Fournisseurs** : Jamendo (recherche, métadonnées,
  téléchargement autorisé, pagination), YouTube
  (recherche, métadonnées, jamais de téléchargement),
  registry fédéré.
- **Téléchargement** : anti-écrasement, nom suffixé,
  fallback borné (pont défectueux), vérification du
  résultat (MIME audio + taille), HTML refusé.
- **Import d'URL** : résolution Jamendo, sonde HEAD,
  refus des pages non-audio.
- **Lecteur** : file d'attente, boucle suivante/
  précédente, pause/reprise, avance rapide, fin
  automatique, erreurs honnêtes.
- **Favoris / playlists utilisateur** : CRUD,
  persistance (redémarrage), stockage corrompu.
- **Orchestration de synchronisation** : exclusions
  premières, incertains jamais téléchargés, un seul
  enfilement par candidat, progression publiée,
  échecs collectés.
- **Diagnostic** : dérivation d'états réels, aucun
  « opérationnel » usurpé, export sans données
  personnelles.
- **Liste de suivi** : ajout/retrait, persistance,
  actualisation de disponibilité.

## Non exécutés dans cet environnement

- **Compilation Kotlin/Gradle** : aucun JDK/SDK Android
  dans le sandbox — le job CI `android` est la
  vérification réelle. Le code Kotlin est relu
  ligne par ligne (API standards uniquement).
- **Tests instrumentés Android** (`androidTest`) :
  nécessitent un appareil ou émulateur — à exécuter
  via Android Studio ou CI avec un runner Android.
- **Tests sur appareil réel** : lecture audio, SAF,
  DownloadManager, WorkManager — à valider sur
  téléphone après installation de l'APK.

## Honnêteté des tests

Un test écrit mais non lancé n'est jamais présenté
comme réussi. Les chiffres ci-dessus sont ceux de la
dernière exécution locale (`npm test`).
