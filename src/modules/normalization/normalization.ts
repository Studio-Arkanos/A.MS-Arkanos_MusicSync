/**
 * Normalisation des noms de morceaux et d'artistes.
 *
 * Module OPÉRATIONNEL : logique pure, entièrement testée.
 * Indépendante de l'interface — utilisable par le scan local,
 * l'analyse de playlist et la détection des doublons.
 */

/** Extensions audio reconnues par le scan local. */
export const AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.wav',
] as const;

/** Ponctuation et séparateurs retirés lors de la normalisation. */
const PUNCTUATION_RE =
  /[\x5B\x5D.!?,;:()'"«»‹›{}…\-–—_/\\|+*~^°<>=@#$%&`^]/g;

/** Diacritiques combinés Unicode (U+0300 – U+036F). */
const COMBINING_DIACRITICS_RE = /[\u0300-\u036f]/g;

/** Rabat les accents latins (É→e, ç→c) et la ligature œ. */
export function foldAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_RE, '')
    .replace(/[œŒ]/g, 'oe');
}

/** Normalisation générique : minuscules, sans ponctuation, espaces uniques. */
export function normalizeText(input: string): string {
  return foldAccents(input)
    .toLowerCase()
    .replace(PUNCTUATION_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTitle(title: string): string {
  return normalizeText(title);
}

export function normalizeArtist(artist: string): string {
  return normalizeText(artist);
}

/** Empreinte de comparaison utilisée pour la détection de doublons. */
export function buildFingerprint(title: string, artist: string): string {
  return `${normalizeTitle(title)}||${normalizeArtist(artist)}`;
}

/** Distance de Levenshtein — base des quasi-doublons (titres proches). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length];
}

/* ------------------------------------------------------------------ */
/* Analyse de noms de fichiers / titres (étape 2)                      */
/* ------------------------------------------------------------------ */

/** Indications de qualité à supprimer : 128K, 320K, 720P, 1080P, 4K… */
const QUALITY_PATTERNS: RegExp[] = [
  /\b(?:128|192|256|320)\s*(?:kbps|kbs|k|kb)\b/gi,
  /\b(?:480|720|1080|1440|2160)\s*p\b/gi,
  /\b4k\b/gi,
  /\b(?:hd|hq)\b/gi,
];

/** Phrases promotionnelles entières à supprimer. */
const PROMO_PHRASES = [
  'official music video',
  'official audio',
  'official lyric video',
  'official video',
  'clip officiel',
  'videoclip officiel',
];

/** Mots promotionnels isolés à supprimer. */
const PROMO_WORDS = [
  'official',
  'officiel',
  'clip',
  'video',
  'videoclip',
  'visualizer',
  'visualiseur',
  'visualisation',
  'lyrics',
  'paroles',
];

/**
 * Marqueurs de VERSION musicale — conservés car ils distinguent
 * des versions différentes d'un même morceau.
 */
export const VERSION_MARKERS = [
  'sped up',
  'slowed',
  'reverb',
  'radio edit',
  'instrumental',
  'acoustic',
  'unplugged',
  'remaster',
  'remix',
  'live',
  'extended',
  'deluxe',
  'demo',
  'cover',
  'karaoke',
  'explicit',
  'clean',
] as const;

const PROMO_WORDS_RE = new RegExp(`\\b(?:${PROMO_WORDS.join('|')})\\b`, 'gi');

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Marqueurs de version présents dans un titre normalisé. */
export function extractVersionMarkers(normalizedTitle: string): string[] {
  return VERSION_MARKERS.filter((marker) =>
    new RegExp(`\\b${escapeRegex(marker)}\\b`, 'i').test(normalizedTitle),
  );
}

export interface ParsedTrackName {
  /** Artiste normalisé ('' si inconnu — beaucoup de fichiers locaux n'en ont pas). */
  artist: string;
  /** Titre normalisé, marqueurs de version conservés. */
  title: string;
  /** Clé de comparaison : « artiste titre ». */
  key: string;
  /** Marqueurs de version détectés (Remix, Live, Acoustic…). */
  versionMarkers: string[];
}

/**
 * Analyse un nom de fichier ou un titre de playlist.
 *
 * - supprime l'extension et les indications de qualité (128K, 320K, 720P…) ;
 * - supprime les marqueurs promotionnels (Official, Clip Officiel,
 *   Visualizer, Lyrics…) ;
 * - conserve les marqueurs de version musicale (Remix, Live, Acoustic…) ;
 * - sépare « Artiste - Titre » quand le séparateur est présent.
 */
export function parseTrackName(raw: string): ParsedTrackName {
  let name = raw.trim();

  // 1. Extension de fichier.
  name = name.replace(/\.[a-z0-9]{1,6}$/i, '');

  // 2. Groupes entre parenthèses / crochets : supprimés si purement
  //    promotionnels, conservés s'ils contiennent un marqueur de version.
  name = name.replace(/[[{]([^)\]}]*[)\]}])/g, (_match, inner: string) => {
    const content = normalizeText(inner);
    const isPromoPhrase = PROMO_PHRASES.some((phrase) => content.includes(phrase));
    const words = content.split(' ').filter(Boolean);
    const isOnlyPromoWords =
      words.length > 0 && words.every((word) => PROMO_WORDS.includes(word));
    return isPromoPhrase || isOnlyPromoWords ? ' ' : ` ${inner} `;
  });

  // 3. Phrases et mots promotionnels restants.
  for (const phrase of PROMO_PHRASES) {
    name = name.replace(new RegExp(escapeRegex(phrase), 'gi'), ' ');
  }
  name = name.replace(PROMO_WORDS_RE, ' ');

  // 4. Indications de qualité.
  for (const pattern of QUALITY_PATTERNS) {
    name = name.replace(pattern, ' ');
  }

  // 5. Séparation « Artiste - Titre » (premier séparateur significatif).
  const separatorMatch = name.match(/\s+[-–—|]\s+/);
  let artistPart = '';
  let titlePart = name;
  if (separatorMatch && separatorMatch.index !== undefined) {
    artistPart = name.slice(0, separatorMatch.index);
    titlePart = name.slice(separatorMatch.index + separatorMatch[0].length);
  }

  // 6. Normalisation finale.
  const artist = normalizeText(artistPart);
  const title = normalizeText(titlePart);
  const versionMarkers = extractVersionMarkers(title);

  return {
    artist,
    title,
    key: `${artist} ${title}`.trim(),
    versionMarkers,
  };
}
