# A.MS — Arkanos Music Sync

Application Android de gestion, synchronisation, recherche et téléchargement musical.
Organisation : **Studio-Arkanos** · Identifiant Android : `com.arkanos.ams` · Langue : français.

> **Statut : étape 1/4 — fondations.** L'architecture, l'interface et les modules
> métier sont en place. Le moteur de synchronisation, le scan local, les
> fournisseurs et les téléchargements sont **préparés mais non implémentés**
> (voir [docs/ROADMAP.md](docs/ROADMAP.md)). Aucune donnée n'est simulée.

## Fonctionnalités par module

| Module | Statut étape 1 |
| --- | --- |
| Normalisation des noms | ✅ Opérationnel (testé) |
| Détection des doublons | ✅ Opérationnel (testé) |
| Gestion des exclusions | ✅ Opérationnel (testé) |
| Historique des opérations | ✅ Opérationnel (réel) |
| Moteur de synchronisation | 🟡 Stub honnête (étape 2) |
| Scan de la bibliothèque locale | 🟡 Stub honnête (étape 2) |
| Fournisseurs de recherche | ⚪ Préparé (étape 2) |
| Fournisseurs de téléchargement autorisés | ⚪ Préparé (étapes 2–3) |
| Notifications / arrière-plan | 🟡 Stub (étape 3) |
| Base de données Room | 🟡 Schéma prêt (étape 2) |

## Prérequis

- **Node.js ≥ 22** (compilation uniquement — pas besoin sur le téléphone)
- Android Studio (pour construire l'APK) ou GitHub Actions
- L'application finale est **100 % autonome** : aucun Termux, Python, Node.js,
  PostgreSQL, serveur web ou VPS requis sur l'appareil.

## Installation et développement

```bash
npm ci                 # installer les dépendances verrouillées
npm run dev            # serveur de développement web (preview)
npm run typecheck      # vérification TypeScript
npm run lint           # lint
npm test               # tests unitaires (Vitest)
npm run build          # build web → dist/
npx cap sync android   # injecter le build dans le projet Android
npx cap open android   # ouvrir dans Android Studio
```

## Architecture

Hybrid **Capacitor 8** : interface React 19 + TypeScript + Vite 7, emboutie
dans un APK Android natif (Kotlin), avec Room/SQLite pour la persistance et
un plugin Capacitor personnalisé (`AmsNative`) pour les fonctions natives.

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture et décisions
- [docs/TECHNOLOGIES.md](docs/TECHNOLOGIES.md) — choix technologiques vérifiés
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — guide de développement
- [docs/ROADMAP.md](docs/ROADMAP.md) — fonctions restantes par étape

## Structure du projet

```
src/                    # Application web (React + TS)
  config/               # Configuration, statuts de fonctionnalités
  domain/               # Types métier
  modules/              # Modules métier (sync, scan, doublons, exclusions…)
  plugins/              # Pont vers le plugin natif AmsNative
  navigation/           # Navigation par onglets (7 écrans)
  screens/              # Écrans (Accueil, Playlist, Recherche…)
  components/           # Composants UI
  i18n/                 # Chaînes françaises
android/                # Projet Android natif (Kotlin, Room)
  app/…/plugins/        # Plugin Capacitor AmsNative
  app/…/data/           # Base Room (SQLite)
.github/workflows/      # CI : lint, tests, build, APK
docs/                   # Documentation
```

## Licence

MIT — Studio-Arkanos.
