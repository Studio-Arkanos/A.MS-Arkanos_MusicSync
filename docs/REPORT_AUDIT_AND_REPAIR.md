# Rapport d’audit et de réparation — A.MS Arkanos Music Sync

**État du rapport :** audit du dépôt et corrections de code effectués sur la branche Arena active. Validation Gradle locale non réalisable dans l’environnement de travail (JDK absent), mais le workflow GitHub Actions a compilé et publié un APK debug pour ce commit. Aucun test sur téléphone physique n’a été fait. Ce document distingue les faits confirmés des points qui restent à vérifier sur appareil.

## Résumé accessible

A.MS est une application React embarquée dans Capacitor. La bibliothèque locale n’a besoin d’aucun compte, clé, serveur ou abonnement : l’utilisateur choisit les dossiers via le sélecteur de documents Android (SAF), le scan parcourt les URI autorisées et le lecteur natif ouvre les URI `content://` avec MediaPlayer. Les favoris, exclusions, paramètres, historiques et playlists utilisateur sont actuellement stockés par la WebView dans `localStorage` ; ils ne sont pas écrits dans Room/SQLite.

La cause confirmée la plus directe du message **« AMS native plugin is not implemented on Android »** était l’enregistrement tardif des deux plugins personnalisés : `MainActivity.onCreate()` appelait `super.onCreate()` avant `registerPlugin()`. `BridgeActivity.onCreate()` construit le Bridge et charge les plugins pendant cet appel ; les plugins ajoutés ensuite n’étaient donc pas dans le registre du Bridge déjà construit. L’ordre a été corrigé : déclaration des plugins avant `super.onCreate()`.

Le chemin `/storage/emulated/0/Music/Musics` par défaut n’est pas une permission de stockage sous Android 11. Scoped Storage exige un accès explicite. L’interface n’utilise désormais pas ce faux chemin par défaut ; il faut choisir le dossier avec SAF. Le scan natif exige désormais une URI `content://`, garde des erreurs explicites en cas d’accès révoqué/invalide et parcourt les fichiers dans un thread de fond au lieu de bloquer l’interface.

## 1. État et problèmes constatés

- Les plugins Kotlin `AmsNativePlugin` et `AmsPlayerPlugin` existent et exposent des méthodes réelles, mais leur enregistrement après le `super.onCreate()` de Capacitor 8 était trop tardif.
- Le code de scan repose sur le Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`) et `DocumentFile`. Le chemin absolu prérempli n’octroie aucun droit Android ; son usage provoquait typiquement « dossier inaccessible ».
- Le parcours `DocumentFile.listFiles()` était synchrone dans la méthode Capacitor ; le déplacement vers un thread séparé évite de bloquer le thread UI lors des scans plus lourds.
- L’interface conservait des morceaux dans le stockage local WebView. Room et ses DAOs existaient mais aucune référence dans le code applicatif ne les utilisait. Il s’agissait d’une couche morte, pas d’une persistance Android effectivement raccordée.
- Le lecteur natif utilise `MediaPlayer` et sait lire les URI locales transmises ; les tests du service TypeScript ne sont pas des tests audio sur appareil.
- L’analyse de playlists distante était liée à YouTube Data API v3 et demandait une clé, donc ne satisfait pas une utilisation sans clé. L’import de playlist locale M3U/PLS/TXT est maintenant disponible, sans réseau ni fournisseur.
- Jamendo/YouTube demeurent des fonctions facultatives en ligne, pas des prérequis à la lecture/au scan local. Les téléchargements ne sont possibles qu’à partir d’URL directes que le fournisseur autorise ; aucun téléchargement YouTube ni extraction de flux n’est fourni.

## 2. Causes confirmées et corrections

### « AMS native plugin is not implemented on Android »

**Cause confirmée dans le cycle de vie :** l’enregistrement personnalisé se faisait après l’appel à `BridgeActivity.onCreate()`. Capacitor crée le Bridge durant `super.onCreate`, avant l’ancien `registerPlugin`; l’instance active ne pouvait donc pas trouver les plugins à l’appel JS. `MainActivity.kt` enregistre désormais `AmsNativePlugin` et `AmsPlayerPlugin` avant `super.onCreate`. `capacitor.config.ts` déclare aussi les deux noms sous `plugins` pour rendre la configuration explicite. La compilation Gradle est confirmée par le workflow CI `Android APK` du commit `73e9a9d` (run `39690310506`) ; l’environnement de développement n’a pas de JDK, donc la commande locale a échoué immédiatement avec `java: command not found`. La CI a produit et publié `A-MS-debug.apk`.

### « scan_error: dossier inaccessible »

**Cause confirmée de configuration :** la valeur `/storage/emulated/0/Music/Musics` était un chemin système brut et l’app tentait le scan même si le dossier n’avait pas été choisi via SAF. Android 11 ne donne pas accès général à ce chemin via `READ_EXTERNAL_STORAGE`. La permission legacy du manifeste n’accorde pas le droit Scoped Storage à tous les répertoires.

**Corrections :** suppression du chemin par défaut, rejet explicite des chemins autres que `content://`, ajout de flags de lecture/persistance au picker de dossier et maintien de la prise de permission persistante dans le résultat, scan dans un thread dédié et messages distincts pour URI manquante, format non SAF, permission révoquée et erreur de parcours. Le scan ne fabrique aucune entrée : il utilise les documents renvoyés par `DocumentFile` et filtre les extensions MP3, M4A, AAC, FLAC, OGG et WAV. Un dossier vide renvoie une liste réellement vide.

