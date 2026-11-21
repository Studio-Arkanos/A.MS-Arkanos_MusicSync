# Limitations connues (état réel)

Aucune limitation n'est cachée. Chaque entrée est
vérifiable dans le code ou l'écran Diagnostic.

## Fonctionnalités

- **Conversion audio** : NON intégrée. FFmpegKit
  évalué puis rejeté (licence GPL incompatible MIT,
  build non vérifiable). Les fichiers sources sont
  conservés tels quels. Aucune conversion n'est
  jamais prétendue.
- **Persistance** : l'interface stocke les données dans le localStorage de la WebView, qui survit aux redémarrages ordinaires mais peut être effacé avec les données de l'application. Room n'est pas utilisé et a été retiré ; aucune sauvegarde vers SQLite n'est promise.
- **Synchronisation globale en arrière-plan** :
  WorkManager planifie l'ANALYSE périodique de la
  bibliothèque (12 h, contraintes réseau + batterie).
  L'orchestration complète playlist → téléchargements
  s'exécute depuis l'application ouverte (écran
  Accueil). Android ne garantit aucune heure exacte
  d'exécution (doze, restrictions OEM).
- **YouTube** : recherche et métadonnées UNIQUEMENT.
  Aucune extraction, aucun téléchargement, aucune
  lecture de flux — conditions d'utilisation.
- **Lecture** : fichiers locaux uniquement
  (bibliothèque scannée + téléchargements terminés).
  Un morceau YouTube favorisé est « Ouvrir la source ».

## Plateforme

- **API Android minimale 24** ; tests sur Android 13+
  recommandés (permission runtime de notification).
- **Android 24–25** : icône adaptative non prise en
  charge (icône PNG par défaut du template Capacitor).
- **ARMv7** : aucune bibliothèque native audio tierce n'a été ajoutée. Toutefois, aucun APK de cette révision n'a été compilé localement ni inspecté pour ses ABI, et aucun téléphone ARMv7 n'a été testé. Android 11 est dans la plage minSdk, mais l'exécution ARMv7 doit encore être vérifiée sur appareil/artefact.
- **Stockage insuffisant** : DownloadManager échoue
  lui-même ; A.MS affiche l'échec réel de la tâche
  (jamais un succès simulé).
- **Réseau** : consultation locale (bibliothèque,
  historique, favoris, playlists) disponible hors
  ligne ; recherche/analyse/téléchargement non.

## Performance

- Bibliothèque locale affichée par paliers de 100
  morceaux (téléphones d'entrée de gamme).
- Le scan natif (DocumentFile) s'exécute hors thread
  UI ; le parcours de très grosses bibliothèques
  (> 10 000 fichiers) peut dépasser la limite
  d'un worker WorkManager — le résultat partiel est
  alors signalé honnêtement.

## Build

- **APK de débogage** : non obfusqué, signé avec la
  clé debug — pas pour une distribution publique.
- **APK release** : construit uniquement via le
  workflow manuel avec les secrets de signature
  (voir docs/BUILD_ANDROID.md).
