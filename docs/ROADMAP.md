# Feuille de route — fonctions restantes

## Étape 1 — fondations ✅
Architecture modulaire, interface 7 écrans, CI, plugin natif
 squelette, Room (piste).

## Étape 2 — playlist, bibliothèque, doublons, exclusions ✅
- [x] Playlist initiale « Zenith » (URL modifiable, analyse,
      remplacement, consultation)
- [x] Analyse via YouTube Data API v3 officielle (clé requise) ;
      vidéos supprimées/privées/indisponibles identifiées ;
      playlist vide ≠ erreur
- [x] Scan local : SAF (Android 11+) / chemin direct (≤ 10),
      MP3/M4A/AAC/FLAC/OGG/WAV, nom de fichier seul suffisant
- [x] Normalisation enrichie (qualité, promotionnels, marqueurs
      de version conservés)
- [x] Matching multi-critères avec seuils 95 %/80 % configurables
      et trois états
- [x] Exclusions manuelles : individuelles/groupées, persistantes,
      réintégration, réinitialisation confirmée, filtres
- [x] Planificateur de synchronisation (résumé avant opération)
- [x] Décisions en attente + notifications natives avec deep-link
      vers l'écran du morceau
- [x] Schéma Room complet (exclusions, décisions, playlists)
- [x] 85 tests unitaires (dont toutes les obligations du cahier)

## Étape 3 — téléchargements & arrière-plan
- [ ] Pont web ↔ Room via AmsNative (persistance native unifiée)
- [ ] Moteur de téléchargement réel (fournisseurs autorisés
      uniquement, reprise, file d'attente)
- [ ] Fournisseurs de recherche (catalogues autorisés)
- [ ] Tâches en arrière-plan (WorkManager)
- [ ] Permission POST_NOTIFICATIONS demandée au runtime
      (dialogue système) si non accordée

## Étape 4 — finition
- [ ] Tests instrumentés Android (Room, plugin natif)
- [ ] Build release (signing, Play Store)
- [ ] Accessibilité complète (TalkBack), localisations supplémentaires
- [ ] Performance sur appareils d'entrée de gamme (profil réel)

> Règle transversale : aucun module ne passe « operational »
> avant d'être réellement branché — aucune donnée simulée
> n'est jamais affichée.
