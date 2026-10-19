# A.MS — Arkanos Music Sync

Application Android de gestion, synchronisation, recherche
et téléchargement musical. Organisation : **Studio-Arkanos** ·
Identifiant Android : `com.arkanos.ams` · Langue : français.

> **Statut : étape 3+/4 — lecteur, favoris, playlists utilisateur.**
> Recherche fédérée (Jamendo + YouTube), moteur de téléchargement
> natif (Android DownloadManager) pour les sources autorisées,
> association playlist ↔ fournisseurs, import d'URL vérifié,
> liste de suivi, **lecture des fichiers locaux** (MediaPlayer),
> **favoris** et **playlists utilisateur** persistés.
> La conversion audio n'est PAS intégrée
> (aucune solution vérifiée — documenté).
> Aucune donnée n'est jamais simulée.

## Fonctionnalités par module

| Module | Statut |
| --- | --- |
| Analyse de playlist (YouTube Data API v3) | ✅ Opérationnel (clé requise) |
| Scan de bibliothèque locale (SAF) | ✅ Opérationnel (Android) |
| Normalisation / doublons / exclusions | ✅ Opérationnels (testés) |
| Décisions en attente + notifications | ✅ Opérationnel |
| Recherche fédérée (Jamendo + YouTube) | ✅ Opérationnelle |
| Téléchargement autorisé (Jamendo, DownloadManager) | ✅ Opérationnel (Android) |
| Association playlist ↔ fournisseurs | ✅ Opérationnelle |
| Import d'URL vérifié | ✅ Opérationnel |
| Liste de suivi YouTube | ✅ Opérationnelle |
| Lecteur audio (fichiers locaux + téléchargements) | ✅ Opérationnel (Android) |
| Favoris | ✅ Opérationnels (persistés) |
| Playlists utilisateur | ✅ Opérationnelles (persistées) |
| Conversion audio | ⚪ Non intégrée (documenté) |
| Exécution de synchronisation globale | 🟡 Étape 4 |
| Tâches en arrière-plan (WorkManager) | 🟡 Étape 4 |

## Fournisseurs

- **Jamendo** — recherche, métadonnées, téléchargement
  autorisé (`audiodownload_allowed`, licences Creative
  Commons affichées). client_id requis (gratuit).
- **YouTube** — recherche et métadonnées UNIQUEMENT.
  Aucune extraction audio (conditions d'utilisation).
  clé API v3 requise.

Détail : [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Prérequis

- **Node.js ≥ 22** (compilation uniquement)
- Android Studio / GitHub Actions pour l'APK
- Clés : YouTube Data API v3 (Google Cloud) et/ou
  Jamendo client_id (devportal.jamendo.com) — stockées
  localement, jamais envoyées ailleurs que vers les API
  officielles.

L'application finale est **100 % autonome** : aucun
Termux, Python, Node.js, PostgreSQL, serveur web ou
VPS requis sur l'appareil.

## Installation et développement

```bash
npm ci                 # dépendances verrouillées
npm run dev            # dev web (preview)
npm run typecheck      # TypeScript strict
npm run lint           # ESLint
npm test               # 165 tests unitaires
npm run build          # build web → dist/
npm run cap:sync       # injection dans le projet Android
npm run cap:open:android
npm run android:build  # APK debug (requiert le SDK)
```

## Garanties implémentées

- Téléchargement **uniquement** depuis des sources
  autorisées (Jamendo avec `audiodownload_allowed`) ;
- un fichier existant n'est **jamais écrasé**
  (suffixe automatique + garde native) ;
- le résultat est **vérifié** (type MIME audio, taille)
  — un HTML reçu est un échec, jamais un succès ;
- les exclusions de l'étape 2 priment sur tout
  automatisme de téléchargement ;
- les correspondances incertaines exigent une
  confirmation explicite ;
- la lecture couvre UNIQUEMENT les fichiers locaux
  (bibliothèque scannée, téléchargements autorisés)
  — jamais de flux distant, jamais d'extraction
  YouTube ;
- aucune extraction YouTube, aucun contournement de
  paywall/DRM.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/TECHNOLOGIES.md](docs/TECHNOLOGIES.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/PROVIDERS.md](docs/PROVIDERS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Licence

MIT — Studio-Arkanos.
