# Feuille de route

## Étape 1 — fondations ✅
Architecture modulaire, interface 7 écrans, CI,
plugin natif, Room (schéma).

## Étape 2 — playlist, bibliothèque, doublons, exclusions ✅
Playlist Zenith, analyse YouTube, scan SAF,
normalisation avancée, matching multi-critères,
exclusions persistantes, planificateur, décisions.

## Étape 3 — recherche, fournisseurs, téléchargements ✅
- [x] Centre de recherche (titre/artiste/album/mots-clés/URL)
- [x] Architecture de fournisseurs modulaire (5 interfaces,
      capacités déclarées honnêtement)
- [x] YouTube : recherche + métadonnées + liste de suivi
      (jamais de téléchargement)
- [x] Jamendo : recherche + téléchargement autorisé
      (audiodownload_allowed, licences CC)
- [x] Moteur de téléchargement natif (DownloadManager) :
      file, progression réelle, annulation, reprise
      système, vérification du résultat, anti-écrasement
- [x] Association playlist ↔ fournisseurs autorisés
- [x] Import d'URL vérifié (sonde native, refus des
      pages non-audio, YouTube en ouverture seule)
- [ ] Conversion audio : **non intégrée** — aucune
      solution vérifiée compatible Android + MIT
      (FFmpegKit évalué : licence incompatible,
      build non vérifiable ici). Interface prête.

## Étape 3+ — lecteur, favoris, playlists ✅
- [x] Lecteur natif (MediaPlayer) : file d'attente,
      lecture/pause/arrêt, avance rapide, suivant/
      précédent, fin automatique — fichiers locaux
      (bibliothèque + téléchargements) UNIQUEMENT
- [x] Mini-lecteur + écran lecteur (/player)
- [x] Favoris persistés (identité stable source:ref
      ou URI locale)
- [x] Playlists utilisateur persistées (créer,
      renommer, supprimer, ajouter/retirer)
- [x] Correction : décollision de nom bornée dans le
      moteur de téléchargement (boucle non bornée
      découverte par les tests)

## Étape 4 — finalisation, tests, compilation, livraison ✅
- [x] Audit complet (TS, Kotlin, imports, permissions,
      navigation, persistance, construction)
- [x] Orchestration de synchronisation réelle
      (plan → association → DownloadManager)
- [x] WorkManager : analyse périodique de la
      bibliothèque (contraintes réseau + batterie)
- [x] Permission POST_NOTIFICATIONS au runtime
      (Android 13+)
- [x] Écran de diagnostic (états réels, export JSON)
- [x] Logo A.MS + signature Arkanos (SVG vectoriel,
      icône adaptive Android)
- [x] Affichage progressif de la bibliothèque
      (entrées de gamme)
- [x] Correction bloque compile : `JSONArray` non
      importé (parcours SAF) — l'APK ne compilait pas
- [x] Correction : décollision de nom bornée
      (moteur de téléchargement)
- [x] Workflow CI `android-apk.yml` : APK debug
      `A-MS-debug.apk` (artefact) + release signé
      (secrets, manuel, non bloquant)
- [x] Docs : INSTALLATION, BUILD_ANDROID, TESTS,
      KNOWN_LIMITATIONS
- [ ] Tests instrumentés Android (device réel)
- [ ] Pont web ↔ Room (alimentation de Room depuis
      l'interface — localStorage opérationnel en
      attendant, état « limité » au diagnostic)
- [ ] Accessibilité complète, localisations supplémentaires

> Distinction honnête : développé et testé unitairement
> dans ce sandbox (178 tests) ; la compilation Kotlin/Gradle
> et le build APK sont exécutés par CI (GitHub Actions) —
> non réalisés dans cet environnement (pas de SDK Android).
> Tests sur appareil réel : à effectuer après installation
> de l'APK (voir docs/INSTALLATION.md).
