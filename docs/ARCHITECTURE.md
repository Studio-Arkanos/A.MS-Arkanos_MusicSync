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
- Rabat d'accents, ligature œ, minuscules, suppression de la
  ponctuation, empreinte de comparaison (`buildFingerprint`),
  Levenshtein pour les quasi-doublons.

### Détection des doublons (`src/modules/duplicates/`) — **opérationnel**
- Doublons exacts (empreinte) et quasi-doublons (même artiste +
  titre proche), clustering par union-find.

### Exclusions (`src/modules/exclusions/`) — **opérationnel**
- Règles titre / artiste / dossier / regex, activables individuellement.

### Fournisseurs de recherche (`src/modules/search/`)
- Registre de `SearchProvider`. **Aucun fournisseur enregistré** à
  l'étape 1 : `searchAll()` renvoie une liste vide réelle.

### Fournisseurs de téléchargement autorisés (`src/modules/download/`)
- Liste blanche (`ALLOWED_DOWNLOAD_PROVIDERS`, vide à l'étape 1) +
  `DownloadManager` stub qui refuse les téléchargements.

### Notifications (`src/modules/notifications/`)
- Délégation au plugin natif ; l'appel échoue proprement tant que la
  couche native n'est pas implémentée (étape 3).

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

## Flux de données (cible étape 2)

```
scan local (MediaStore) → normalisation → déduplication
  → comparaison catalogue distant (fournisseurs autorisés)
  → décisions (télécharger / garder / exclure / en attente)
  → téléchargements (liste blanche) → Room → historique
```

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
