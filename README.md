# A.MS — Arkanos Music Sync

Application Android de gestion, synchronisation, recherche et
téléchargement musical. Organisation : **Studio-Arkanos** ·
Identifiant Android : `com.arkanos.ams` · Langue : français.

> **Statut : étape 2/4 — playlist, bibliothèque, doublons, exclusions.**
> L'analyse de playlist (YouTube Data API v3 officielle), le scan
> local (SAF), la normalisation avancée, la détection de doublons
> multi-critères et les exclusions manuelles persistantes sont
> implémentés. Le téléchargement réel arrive à l'étape 3.
> Aucune donnée n'est jamais simulée.

## Fonctionnalités par module

| Module | Statut étape 2 |
| --- | --- |
| Analyse de playlist (YouTube Data API v3) | ✅ Opérationnel (clé requise) |
| Scan de bibliothèque locale (SAF) | ✅ Opérationnel (Android) |
| Normalisation des noms | ✅ Opérationnel (testé) |
| Détection des doublons multi-critères | ✅ Opérationnel (testé) |
| Exclusions manuelles persistantes | ✅ Opérationnel (testé) |
| Décisions en attente | ✅ Opérationnel (testé) |
| Planificateur de synchronisation | ✅ Opérationnel (testé) |
| Notifications (canal + deep-link) | ✅ Natif implémenté |
| Historique des opérations | ✅ Opérationnel |
| Moteur de téléchargement | 🟡 Stub honnête (étape 3) |
| Fournisseurs de recherche | ⚪ Préparé (étape 3) |
| Tâches en arrière-plan (WorkManager) | 🟡 Stub (étape 3) |

## Prérequis

- **Node.js ≥ 22** (compilation uniquement — pas besoin sur le téléphone)
- Android Studio (pour construire l'APK) ou GitHub Actions
- Une clé **YouTube Data API v3** (Google Cloud Console) pour
  l'analyse de playlist — stockée localement, jamais envoyée
  ailleurs que vers googleapis.com

L'application finale est **100 % autonome** : aucun Termux,
Python, Node.js, PostgreSQL, serveur web ou VPS requis sur
l'appareil.

## Installation et développement

```bash
npm ci                 # installer les dépendances verrouillées
npm run dev            # serveur de développement web (preview)
npm run typecheck      # vérification TypeScript
npm run lint           # lint
npm test               # tests unitaires (Vitest, 85 tests)
npm run build          # build web → dist/
npm run cap:sync       # injecter le build dans le projet Android
npm run cap:open:android
npm run android:build  # APK debug (nécessite le SDK Android)
```

## Points clés de l'étape 2

- **Playlist initiale** : « Zenith »
  (`PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub`), URL modifiable dans
  l'écran Playlist.
- **Bibliothèque** : dossier par défaut
  `/storage/emulated/0/Music/Musics`, sélection via le Storage
  Access Framework (autorisation persistante), formats MP3,
  M4A, AAC, FLAC, OGG, WAV, reconnaissance par nom de fichier
  (aucune métadonnée requise).
- **Normalisation** : « Gims - Spider (Clip Officiel).mp3 »,
  « Gims - Spider 128K.mp3 », « GIMS - Spider (Official Music
  Video).mp3 » et « GIMS - Spider [Visualizer].mp3 » donnent
  tous la clé **« gims spider »** ; les marqueurs de version
  (Remix, Live, Acoustic, Instrumental, Sped Up, Slowed,
  Reverb, Radio Edit…) sont conservés.
- **Doublons** : empreinte exacte, similarité textuelle,
  mots significatifs, marqueurs de version — seuils 95 % /
  80 % configurables ; trois états (Déjà présent / Incertain /
  Absent) ; un remix n'est jamais confondu avec un original.
- **Exclusions** : persistantes (identité stable source +
  morceau), survivent au redémarrage et à une nouvelle
  analyse, priment sur l'automatisme, ne suppriment jamais
  la chanson de la playlist source, réintégration explicite,
  réinitialisation après confirmation.
- **Anti-écrasement** : un fichier existant n'est jamais
  écrasé (garantie testée).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/TECHNOLOGIES.md](docs/TECHNOLOGIES.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Licence

MIT — Studio-Arkanos.
