# Architecture — A.MS (Arkanos Music Sync)

## Vue d'ensemble

Application Android **hybride Capacitor 8** : l'interface et la logique
métier sont écrites en React 19 + TypeScript, compilées par Vite 7, puis
embarquées dans un APK Android natif via Capacitor. Les fonctions
nécessitant le système (lecture média, notifications, planification)
passent par deux plugins Capacitor personnalisés (`AmsNative`, `AmsPlayer`)
écrits en Kotlin. La persistance de l'interface est le `localStorage` de
la WebView ; Room n'est pas utilisé.

Ce n'est **pas** une WebView pointant vers un serveur local : le bundle
web est packagé dans l'APK et l'application fonctionne hors ligne.

```
┌────────────────────────────────────────────────────────┐
│  APK Android (com.arkanos.ams) — Kotlin                │
│  ┌──────────────┐   ┌─────────────┐   ┌────────────┐  │
│  │ MainActivity │──▶│ AmsNative / │──▶│ SAF + Android│ │
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

### Fournisseurs (`src/modules/providers/`) — étape 3
- `SearchProvider` : recherche/découverte.
- `MetadataProvider` : métadonnées complémentaires.
- `AuthorizedDownloadProvider` : téléchargement quand
  l'artiste et le fournisseur l'autorisent.
- `PlaylistProvider` : analyse de playlists.
- `LocalLibraryProvider` : comparaison avec les fichiers
  locaux.
- Capacités déclarées par fournisseur (`capabilities`) —
  un fournisseur « recherche seule » n'est jamais présenté
  comme fournisseur de téléchargement.
- Intégrés : **Jamendo** (recherche + téléchargement
  autorisé, CC) et **YouTube** (recherche + métadonnées
  uniquement — jamais de téléchargement).
- Voir [PROVIDERS.md](PROVIDERS.md).

### Moteur de téléchargement (`src/modules/download/`)
- **Android DownloadManager** (natif, robuste) : file
  d'attente, progression réelle (octets), annulation,
  reprise sur interruption réseau gérée par le système,
  fichiers temporaires système, notifications système.
- Vérification du résultat : statut + type MIME audio +
  taille non nulle — un HTML reçu est un ÉCHEC, jamais
  un succès.
- Anti-écrasement : suffixe automatique côté web + garde
  native (`DOWNLOAD_TARGET_EXISTS`).
- Écriture sécurisée : dossier SAF choisi (permission
  persistante) ou Téléchargements système.

### Association playlist ↔ fournisseurs (`src/modules/association/`)
- Recherche de versions téléchargeables autorisées d'un
  morceau de playlist ; comparaison bibliothèque ;
  incertitude → confirmation explicite ; exclusions
  partie 2 toujours appliquées ; versions multiples
  présentées distinctement.

### Import d'URL (`src/modules/import/`)
- Jamendo : résolution API officielle ; YouTube :
  ouverture uniquement (jamais d'extraction) ; autre :
  sonde native HEAD — seules les ressources audio directes
  acceptées. Aucun contournement de paywall/DRM.

### Conversion (`src/modules/conversion/`)
- Non intégrée (voir TECHNOLOGIES.md) : aucune solution
  vérifiée compatible Android + MIT. JAMAIS simulée.

### Liste de suivi (`src/modules/watchlist/`)
- Morceaux YouTube suivis ; disponibilité vérifiée via
  l'API officielle (privé/supprimé signalé).

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
- WorkManager peut relancer un comptage périodique (best effort Android) ; ce worker ne fait pas une synchronisation complète de playlist et ne met pas à jour la bibliothèque persistée.

### Persistance locale
- Les réglages, scans, favoris, playlists utilisateur, décisions et historique sont conservés dans le `localStorage` de la WebView.
- Le stockage reste présent après fermeture/réouverture ordinaire, mais pas garanti après effacement des données ou désinstallation.
- Room/SQLite n'est pas utilisé et a été retiré pour ne pas embarquer une couche morte.

### Historique (`src/modules/history/`) — **opérationnel**
- Consigne les événements réels (démarrage, tentatives, erreurs).

### Pont natif (`src/plugins/amsNative.ts` ↔ `AmsNativePlugin.kt`)
- `isNativeAvailable`, `getDeviceInfo` (réels dès l'étape 1) ;
  `notify`, `scanLibrary` (réels) ;
- `requestNotificationPermission` /
  `getNotificationPermissionStatus` (Android 13+) ;
- `schedulePeriodicSync` / `cancelPeriodicSync` /
  `isPeriodicSyncScheduled` (WorkManager réel) ;
- `schedulePeriodicSync` n'exécute rien par lui-même :
  il planifie l'analyse périodique.

### Lecteur (`src/modules/player/` + `AmsPlayerPlugin.kt`) — **opérationnel**
- MediaPlayer Android : play/pause/stop/seekTo/getStatus ;
- sources jouables : bibliothèque scannée (content:// SAF)
  et téléchargements terminés (URI locale) — jamais de
  flux distant, jamais d'extraction YouTube ;
- file d'attente, morceau suivant/précédent, fin
  automatique, état réel du lecteur (polling 500 ms).

### Favoris et playlists utilisateur (`src/modules/favorites/`, `src/modules/userplaylist/`)
- Persistés en local (localStorage de la WebView) ;
- favori : identité stable `source:ref` (distant) ou
  URI locale (jouable) ;
- playlist : liste d'identifiants jouables résolus
  au moment de la lecture (non résolu = ignoré,
  jamais remplacé par une fausse source).

### Orchestration de synchronisation (`src/modules/sync/NativeSyncEngine.ts`) — **opérationnelle**
- Analyse de playlist persistée → planification
  (SyncPlanner : exclusions et décisions premières)
  → association (PlaylistAssociation) → file
  DownloadManager ;
- un seul enfilement par candidat éligible ;
- erreurs par morceau collectées dans le rapport,
  jamais masquées ;
- progression réelle (phases + %) par abonnement.

### Arrière-plan (WorkManager)
- `AmsScanWorker` (CoroutineWorker) : analyse
  périodique réelle de la bibliothèque (URI SAF
  persistée) + notification du résultat ;
- contraintes honnêtes : réseau connecté, batterie
  non faible, intervalle 12 h — **aucune heure
  exacte garantie** par Android ;
- l'orchestration complète (playlist → téléchargements)
  reste pilotée depuis l'application ouverte.

### Diagnostic (`src/modules/diagnostics/`)
- État réel dérivé de sondes concrètes (natif,
  stockage, configuration) — jamais « tout
  opérationnel » par défaut ;
- états : opérationnel, limité, indisponible,
  autorisation requise, erreur, non testé ;
- rapport exportable (JSON, données de
  configuration uniquement).

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
  → téléchargements autorisés (DownloadManager) → historique local
  → orchestration (étape 4) : association fournisseurs
    autorisés → DownloadManager → rapport réel
  → arrière-plan : WorkManager analyse périodique
```