**Limite à confirmer sur Android physique :** la réussite de `takePersistableUriPermission()` et la lecture d’une URI média dépendent du fournisseur SAF du téléphone. Le test sur Android 11 réel reste nécessaire.

## 3. Fichiers modifiés et rôle

- `android/app/src/main/java/com/arkanos/ams/MainActivity.kt` : enregistrement du plugin avant construction du Bridge.
- `capacitor.config.ts` : déclaration explicite d’AmsNative et AmsPlayer.
- `android/app/src/main/java/com/arkanos/ams/plugins/AmsNativePlugin.kt` : URI SAF requise, sélection de fichier locale, lecture bornée à 1 Mo et scan déplacé hors UI.
- `src/plugins/amsNative.ts` : contrats JS pour sélectionner/lire le fichier de playlist.
- `src/modules/playlist/playlist.ts` : analyse locale de base M3U/PLS/TXT avec distinction vide/contient des entrées.
- `src/screens/PlaylistScreen.tsx` : action d’import local.
- `src/modules/playlist/playlist.test.ts` : tests d’entrée M3U et liste vide.
- `src/config/app.config.ts` : aucun chemin système prérempli.
- `android/app/build.gradle`, `android/variables.gradle`, `android/gradle.properties` : retrait du traitement Room/kapt inutilisé.
- `android/app/src/main/java/com/arkanos/ams/data/` : retrait des entités/DAO/DB Room morts, sans appelant dans le dépôt.

Aucun nouveau package npm ni aucune dépendance native nouvelle n’a été ajoutée.

## 4. Choix techniques et alternatives

### Stockage et scan local

**Choix :** SAF (`ACTION_OPEN_DOCUMENT_TREE`) + URI `content://` + AndroidX DocumentFile. C’est l’API Android intégrée, compatible Android 11, sans clé, service, coût ou permission globale de stockage. `READ_EXTERNAL_STORAGE` reste uniquement la permission de compatibilité historique plafonnée dans le manifeste ; le flux Android 11 passe par le consentement SAF.

**Écarté :** accès au chemin absolu et permissions larges. Ils ne sont pas fiables sous Scoped Storage et ne respecteraient pas le consentement limité par l’utilisateur.

### Lecture

**Choix :** `MediaPlayer` du SDK Android et URI SAF. Aucune bibliothèque audio tierce ou binaire natif ajouté ; il n’y a donc pas d’ABI ARMv7 tierce à installer. Codec exact dépend du système Android et du codec du fichier.

### Playlists

**Choix sans clé :** ouvrir un fichier local M3U/PLS/TXT avec SAF et lire son texte. La fonction actuelle extrait des entrées/titres; elle ne résout pas automatiquement des chemins relatifs d’une playlist en URI SAF lisibles et ne télécharge aucune URL. Le scan du dossier choisi reste la méthode pour obtenir des URI effectivement jouables.

