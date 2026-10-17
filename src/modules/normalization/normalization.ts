/**
 * Normalisation des noms de morceaux et d'artistes.
 *
 * Module OPÉRATIONNEL dès l'étape 1 : logique pure, entièrement testée.
 * Elle sert de base à la détection de doublons et à la comparaison
 * bibliothèque locale / catalogue distant.
 */

/** Ponctuation et séparateurs retirés lors de la normalisation. */
const PUNCTUATION_RE =
  /[.!?,;:()'"«»‹›[\]{}…\-–—_/\\|+*~^°<>=@#$%&`^]/g;

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
