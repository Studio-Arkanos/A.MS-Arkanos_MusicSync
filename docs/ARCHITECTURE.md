# Architecture — A.MS (Arkanos Music Sync)

## Vue d'ensemble

Application Android **hybride Capacitor 8** : l'interface et la logique
métier sont écrites en React 19 + TypeScript, compilées par Vite 7, puis
embarquées dans un APK Android natif via Capacitor. Les fonctions
nécessitant le système (lecture média, notifications, planification)
passent par un **plugin Capacitor personnalisé** (`AmsNative`) écrit en
Kotlin. La persistance utilise **Room** (SQLite) côté Android.

Ce n'est **pas** une WebView pointant vers un serveur local : le bundle
web est packagé dans l'APK et l'application fonctionne hors ligne.

```
┌────────────────────────────────────────────────────────┐
│  APK Android (com.arkanos.ams) — Kotlin                │
│  ┌──────────────┐   ┌─────────────┐   ┌────────────┐  │
│  │ MainActivity │──▶│ AmsNative   │──▶│ Room/SQLite│  │
│  │ (Bridge)     │   │ (plugin)    │   │ AppDatabase│  │
│  └──────────────┘   └──────┬──────┘   └────────────┘  │
│                            │ JSBridge (Capacitor)      │
│  ┌─────────────────────────▼─────────────────────────┐ │
│  │ WebView systeme — bundle Vite (dist/)             │ │
│  │  React 19 + TS : UI, navigation, modules métier   │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Couches et modules

### Interface (`src/screens/`, `src/components/`, `src/navigation/`)
- 7 écrans : Accueil, Playlist, Recherche, Bibliothèque, Téléchargements,
  Historique, Paramètres.
- Navigation par onglets basse (React Router, mode `HashRouter` —
  aucune configuration de serveur requise dans la WebView).
- Style : bleu nuit / gris anthracite / texte clair, accents dorés
  parcimonieux, mode sombre, cibles tactiles ≥ 48 px, animations
  légères (180 ms), CSS pur sans framework (performances entrée de gamme).

### Configuration (`src/config/`)
- `app.config.ts` : métadonnées, drapeaux de fonctionnalités
  (`FEATURES`), état du moteur de synchronisation (`SYNC_ENGINE_READY`).

### Moteur de synchronisation (`src/modules/sync/`)
- `SyncEngine` (interface) + `SyncEngineStub`.
- Le stub **refuse** de synchroniser (`SyncEngineError: NOT_CONFIGURED`)
  au lieu de simuler. L'écran Accueil désactive le bouton tant que
  `ready === false`.

### Scan de la bibliothèque locale (`src/modules/scanner/`)
- `LocalLibraryScanner` (interface) + `LocalScannerStub`.
- Résultat honnête : `status: 'not_operational'`, liste vide, raison
  explicite. Aucun morceau inventé.

### Normalisation (`src/modules/normalization/`) — **opérationnel**
- `parseTrackName` : extension, qualité (128K/320K/720P/
  1080P/4K), promotionnels (Official, Clip Officiel,
  Visualizer, Lyrics…) supprimés ; marqueurs de version
  (Remix, Live, Acoustic, Instrumental, Sped Up, Slowed,
  Reverb, Radio Edit…) **conservés** ; séparation
  « Artiste - Titre ».
- Empreinte (`buildFingerprint`), Levenshtein, rabat
  d'accents, ligature œ.

### Détection des doublons (`src/modules/duplicates/`) — **opérationnel**
- `DuplicateDetector` : doublons exacts (empreinte) et
  quasi-doublons intra-bibliothèque (union-find).
- `DuplicateMatcher` : matching playlist ↔ bibliothèque —
  empreinte, similarité textuelle, mots significatifs
  (Jaccard), marqueurs de version, artiste. Seuils
  configurables 95 %/80 % → Déjà présent / Incertain /
  Absent. Un score élevé ne confond jamais un original
  et un remix.

### Exclusions (`src/modules/exclusions/`) — **opérationnel**
- `ExclusionEngine` : règles automatiques (titre/artiste/
  dossier/regex).
- `PersistedExclusionStore` : exclusions manuelles,
  identité stable (sourceId + trackRef), persistantes,
  prime sur l'automatisme, réintégration explicite.

### Fournisseurs de recherche (`src/modules/search/`)
- Registre de `SearchProvider`. **Aucun fournisseur enregistré** :
  `searchAll()` renvoie une liste vide réelle (étape 3).

### Fournisseurs de téléchargement autorisés (`src/modules/download/`)
- Liste blanche (`ALLOWED_DOWNLOAD_PROVIDERS`, vide) +
  `DownloadManager` stub : refuse les téléchargements ET
  refuse explicitement toute cible existante (jamais
  d'écrasement).

### Analyse de playlist (`src/modules/playlist/`)
- Playlist initiale « Zenith », URL modifiable.
- Fournisseur officiel YouTube Data API v3 (clé stockée
  localement) : pagination, lot de 50 vidéos, statuts
  available / private / deleted / unavailable.
- **Playlist vide ≠ erreur ≠ indisponible** — trois
  statuts distincts.
- Récupérer les métadonnées d'une vidéo ne signifie
  PAS que son audio soit téléchargeable (étape 3,
  liste blanche).

### Planificateur de synchronisation (`src/modules/sync/planner.ts`)
- Règles : bibliothèque vide → tout admissible est
  candidat ; partiellement synchronisée → seuls les
  manquants ; synchronisée → aucun candidat.
- Résumé (trouvés/présents/absents/incertains/exclus/
  indisponibles/candidats) présenté AVANT toute opération.
- Les incertains ne bloquent rien : ils deviennent des
  décisions en attente, traitées séparément.

### Décisions (`src/modules/decisions/`)
- Décisions en attente persistées, trois résolutions
  possibles (« Déjà présent », « Autoriser le
  téléchargement », « Ignorer »), notification native
  ouvrant l'écran du morceau (deep-link `/track/:ref`).

### Tâches en arrière-plan (`src/modules/background/`)
- `BackgroundTaskScheduler` stub ; WorkManager à l'étape 3.

### Base de données (`src/modules/database/` + `android/…/data/`)
- Côté web : interfaces de dépôts + implémentations en mémoire **vides**
  (réelles, sans données de démonstration).
- Côté Android : `AppDatabase` (Room), `TrackEntity`, `TrackDao`
  déjà compilables ; connexion au plugin à l'étape 2.

### Historique (`src/modules/history/`) — **opérationnel**
- Consigne les événements réels (démarrage, tentatives, erreurs).

### Pont natif (`src/plugins/amsNative.ts` ↔ `AmsNativePlugin.kt`)
- `isNativeAvailable`, `getDeviceInfo` (réels dès l'étape 1) ;
  `notify`, `scanLibrary`, `schedulePeriodicSync` (stubs honnêtes).

## Flux de données (étape 2, en place)

```
analyse playlist (YouTube Data API v3, clé officielle)
  ↘