**Alternative URL distante :** YouTube Data API est maintenue par Google, mais requiert un projet/une clé, connexion Internet et quota API susceptible d’être épuisé ; elle n’est pas une capacité essentielle garantie sans compte. Elle est conservée uniquement comme option distante existante. Une URL de playlist n’est pas publiquement analysable de façon fiable sans API/scraping ; le scraping est écarté et le fallback recommandé est l’export/import de playlist locale.

### Téléchargements

Le dépôt utilise Android `DownloadManager`, qui n’ajoute aucun binaire tierce et gère une file système, mais la fonction requiert une URL directe réellement téléchargeable. Jamendo n’autorise le téléchargement que pour les titres signalés comme autorisés par l’artiste et demande un `client_id` pour ses appels API. Ce flux n’est pas sans clé et son catalogue n’est pas une source générale de musique commerciale. YouTube est recherche/métadonnées seulement ; pas d’extraction audio. Les termes, licences d’artiste, droits d’auteur et accès réseau s’appliquent. Aucun VPS, IA, abonnement ou token payant n’est nécessaire au parcours local. Les conditions commerciales et limites de Jamendo / Google peuvent évoluer ; l’utilisateur doit vérifier leurs conditions avant tout usage distribué ou commercial.

`DownloadManager` peut échouer selon les URL, les redirections, les politiques du fournisseur et le stockage disponible. Le projet refuse les doublons ciblés et remonte les états/erreurs ; il n’existe pas de garantie universelle de téléchargement. Une validation appareil du chemin de sortie SAF est encore requise avant d’affirmer que toutes les destinations fonctionnent sur tous les constructeurs.

## 5. Fournisseurs, licences, coûts et limites

| Élément | Coût / identifiant | Dépendance réseau | Limite |
| --- | --- | --- | --- |
| SAF, DocumentFile, MediaPlayer, DownloadManager, WorkManager | Aucun compte ni frais dans A.MS ; composants Android | Non pour scan/lecture ; oui pour téléchargement | Capacités et codecs Android/OEM ; permissions accordées par l’utilisateur |
| YouTube Data API v3 (optionnelle) | Clé Google Cloud requise ; quotas et conditions Google | Oui | Quota/accès peuvent limiter l’analyse ; pas de téléchargement audio |
| Jamendo API (optionnelle) | `client_id` requis ; politique/tarif d’usage à vérifier auprès de Jamendo | Oui | Catalogue non généraliste ; téléchargements selon autorisation/licence du titre |
| WebView/React/Capacitor | Dépendances open source, licences détaillées dans les paquets | Non après installation | Runtime Android System WebView présent sur l’appareil |

Aucun service distant n’est obligatoire pour consulter la musique locale hors ligne après le scan. Les modifications utilisent uniquement les dépendances natives déjà présentes (DocumentFile/WorkManager/Capacitor) ; aucune bibliothèque audio native ajoutée. Les dépendances Room supprimées étaient sous licence Apache-2.0 mais n’étaient pas branchées.

## 6. Android 11 et ARMv7 32 bits

- `minSdkVersion` demeure 24 (Android 7+), donc Android 11 (API 30) est dans la plage déclarée.
- Capacitor Android s’appuie sur le runtime Android/WebView ; aucune bibliothèque audio native tierce, FFmpeg ou yt-dlp n’est ajoutée. Le choix évite un binaire massif et les risques d’ABI.
- Le code n’inclut pas de distribution d’APK ciblée ou validée ici pour `armeabi-v7a`. La compilation Gradle locale n’a pas pu s’exécuter faute de Java. La CI peut produire l’APK, mais il faut inspecter ses ABI et installer sur téléphone ARMv7 avant de déclarer l’architecture testée.
- **Aucun téléphone Android 11 ARMv7 n’a été utilisé** ; compatibilité runtime estimée par API/absence de lib native supplémentaire, pas certifiée par test matériel.

## 7. Taille

- Bundle Web produit durant ce tour : 388.69 kB JavaScript (119.05 kB gzip), CSS 18.57 kB.
- Assets Android générés lors de `cap sync` : dossier `android/app/src/main/assets/public` 3.5 Mo (Web + branding, mesure `du -sh`).
- Taille de l’APK avant/après : non mesurée — aucun APK local compilé, JDK absent. Room est supprimé du graphe de dépendances mais l’économie APK ne peut pas être annoncée sans comparaison d’artefacts.

