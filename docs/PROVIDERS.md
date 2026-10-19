# Fournisseurs intégrés — A.MS (étape 3)

## Fournisseurs réellement intégrés

### Jamendo — recherche + métadonnées + téléchargement AUTORISÉ
- API officielle v3 : `GET /v3.0/tracks/`
- Identifiant requis : **client_id** (gratuit, sur
  `devportal.jamendo.com`) — configurable dans Paramètres,
  stocké localement, jamais commité.
- Téléchargement **uniquement** quand
  `audiodownload_allowed === true` (choix de l'artiste)
  ET URL `audiodownload` présente. Sinon : bouton
  « Ouvrir la source » à la place de « Télécharger ».
- Licences : champ `licensing` (Creative Commons / Jamendo)
  affiché avec chaque résultat. Attribution requise ;
  usage commercial selon licence du morceau.
- Pagination : offset/limit (20/page), jeton opaque.
- Formats : mp31 (96 kbps), mp32 (VBR), ogg, flac
  (`audiodlformat`).
- Conditions : API gratuite pour usage non commercial
  conforme aux conditions Jamendo ; aucun contournement.

### YouTube — recherche + métadonnées UNIQUEMENT
- API officielle Data v3 : `search.list`, `videos.list`,
  `playlistItems.list`.
- Identifiant requis : **clé API** (Google Cloud Console).
- **download: false — déclaré et appliqué.** Aucune
  extraction de flux audio : les conditions d'utilisation
  de YouTube l'interdisent. Actions : ouvrir la vidéo,
  comparer à la bibliothèque, ajouter à la liste de
  suivi.
- Pagination : pageToken opaque.

## Capacités déclarées (jamais de mensonge)

| Fournisseur | Recherche | Métadonnées | Téléchargement | Playlist | Local |
| --- | --- | --- | --- | --- | --- |
| Jamendo | ✅ | ✅ | ✅ (si artiste autorise) | ❌ | ❌ |
| YouTube | ✅ | ✅ | ❌ (interdit) | ✅ (analyse) | ❌ |

Un fournisseur qui sait seulement rechercher n'est
jamais présenté comme fournisseur de téléchargement.

## Identifiants requis

| Fournisseur | Paramètre | Où |
| --- | --- | --- |
| YouTube | Clé API v3 | Paramètres → « Clé YouTube Data API v3 » |
| Jamendo | client_id | Paramètres → « Clé Jamendo » |

Aucun secret n'est versionné dans GitHub.

## Limites connues

- YouTube : aucun téléchargement (conditions) — par
  conception.
- Jamendo : catalogue libre de droits (Creative Commons /
  Jamendo) — pas de catalogue commercial généraliste.
- Pagination plafonnée à 1 000 résultats Jamendo.
- La disponibilité réelle d'un téléchargement dépend de
  l'artiste (audiodownload_allowed) — jamais supposée.
