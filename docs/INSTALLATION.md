# Installation d'A.MS

A.MS est une application Android (API 24+). L'APK est
produit par GitHub Actions — jamais hébergé ailleurs.

## 1. Récupérer l'APK

1. Ouvrez le dépôt
   [Studio-Arkanos/A.MS-Arkanos_MusicSync](https://github.com/Studio-Arkanos/A.MS-Arkanos_MusicSync)
   sur github.com (ou l'application GitHub).
2. Menu **Actions** → workflow **Android APK**.
3. Choisissez l'exécution la plus récente (badge vert
   ✓).
4. Section **Artifacts** → téléchargez
   **A-MS-debug** (fichier `A-MS-debug.apk`).

> L'artefact n'existe que si le workflow a été exécuté
> avec succès. En cas d'échec, aucun APK n'est publié
> — le journal (log) du workflow explique pourquoi.

## 2. Installer sur Android

1. Transférez `A-MS-debug.apk` sur le téléphone
   (USB, e-mail, Drive…).
2. Ouvrez le fichier. Android affiche
   « **Installer cette application ?** » :
   - autorisez l'installation depuis cette source
     (Chrome/Files/Gmail — « Autoriser depuis cette
     source » dans la boîte de dialogue) ;
   - confirmez **Installer**.
3. Ouvrez A.MS : choisissez un dossier de bibliothèque
   (SAF), puis analysez.

## 3. Mettre à jour

Téléchargez le nouvel APK puis installez par-dessus :
l'application est mise à jour, **les données locales
(préférences, favoris, playlists, historique) sont
conservées** (versionCode croissant requis pour le
remplacement — see KNOWN_LIMITATIONS si l'installation
échoue : désinstallez alors l'ancienne version).

## 4. Précautions (APK de débogage)

- L'APK de débogage est **signé avec la clé de débogage
  Android** (non la clé de production Studio-Arkanos) :
  il ne doit pas être distribué publiquement.
- Il est **non obfusqué** (`minifyEnabled false`) —
  plus volumineux et lisible, mais vérifiable.
- Android peut afficher « application non optimisée »
  (battery optimizations) — normal pour un APK debug.

## 5. Débogage vs production

| | Débogage (CI) | Release (signée) |
| --- | --- | --- |
| Clé | debug Android | secret `AMS_KEYSTORE_BASE64` |
| Disponibilité | à chaque push | workflow manuel + secrets |
| Signature vérifiable | non | oui |
| Usage | tests, développement | distribution |

Pour une release signée : configurez les secrets
`AMS_KEYSTORE_BASE64` (keystore encodé base64),
`AMS_KEYSTORE_PASSWORD`, `AMS_KEY_ALIAS`,
`AMS_KEY_PASSWORD` puis déclenchez le workflow
manuellement (voir docs/BUILD_ANDROID.md).
