import type { MatchCandidate, MatchResult, MatchState } from '../duplicates/matcher';
import { DuplicateMatcher } from '../duplicates/matcher';
import type { DecisionResolution } from '../decisions/decisions';
import type { ExclusionStore } from '../exclusions/exclusions';
import type { PlaylistTrack } from '../playlist/playlist';

/**
 * Planificateur de synchronisation (étape 2).
 *
 * Règles :
 *  - bibliothèque vide : tout morceau accessible et admissible
 *    est candidat, sauf exclusions ;
 *  - bibliothèque remplie sans correspondance : idem ;
 *  - synchronisation partielle : seuls les morceaux manquants
 *    sont candidats ;
 *  - bibliothèque synchronisée : aucun téléchargement inutile ;
 *  - playlist inaccessible : aucun plan n'est produit (erreur
 *    affichée, rien n'est prétendu vérifié) ;
 *  - une exclusion PRIME toujours sur l'automatisme ;
 *  - une correspondance incertaine n'est jamais téléchargée
 *    automatiquement : elle devient une décision en attente.
 */

export interface TrackPlan {
  track: PlaylistTrack;
  matchState: MatchState | 'unavailable';
  excluded: boolean;
  /** Vrai uniquement si un téléchargement serait légitime. */
  candidate: boolean;
  reason: string;
  score?: number;
  /** Morceau local candidat à la correspondance incertaine. */
  matchedLocalId?: string;
}

export interface SyncSummary {
  found: number;
  present: number;
  absent: number;
  uncertain: number;
  excluded: number;
  unavailable: number;
  candidates: number;
}

export interface PlanResult {
  plans: TrackPlan[];
  summary: SyncSummary;
}

export class SyncPlanner {
  constructor(
    private readonly matcher: DuplicateMatcher,
    private readonly exclusions: ExclusionStore,
    private readonly resolutionFor?: (
      sourceId: string,
      trackRef: string,
    ) => DecisionResolution | null,
  ) {}

  plan(
    playlist: PlaylistTrack[],
    library: MatchCandidate[],
    sourceId: string,
  ): PlanResult {
    const plans: TrackPlan[] = playlist.map((track) =>
      this.planOne(track, library, sourceId),
    );

    const summary: SyncSummary = {
      found: plans.filter((plan) => plan.matchState !== 'unavailable').length,
      present: plans.filter((plan) => plan.matchState === 'present').length,
      absent: plans.filter((plan) => plan.matchState === 'absent').length,
      uncertain: plans.filter((plan) => plan.matchState === 'uncertain').length,
      excluded: plans.filter((plan) => plan.excluded).length,
      unavailable: plans.filter((plan) => plan.matchState === 'unavailable').length,
      candidates: plans.filter((plan) => plan.candidate).length,
    };

    return { plans, summary };
  }

  private planOne(
    track: PlaylistTrack,
    library: MatchCandidate[],
    sourceId: string,
  ): TrackPlan {
    // 1. Disponibilité source.
    if (track.availability !== 'available') {
      return {
        track,
        matchState: 'unavailable',
        excluded: false,
        candidate: false,
        reason: `indisponible (${track.availability})`,
      };
    }

    // 2. Exclusion utilisateur : prime sur tout automatisme.
    if (this.exclusions.isExcluded(sourceId, track.ref)) {
      const match = this.match(track, library);
      return {
        track,
        matchState: match.state,
        excluded: true,
        candidate: false,
        reason: 'exclu par l’utilisateur — jamais téléchargé',
        score: match.score,
      };
    }

    // 3. Décision explicite antérieure de l'utilisateur.
    const resolution = this.resolutionFor?.(sourceId, track.ref);
    if (resolution === 'present') {
      return {
        track,
        matchState: 'present',
        excluded: false,
        candidate: false,
        reason: 'marqué « Déjà présent » par l’utilisateur',
      };
    }
    if (resolution === 'ignore') {
      return {
        track,
        matchState: 'absent',
        excluded: false,
        candidate: false,
        reason: 'ignoré par l’utilisateur',
      };
    }

    // 4. Correspondance réelle contre la bibliothèque.
    const match = this.match(track, library);
    switch (match.state) {
      case 'present':
        return {
          track,
          matchState: 'present',
          excluded: false,
          candidate: false,
          reason: 'déjà présent dans la bibliothèque',
          score: match.score,
          matchedLocalId: match.bestCandidateId,
        };
      case 'uncertain':
        return {
          track,
          matchState: 'uncertain',
          excluded: false,
          candidate: false,
          reason: 'correspondance incertaine — décision requise',
          score: match.score,
          matchedLocalId: match.bestCandidateId,
        };
      case 'absent':
      default:
        return {
          track,
          matchState: 'absent',
          excluded: false,
          candidate: true,
          reason: 'absent de la bibliothèque — candidat au téléchargement',
          score: match.score,
        };
    }
  }

  private match(track: PlaylistTrack, library: MatchCandidate[]): MatchResult {
    return this.matcher.match(
      { title: track.title, artist: track.artist },
      library,
    );
  }
}

/** Résumé en une ligne lisible (français). */
export function summarize(summary: SyncSummary): string {
  return `trouvés ${summary.found} · présents ${summary.present} · absents ${summary.absent} · incertains ${summary.uncertain} · exclus ${summary.excluded} · indisponibles ${summary.unavailable} · candidats ${summary.candidates}`;
}
