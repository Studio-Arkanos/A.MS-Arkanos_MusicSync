<p align="center">
  <img src="public/branding/ams-badge.png" alt="Logo officiel A.MS — Arkanos Music Sync" width="160" height="160" />
</p>

# A.MS — Arkanos Music Sync

<p align="center">
  <strong>Synchronisation musicale intelligente, autonome &amp; locale pour audiophiles</strong><br />
  Organisation : <strong>Studio-Arkanos</strong> · Identifiant Android : <code>com.arkanos.ams</code> · Langue : français.
</p>

> **Statut : étape 4/4 — finalisation et livraison.**
> Application Android complète : orchestration de
> synchronisation réelle (plan → association →
> DownloadManager), lecteur natif (fichiers locaux),
> favoris, playlists utilisateur, arrière-plan
> WorkManager, permission runtime de notification,
> écran de diagnostic, APK produit par CI.
> La conversion audio n'est PAS intégrée
> (aucune solution vérifiée — documenté).
> Aucune donnée n'est jamais simulée.

## Identité visuelle & Logo officiel

Le logo officiel d'**A.MS** réunit les dimensions fondamentales du projet :
- **L'arche orbitale cyan électrique** : symbolise la synchronisation dynamique continue et l'échange de métadonnées.
- **Le « A » d'or angulaire** : signature emblématique de l'écosystème *Studio-Arkanos*.
- **L'égaliseur audio central** : ondes sonores verticales dorées incarnant le cœur musical et l'analyse de bibliothèque.
- **Le badge squircle nuit & lueur bleue** : intégration moderne et lisibilité maximale sur thème sombre.

### Ressources graphiques (`public/branding/`)

- `public/branding/ams-logo.png` : image source officielle complète (1254 × 1254 px, badge + typographie A.MS).
- `public/branding/ams-badge.png` : badge squircle détouré pour l'interface web, les bannières et la documentation.
- `public/branding/ams-symbol.png` : symbole épuré haute résolution (A + halo + ondes, fond transparent) pour les icônes applicatives.
- `public/branding/ams-symbol-{64,128,192,512}.png` & `favicon.png` : déclinaisons pré-dimensionnées nettes à toute résolution.
- **Icônes Android** : adaptive icon (`mipmap-*/ic_launcher_foreground.png` centré dans la zone sûre de 66 dp sur fond `#0B1220`) et icônes legacy rondes et squircles (`ic_launcher.png`, `ic_launcher_round.png`).
- **Écrans de démarrage (Splash)** : fonds natifs Android (`drawable-*/splash.png`) aux couleurs officielles Arkanos.

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
| Exécution de synchronisation (orchestration) | ✅ Opérationnelle (Android) |
| Arrière-plan (WorkManager — analyse périodique) | ✅ Opérationnel (Android) |
| Écran de diagnostic | ✅ Opérationnel (états réels) |
| Conversion audio | ⚪ Non intégrée (documenté) |
| Pont web ↔ Room | 🟡 Préparé, non connecté |

## Fournisseurs

- **Jamendo** — recherche, métadonnées, téléchargement
  autorisé (`audiodownload_allowed`, licences Creative
  Commons affichées). client_id requis (gratuit).
- **YouTube** — recherche et métadonnées UNIQUEMENT.
  Aucune extraction audio (conditions d'utilisation).
  clé API v3 requise.

Détail : [docs/PROVIDERS.md](docs/PROVIDERS.md).

## APK (artefact CI)

L'APK installable est produit par GitHub Actions :
menu **Actions** → workflow **Android APK** →
artefact **A-MS-debug** (`A-MS-debug.apk`).
Installation, mise à jour, précautions debug vs
release : [docs/INSTALLATION.md](docs/INSTALLATION.md).
Build local et signature release :
[docs/BUILD_ANDROID.md](docs/BUILD_ANDROID.md).
Limitations réelles : [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

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
npm test               # 178 tests unitaires
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
- [docs/INSTALLATION.md](docs/INSTALLATION.md)
- [docs/BUILD_ANDROID.md](docs/BUILD_ANDROID.md)
- [docs/TESTS.md](docs/TESTS.md)
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)

## Licence

MIT — Studio-Arkanos.