## 8. Tests et validations réels

| Commande / contrôle | Résultat |
| --- | --- |
| `npm ci` | Réussi ; npm signale 3 vulnérabilités modérées transitives (dont uuid/xcode sous @capacitor/cli), aucun correctif compatible appliqué automatiquement. |
| `npm run lint` | Réussi |
| `npm run typecheck` | Réussi |
| `npm test` | Réussi après correction du test M3U : 25 fichiers, 187 tests |
| `npm run build` | Réussi ; Vite 7.3.7, JS 388.69 kB / gzip 119.05 kB |
| `npx cap sync android` | Réussi ; assets copiés et configuration native synchronisée |
| `cd android && ./gradlew assembleDebug --no-daemon` local | **Non réalisable** : `java: command not found`, `JAVA_HOME` absent. |
| Android APK workflow (GitHub Actions) | ✅ `assembleDebug`, vérification de l’APK et publication : run `39690310506` ([ouvrir le run](https://github.com/Studio-Arkanos/A.MS-Arkanos_MusicSync/actions/runs/39690310506)), artifact `A-MS-debug`, 9,714,943 octets (archive), expire le 2027-01-19. |
| Inspection ABI / appareil | Artifact ZIP non téléchargeable depuis ce sandbox (endpoint de stockage hors réseau autorisé) ; ABI de l’APK non inspectées. Aucun téléphone Android 11 ARMv7 testé. |
| Appareil physique Android 11 / ARMv7 | Non testé |

Les tests Vitest valident les modules web et les cas injectés ; ils ne simulent pas la présence de musique dans le téléphone et ne prouvent pas le fonctionnement des plugins natifs.

## 9. Limites et actions nécessaires

1. Installer une build CI sur Android 11 ARMv7 et vérifier que l’APK contient `armeabi-v7a`, si cet ABI est fourni par le build.
2. Tester réellement : choix SAF, relance de l’app, scan d’un dossier non vide/vide, accès média, play/pause/suivant et erreur de format.
3. Vérifier sur appareil le comportement du `DownloadManager` avec une URL directe autorisée, un fichier déjà existant, l’écriture dans le dossier choisi et un téléchargement interrompu.
4. L’import M3U actuel lit et affiche les titres; il ne transforme pas les chemins relatifs en URI SAF jouables. Pour lire, choisir/Scanner le dossier de fichiers local.
5. L’état WebView (`localStorage`) peut être effacé par l’utilisateur/désinstallation ; Room n’est plus prétendu comme connecté. Favoris et playlists sont locaux à l’installation, pas sauvegardés entre désinstallations.
6. La synchronisation playlist distante repose encore sur YouTube API avec clé/quota si l’utilisateur choisit cette source. La synchronisation complète hors ligne n’existe pas : seules les décisions, exclusions, scan et comparaisons locales sont hors réseau.
7. Les téléchargements légaux sont limités à des sources fournissant une URL directe et l’autorisation correspondante. L’app ne contourne pas les protections d’un service.
8. Examiner et mettre à jour les dépendances npm lorsque les versions compatibles sont publiées ; les trois vulnérabilités `npm audit` sont dans l’outillage de développement Capacitor et transitives, pas utilisées comme fonctions runtime de l’app.

## 10. Instructions simples

1. Sur Android, ouvrir **Bibliothèque → Choisir un dossier** et sélectionner le dossier musical dans le sélecteur système (pas saisir un chemin `/storage/...`).
2. Appuyer sur **Analyser le dossier**. Les URI accordées par Android sont mémorisées et parcourues ; si le droit a été révoqué, choisir le dossier de nouveau.
3. Appuyer sur une piste pour lecture locale ; utiliser les contrôles du lecteur. Favoris et playlists utilisateur sont enregistrés dans le stockage local de l’application.
4. Pour analyser une liste sans API, ouvrir **Playlist → Importer une playlist locale** et choisir un M3U/PLS/TXT. Pour rendre ses fichiers jouables, analyser aussi le dossier musical.
5. Les fonctions de recherche distante et téléchargement sont optionnelles, dépendantes d’Internet, des identifiants/fournisseurs et des droits associés ; elles ne sont pas nécessaires pour le scan ou la lecture locale.
