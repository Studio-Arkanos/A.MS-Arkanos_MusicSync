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

## Étape 4 — finition & livraison
- [ ] Exécution de la synchronisation globale
      (orchestration scan → plan → téléchargements)
- [ ] Tâches en arrière-plan (WorkManager)
- [ ] Pont web ↔ Room (persistance native unifiée)
- [ ] Permission POST_NOTIFICATIONS demandée au runtime
- [ ] Tests instrumentés Android (device réel)
- [ ] Build release (signing, Play Store)
- [ ] Accessibilité complète, localisations supplémentaires

> Distinction honnête : développé et testé unitairement
> dans ce sandbox (165 tests) ; le build APK et les
> tests sur appareil réel sont exécutés par CI et
> Android Studio — non réalisés dans cet environnement.
