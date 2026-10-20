import type { ExclusionStore } from '../exclusions/exclusions';
import type { MatchCandidate, MatchState } from '../duplicates/matcher';
import type { ProviderRegistry } from '../providers/registry';
import type { SearchResultItem } from '../providers/types';

/**
 * Association playlist ↔ fournisseurs de téléchargement.
 *
 * Principe (cahier des charges) :
 *  - on récupère le titre et les infos autorisées du morceau ;
 *  - on recherche des correspondances chez les fournisseurs
 *    COMPATIBLES (téléchargement autorisé uniquement) ;
 *  - on compare avec la bibliothèque locale ;
 *  - on présente les candidats ET leur source ;
 *  - une correspondance incertaine exige une confirmation ;
 *  - on ne télécharge que depuis une source autorisée,
 *    après application des règles d'exclusion ;
 *  - deux morceaux ne sont jamais jugés identiques uniquement
 *    à cause de titres proches (seuils du matcher) ;
 *  - les versions multiples sont présentées distinctement.
 */

export interface AssociationCandidate {
  item: SearchResultItem;
  matchState: MatchState;
  score: number;
  /** Exclu par l'utilisateur (playlist ou recherche). */
  excluded: boolean;
  /** Téléchargement légitime et autorisé. */
  eligible: boolean;
  reason: string;
}

export class PlaylistAssociation {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly matcher: {
      match(
        query: { title: string; artist: string },
        candidates: MatchCandidate[],
      ): { state: MatchState; score: number };
    },
    private readonly exclusionStore: ExclusionStore,
  ) {}

  async findDownloadableVersions(
    track: { title: string; artist: string },
    library: MatchCandidate[],
    /** sourceId de la playlist d'origine (si association depuis une playlist). */
    playlistSourceId: string | null,
    playlistTrackRef: string | null,
  ): Promise<AssociationCandidate[]> {
    // Fournisseurs sachant rechercher ET télécharger
    // (autorisé) — jamais un fournisseur « recherche seule ».
    const providers = this.registry.searchAndDownloadProviders();

    const pages = await Promise.all(
      providers.map((provider) =>
        provider
          .search(`${track.title} ${track.artist}`)
          .catch(() => ({
            providerId: provider.id,
            items: [],
            error: 'SEARCH_FAILED',
          })),
      ),
    );

    // Uniquement les résultats téléchargeables.
    const items = pages
      .flatMap((page) => page.items)
      .filter((item) => item.downloadable);

    return items
      .map((item) => this.evaluate(item, library, playlistSourceId, playlistTrackRef))
      .sort((a, b) => b.score - a.score);
  }

  private evaluate(
    item: SearchResultItem,
    library: MatchCandidate[],
    playlistSourceId: string | null,
    playlistTrackRef: string | null,
  ): AssociationCandidate {
    const match = this.matcher.match(
      { title: item.title, artist: item.artist },
      library,
    );

    // Exclusion playlist (identité stable source+morceau d'origine)
    // OU exclusion de ce candidat précis (source « recherche »).
    const excludedByPlaylist =
      playlistSourceId !== null &&
      playlistTrackRef !== null &&
      this.exclusionStore.isExcluded(playlistSourceId, playlistTrackRef);
    const excludedByCandidate = this.exclusionStore.isExcluded(
      'search',
      item.ref,
    );
    const excluded = excludedByPlaylist || excludedByCandidate;

    let eligible = false;
    let reason: string;
    if (match.state === 'present') {
      reason = 'déjà présent dans la bibliothèque — aucun téléchargement';
    } else if (excluded) {
      reason = 'exclu par l’utilisateur — l’exclusion prime sur l’automatisme';
    } else if (!item.downloadable) {
      reason = 'téléchargement non autorisé par le fournisseur';
    } else if (match.state === 'uncertain') {
      reason = 'correspondance incertaine — confirmation requise';
      // Éligible mais à confirmer : l'UI exigera un accusé.
      eligible = true;
    } else {
      reason = 'version autorisée candidate';
      eligible = true;
    }

    return {
      item,
      matchState: match.state,
      score: match.score,
      excluded,
      eligible,
      reason,
    };
  }
}
