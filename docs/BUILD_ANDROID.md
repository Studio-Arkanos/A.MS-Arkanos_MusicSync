# Construire l'APK Android

## Prérequis

- **Node.js ≥ 22** (frontend web)
- **JDK 17** et **Android SDK 36** (compilation native)
  — ou GitHub Actions (recommandé : tout préinstallé)

## Build local complet

```bash
npm ci                  # dépendances verrouillées
npm run lint            # ESLint
npm run typecheck       # TypeScript strict
npm test                # tests unitaires (Vitest)
npm run build           # frontend → dist/
npx cap sync android    # injection dans android/
cd android && ./gradlew assembleDebug --no-daemon
```

APK produit :
`android/app/build/outputs/apk/debug/app-debug.apk`

## Build release signé (local)

```bash
cd android && ./gradlew assembleRelease --no-daemon \
  -PkeystorePath=/chemin/vers/keystore.jks \
  -PkeystorePassword=… -PkeyAlias=… -PkeyPassword=…
```

Aucune clé n'est jamais placée dans le dépôt.

## CI GitHub Actions

### Workflow `Android APK` (`.github/workflows/android-apk.yml`)

Déclencheurs : push (`main`, `arena/**`), PR,
**workflow_dispatch** (manuel).

Job `debug-apk` (obligatoire, toujours vert si le
code l'est) :

1. lint → typecheck → tests unitaires
2. build web → `npx cap sync android`
3. `./gradlew assembleDebug`
4. **vérification** : l'APK doit exister et être
   non vide (`test -s`), sinon le workflow échoue
5. renommage `A-MS-debug.apk` + artefact
   `A-MS-debug`

Job `release-apk` (manuel, **non bloquant** :
s'exécute uniquement via workflow_dispatch et
uniquement si le secret `AMS_KEYSTORE_BASE64` est
configuré) : APK release signé → artefact
`A-MS-release`.

Secrets requis (release uniquement) :

| Secret | Contenu |
| --- | --- |
| `AMS_KEYSTORE_BASE64` | keystore JKS encodé base64 |
| `AMS_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `AMS_KEY_ALIAS` | alias de la clé |
| `AMS_KEY_PASSWORD` | mot de passe de la clé |

### CI existant (`.github/workflows/ci.yml`)

Vérifications continues : web (lint, types, tests,
build) + `assembleDebug` Android + artefact
`ams-debug-apk`.

## Limitations de compilation locales

Ce dépôt ne contient aucune clé de signature et
aucun APK préconstruit — l'APK n'existe qu'après
une exécution réussie de GitHub Actions (ou d'un
build local avec le SDK Android).
