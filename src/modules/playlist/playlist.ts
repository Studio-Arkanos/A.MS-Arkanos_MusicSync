/**
 * Playlist : configuration, analyse via l'API YouTube officielle.
 *
 * La récupération des MÉTADONNÉES d'une playlist (titres, artistes,
 * miniatures, disponibilité) ne signifie pas que l'audio puisse être
 * téléchargé : le téléchargement reste régi par la liste blanche
 * des fournisseurs autorisés (étape 3).
 *
 * Règles :
 *  - aucune clé API configurée → statut « not_configured » (jamais
 *    de scraping ni de faux résultats) ;
 *  - playlist vide (0 morceau) → statut « empty » — distinct d'une erreur ;
 *  - playlist supprimée / privée / URL invalide → statut « error »
 *    ou « unavailable ».
 */

export interface PlaylistConfig {
  name: string;
  url: string;
  /** Identité stable : l'identifiant de playlist (ex. PL-xxxx). */
  sourceId: string;
}

/** Playlist initiale fournie par le cahier des charges. */
export const DEFAULT_PLAYLIST: PlaylistConfig = {
  name: 'Zenith',
  url: 'https://youtube.com/playlist?list=PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub',
  sourceId: 'PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub',
};

export type TrackAvailability =
  | 'available'
  | 'private'
  | 'deleted'
  | 'unavailable';

export interface PlaylistTrack {
  /** Identifiant stable de la vidéo source. */
  ref: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  durationMs?: number;
  availability: TrackAvailability;
  source: string; // 'youtube'
}

export type PlaylistAnalysisStatus =
  | 'ok'
  | 'empty'
  | 'not_configured'
  | 'unavailable'
  | 'error';

export interface PlaylistAnalysis {
  status: PlaylistAnalysisStatus;
  playlistId: string | null;
  tracks: PlaylistTrack[];
  errors: string[];
  analyzedAt: string;
}

export interface PlaylistProvider {
  analyze(config: PlaylistConfig, apiKey?: string): Promise<PlaylistAnalysis>;
}

/** Extrait l'identifiant de playlist d'une URL YouTube. */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return match ? match[1]! : null;
}

/** Durée ISO 8601 (PT#M#S) → millisecondes. */
export function parseIsoDuration(iso: string): number | undefined {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

interface YouTubeApiError extends Error {
  status?: number;
}

/**
 * Fournisseur officiel YouTube Data API v3.
 * Respecte les conditions d'utilisation : appels authentifiés par
 * clé, quota respecté (pagination maxResults=50), aucun contournement
 * de protection, aucune extraction d'audio.
 */
export class YouTubePlaylistProvider implements PlaylistProvider {
  private readonly apiBase = 'https://www.googleapis.com/youtube/v3';

  async analyze(
    config: PlaylistConfig,
    apiKey?: string,
  ): Promise<PlaylistAnalysis> {
    const analyzedAt = new Date().toISOString();
    const playlistId = extractPlaylistId(config.url);

    if (!playlistId) {
      return {
        status: 'error',
        playlistId: null,
        tracks: [],
        errors: ['PLAYLIST_URL_INVALID : aucun identifiant « list= » trouvé.'],
        analyzedAt,
      };
    }

    if (!apiKey) {
      return {
        status: 'not_configured',
        playlistId,
        tracks: [],
        errors: [
          'YOUTUBE_API_KEY_MISSING : configurez une clé YouTube Data API v3 dans Paramètres.',
        ],
        analyzedAt,
      };
    }

    try {
      const items = await this.fetchAllItems(playlistId, apiKey);

      if (items.length === 0) {
        return {
          status: 'empty',
          playlistId,
          tracks: [],
          errors: [],
          analyzedAt,
        };
      }

      const tracks = await this.enrichWithVideoDetails(items, apiKey);
      return { status: 'ok', playlistId, tracks, errors: [], analyzedAt };
    } catch (error) {
      const apiError = error as YouTubeApiError;
      const status =
        apiError.status === 404 || apiError.status === 403
          ? 'unavailable'
          : 'error';
      return {
        status,
        playlistId,
        tracks: [],
        errors: [`YOUTUBE_API_${apiError.status ?? 'UNKNOWN'} : ${apiError.message}`],
        analyzedAt,
      };
    }
  }

  private async fetchAllItems(
    playlistId: string,
    apiKey: string,
  ): Promise<Array<{ videoId: string; title: string; thumbnail?: string }>> {
    const items: Array<{ videoId: string; title: string; thumbnail?: string }> = [];
    let pageToken: string | undefined;

    // Pagination plafonnée : une playlist reste raisonnable (< 500 vidéos).
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        key: apiKey,
        ...(pageToken ? { pageToken } : {}),
      });
      const response = await fetch(
        `${this.apiBase}/playlistItems?${params.toString()}`,
      );
      if (!response.ok) {
        const error = new Error(
          `playlistItems HTTP ${response.status}`,
        ) as YouTubeApiError;
        error.status = response.status;
        throw error;
      }
      const data = (await response.json()) as {
        items?: Array<{
          snippet: {
            title: string;
            thumbnails?: { default?: { url?: string } };
          };
          contentDetails: { videoId: string };
        }>;
        nextPageToken?: string;
      };
      for (const item of data.items ?? []) {
        items.push({
          videoId: item.contentDetails.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.default?.url,
        });
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return items;
  }

  private async enrichWithVideoDetails(
    items: Array<{ videoId: string; title: string; thumbnail?: string }>,
    apiKey: string,
  ): Promise<PlaylistTrack[]> {
    const tracks: PlaylistTrack[] = [];
    // Lots de 50 identifiants (limite de l'API).
    for (let offset = 0; offset < items.length; offset += 50) {
      const batch = items.slice(offset, offset + 50);
      const params = new URLSearchParams({
        part: 'snippet,contentDetails,status',
        id: batch.map((item) => item.videoId).join(','),
        key: apiKey,
      });
      const response = await fetch(
        `${this.apiBase}/videos?${params.toString()}`,
      );
      if (!response.ok) {
        const error = new Error(`videos HTTP ${response.status}`) as YouTubeApiError;
        error.status = response.status;
        throw error;
      }
      const data = (await response.json()) as {
        items?: Array<{
          id: string;
          snippet: { title: string; thumbnails?: { default?: { url?: string } } };
          contentDetails?: { duration?: string };
          status?: { privacyStatus?: string };
        }>;
      };
      const byId = new Map((data.items ?? []).map((video) => [video.id, video]));

      for (const item of batch) {
        const details = byId.get(item.videoId);
        // Vidéo absente de la réponse = supprimée, privée ou indisponible.
        const availability: TrackAvailability = !details
          ? 'unavailable'
          : details.status?.privacyStatus === 'private'
            ? 'private'
            : 'available';
        tracks.push({
          ref: item.videoId,
          title: item.title,
          artist: '', // enrichi par l'analyse de titre côté appelant si besoin
          thumbnailUrl: details?.snippet.thumbnails?.default?.url ?? item.thumbnail,
          durationMs: details?.contentDetails?.duration
            ? parseIsoDuration(details.contentDetails.duration)
            : undefined,
          availability,
          source: 'youtube',
        });
      }
    }
    return tracks;
  }
}