### Persistance
- Exclusions, décisions, playlist, bibliothèque, paramètres, favoris et playlists utilisateur : `localStorage` de la WebView Capacitor.
- Le contenu n'est pas sauvegardé vers Room/SQLite ni vers un serveur.

### Identités stables
- Exclusion : (sourceId = id playlist, trackRef = id vidéo).
  Survit à la fermeture, au redémarrage et à une nouvelle
  analyse ; prime sur l'automatisme ; jamais annulée
  silencieusement.

## Décisions architecturales

1. **Kotlin dès la base** — le template Capacitor Android est Java par
   défaut ; il a été converti (MainActivity + modules) conformément au
   cahier des charges.
2. **Pas de base native Room** — les DAOs n'étaient jamais raccordés au pont ; supprimer ce code mort évite d'embarquer une dépendance inactive. Les données métier restent en localStorage pour cette version.
3. **HashRouter** — aucun serveur requis pour le routage dans la WebView.
4. **CSS pur** — pas de framework UI : empreinte minimale pour les
   smartphones d'entrée de gamme.
5. **Stubs honnêtes** — chaque module non implémenté renvoie une erreur
   ou un statut explicite ; jamais de fausses données.
6. **Dépendances exactes** (pas de `^`) + `package-lock.json` :
   reproductibilité totale.
