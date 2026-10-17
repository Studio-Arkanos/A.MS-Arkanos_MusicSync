# Feuille de route — fonctions restantes

## Étape 1 (cette livraison) — fondations ✅

- Architecture modulaire complète (interfaces + stubs honnêtes)
- Interface : 7 écrans, navigation par onglets, thème bleu nuit/or
- Modules opérationnels : normalisation, doublons, exclusions, historique
- Plugin natif AmsNative (identité réelle ; métier = rejets honnêtes)
- Room : schéma DAO/entité compilable
- CI GitHub Actions (web + APK debug)
- Documentation

## Étape 2 — synchronisation & scan

- [ ] Plugin natif : scan MediaStore (dossiers musicaux)
- [ ] Moteur de synchronisation réel (orchestration scan → décision)
- [ ] Fournisseurs de recherche (API catalogue, clés côté natif)
- [ ] Persistance Room branchée au web (dépôts via AmsNative)
- [ ] Écran Bibliothèque : résultats réels du scan
- [ ] Écran Accueil : compteurs réels, progression live
- [ ] Playlist active

## Étape 3 — téléchargements & notifications

- [ ] Fournisseurs de téléchargement autorisés (liste blanche)
- [ ] Gestionnaire de téléchargements (files, reprise)
- [ ] Notifications locales (plugin natif)
- [ ] Tâches en arrière-plan (WorkManager)
- [ ] Décisions en attente + validation utilisateur

## Étape 4 — finition

- [ ] Tests d'intégration Android (instrumentés)
- [ ] Build release (signing, Play Store)
- [ ] Accessibilité complète (TalkBack), localisations supplémentaires
- [ ] Performance sur appareils d'entrée de gamme (profil réel)

> Règle transversale : aucune fonctionnalité ne passe « opérationnelle »
> dans `FEATURES` avant d'être réellement branchée — aucune donnée
> simulée n'est jamais affichée.
