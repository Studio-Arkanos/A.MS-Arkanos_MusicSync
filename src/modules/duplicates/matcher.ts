import {
  levenshtein,
  parseTrackName,
  type ParsedTrackName,
} from '../normalization/normalization';

/**
 * Correspondance bibliothèque locale ↔ playlist distante.
 *
 * Plusieurs critères combinés :
 *  - égalité des empreintes normalisées ;
 *  - similarité textuelle (Levenshtein) ;
 *  - mots significatifs communs (Jaccard) ;
 *  - marqueurs de version (un remix n'est jamais un original) ;
 *  - artiste (pénalité en cas de divergence).
 *
 * Seuils configurables :
 *  - ≥ probable (95 %) : « Déjà présent », confirmé par les autres critères ;
 *  - ≥ incertain (80 %) : « Correspondance incertaine » → soumise à l'utilisateur ;
 *  - < incertain : « Absent ».
 */

export type MatchState = 'present' | 'uncertain' | 'absent';

export interface MatchCandidate {
  id: string;
  title: string;
  artist: string;
}

export interface MatchQuery {
  title: string;
  artist: string;
}

export interface MatchResult {
  state: MatchState;
  score: number;
  bestCandidateId?: string;
  criteria: string[];
}

export interface MatchThresholds {
  /** À partir d'ici : doublon probable (à confirmer par les autres critères). */
  probable: number;
  /** À partir d'ici : correspondance incertaine. */
  uncertain: number;
}

export const DEFAULT_THRESHOLDS: MatchThresholds = {
  probable: 0.95,
  uncertain: 0.8,
};

function tokenSet(normalizedTitle: string): Set<string> {
  return new Set(normalizedTitle.split(' ').filter(Boolean));
}

function tokenJaccard(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function sameMarkers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

export class DuplicateMatcher {
  constructor(private readonly thresholds: MatchThresholds = DEFAULT_THRESHOLDS) {}

  /** Titre débarrassé de ses marqueurs de version (comparaison de base). */
  private stripMarkers(parsed: ParsedTrackName): string {
    let title = parsed.title;
    for (const marker of parsed.versionMarkers) {
      title = title.replace(new RegExp(`\\b${marker}\\b`, 'i'), ' ');
    }
    return title.replace(/\s+/g, ' ').trim();
  }

  private parseKey(candidate: MatchCandidate): string {
    return parseTrackName(`${candidate.artist} - ${candidate.title}`).key;
  }

  private scorePair(query: ParsedTrackName, candidate: MatchCandidate): {
    score: number;
    criteria: string[];
    versionMismatch: boolean;
  } {
    const candidateParsed = parseTrackName(`${candidate.artist} - ${candidate.title}`);
    const criteria: string[] = [];

    // Critère 1 : égalité des empreintes normalisées.
    if (query.key.length > 0 && query.key === candidateParsed.key) {
      return { score: 1, criteria: ['empreinte_exacte'], versionMismatch: false };
    }

    // Critère 2 : similarité textuelle du titre.
    const levenshteinRatio =
      1 -
      levenshtein(query.title, candidateParsed.title) /
        Math.max(query.title.length, candidateParsed.title.length, 1);

    // Critère 3 : mots significatifs communs.
    const jaccard = tokenJaccard(query.title, candidateParsed.title);

    let titleScore = Math.max(levenshteinRatio, jaccard);
    criteria.push('similarite_textuelle', 'mots_significatifs');

    // Critère 4 : artiste (pénalité en cas de divergence avérée).
    const bothArtistsKnown =
      query.artist.length > 0 && candidateParsed.artist.length > 0;
    if (bothArtistsKnown && query.artist !== candidateParsed.artist) {
      titleScore *= 0.5;
      criteria.push('artiste_divergent');
    } else if (!bothArtistsKnown) {
      criteria.push('artiste_inconnu_cote_un_cote');
    } else {
      criteria.push('artiste_identique');
    }

    // Critère 5 : marqueurs de version (Remix vs original).
    const versionMismatch =
      query.versionMarkers.length > 0 || candidateParsed.versionMarkers.length > 0
        ? !sameMarkers(query.versionMarkers, candidateParsed.versionMarkers)
        : false;
    if (versionMismatch) {
      criteria.push('marqueurs_version_divergents');
    }

    return { score: titleScore, criteria, versionMismatch };
  }

  /** Meilleure correspondance d'un morceau distant dans la bibliothèque locale. */
  match(query: MatchQuery, candidates: MatchCandidate[]): MatchResult {
    if (candidates.length === 0) {
      return { state: 'absent', score: 0, criteria: ['bibliotheque_vide'] };
    }

    // Artiste absent (fichiers sans métadonnée) : on analyse le
    // titre seul — le « Artiste - Titre » éventuel est dedans.
    const queryParsed = query.artist
      ? parseTrackName(`${query.artist} - ${query.title}`)
      : parseTrackName(query.title);

    let best: { candidate: MatchCandidate; score: number; criteria: string[]; versionMismatch: boolean } | null = null;
    for (const candidate of candidates) {
      const scored = this.scorePair(queryParsed, candidate);
      if (!best || scored.score > best.score) {
        best = { candidate, ...scored };
      }
    }

    if (!best) {
      return { state: 'absent', score: 0, criteria: [] };
    }

    const { score, criteria, versionMismatch } = best;
    const fingerprintExact =
      queryParsed.key.length > 0 && queryParsed.key === this.parseKey(best.candidate);

    // Règle forte : empreinte exacte → déjà présent.
    if (fingerprintExact && !versionMismatch) {
      return {
        state: 'present',
        score: 1,
        bestCandidateId: best.candidate.id,
        criteria: ['empreinte_exacte'],
      };
    }

    // Un score élevé ne confond jamais automatiquement un original
    // et une version (remix, live…) : correspondance incertaine.
    if (versionMismatch) {
      const baseQuery = this.stripMarkers(queryParsed);
      const baseCandidate = this.stripMarkers(
        parseTrackName(`${best.candidate.artist} - ${best.candidate.title}`),
      );
      const baseScore = Math.max(
        1 - levenshtein(baseQuery, baseCandidate) / Math.max(baseQuery.length, baseCandidate.length, 1),
        tokenJaccard(baseQuery, baseCandidate),
      );
      if (baseScore >= this.thresholds.uncertain) {
        return {
          state: 'uncertain',
          score,
          bestCandidateId: best.candidate.id,
          criteria: [...criteria, 'version_divergente_base_similaire'],
        };
      }
    }

    if (score >= this.thresholds.probable && !versionMismatch) {
      return {
        state: 'present',
        score,
        bestCandidateId: best.candidate.id,
        criteria,
      };
    }
    if (score >= this.thresholds.uncertain) {
      return { state: 'uncertain', score, bestCandidateId: best.candidate.id, criteria };
    }
    return { state: 'absent', score, bestCandidateId: best.candidate.id, criteria };
  }
}