scan local (SAF / DocumentFile) → normalisation (nom de fichier)
  → matching multi-critères (empreinte, similarité, mots,
    marqueurs de version, artiste)
  → exclusions (stockage local, identité stable)
  → plan : présent / incertain (décision) / absent (candidat)
  → résumé affiché AVANT toute opération
  → téléchargements (liste blanche — étape 3) → Room → historique
```

### Persistance (étape 2)
- Exclusions, décisions, playlist, bibliothèque, paramètres :
  localStorage de la WebView Capacitor (survit au redémarrage).
- Schéma Room complet côté Android (tracks, exclusions,
  pending_decisions, playlists) — pont web ↔ Room à l'étape 3.

### Identités stables
- Exclusion : (sourceId = id playlist, trackRef = id vidéo).
  Survit à la fermeture, au redémarrage et à une nouvelle
  analyse ; prime sur l'automatisme ; jamais annulée
  silencieusement.

## Décisions architecturales

1. **Kotlin dès la base** — le template Capacitor Android est Java par
   défaut ; il a été converti (MainActivity + modules) conformément au
   cahier des charges.
2. **kapt (pas KSP) pour Room** — évite le couplage de version
   KSP/compilateur Kotlin à cette étape de démarrage.
3. **HashRouter** — aucun serveur requis pour le routage dans la WebView.
4. **CSS pur** — pas de framework UI : empreinte minimale pour les
   smartphones d'entrée de gamme.
5. **Stubs honnêtes** — chaque module non implémenté renvoie une erreur
   ou un statut explicite ; jamais de fausses données.
6. **Dépendances exactes** (pas de `^`) + `package-lock.json` :
   reproductibilité totale.
