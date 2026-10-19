import type {
  MetadataProvider,
  ProviderCapabilities,
  ProviderResultPage,
  SearchProvider,
  SearchResultItem,
} from './types';

/**
 * Fournisseur YouTube (API Data v3 officielle).
 *
 * CAPACITÉS RÉELLES : recherche + métadonnées UNIQUEMENT.
 * Le téléchargement est EXPLICITEMENT désactivé :
 *  - les conditions d'utilisation de YouTube interdisent
 *    l'extraction de flux audio sans autorisation ;
 *  - aucune méthode de contournement n'est utilisée.
 *
 * Pour un résultat YouTube, l'action proposée est
 * « Ouvrir la source » (et « Suivre » pour la liste de suivi),
 * jamais « Télécharger ».
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const PAGE_SIZE = 20;

interface YouTubeSearchResponse {
  items?: Array<{
    id: { videoId?: string; kind?: string };
    snippet: {
      title: string;
      channelTitle?: string;
      thumbnails?: { default?: { url?: string } };
      channelId?: string;
    };
  }>;
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
}

export class YouTubeSearchProvider
  implements SearchProvider, MetadataProvider
{
  readonly id = 'youtube';
  readonly label = 'YouTube';

  /** download: false — déclaré honnêtement, jamais contourné. */
  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    download: false,
    playlist: false, // playlistAnalysis fourni par un autre module
    local: false,
  };

  constructor(private readonly getApiKey: () => string) {}

  isConfigured(): boolean {
    return this.getApiKey().trim().length > 0;
  }

  async search(query: string, continuationToken?: string): Promise<ProviderResultPage> {
    const apiKey = this.getApiKey().trim();
    if (!apiKey) {
      return {
        providerId: this.id,
        items: [],
        error: 'YOUTUBE_NOT_CONFIGURED : clé API requise (Paramètres).',
      };
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(PAGE_SIZE),
      q: query,
      key: apiKey,
      ...(continuationToken ? { pageToken: continuationToken } : {}),
    });

    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/search?${params.toString()}`,
      );
    } catch (networkError) {
      return {
        providerId: this.id,
        items: [],
        error: `YOUTUBE_NETWORK : ${(networkError as Error).message}`,
      };
    }

    if (!response.ok) {
      return {
        providerId: this.id,
        items: [],
        error: `YOUTUBE_HTTP_${response.status} : ${response.statusText}`,
      };
    }

    const data = (await response.json()) as YouTubeSearchResponse;
    const items = (data.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item): SearchResultItem => ({
        ref: item.id!.videoId!,
        providerId: this.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle ?? '',
        thumbnailUrl: item.snippet.thumbnails?.default?.url,
        type: 'video',
        downloadable: false, // jamais de téléchargement YouTube
        sourceUrl: `https://www.youtube.com/watch?v=${item.id!.videoId}`,
      }));

    return {
      providerId: this.id,
      items,
      nextToken: data.nextPageToken,
      total: data.pageInfo?.totalResults,
    };
  }

  /** Vérification réelle de disponibilité (liste de suivi). */
  async checkAvailability(
    refs: string[],
  ): Promise<Map<string, 'available' | 'private' | 'deleted' | 'unavailable'>> {
    const statuses = new Map<string, 'available' | 'private' | 'deleted' | 'unavailable'>();
    const apiKey = this.getApiKey().trim();
    if (!apiKey || refs.length === 0) return statuses;

    // Lots de 50 identifiants (limite de l'API).
    for (let offset = 0; offset < refs.length; offset += 50) {
      const batch = refs.slice(offset, offset + 50);
      const params = new URLSearchParams({
        part: 'status',
        id: batch.join(','),
        key: apiKey,
      });
      try {
        const response = await fetch(
          `${API_BASE}/videos?${params.toString()}`,
        );
        if (!response.ok) continue;
        const data = (await response.json()) as {
          items?: Array<{ id: string; status?: { privacyStatus?: string } }>;
        };
        const known = new Set(data.items?.map((video) => video.id) ?? []);
        for (const video of data.items ?? []) {
          const privacy = video.status?.privacyStatus;
          statuses.set(
            video.id,
            privacy === 'private'
              ? 'private'
              : privacy === 'unlisted' || privacy === 'public'
                ? 'available'
                : 'unavailable',
          );
        }
        // Absent de la réponse = supprimé.
        for (const ref of batch) {
          if (!known.has(ref)) statuses.set(ref, 'deleted');
        }
      } catch {
        // lot ignoré : signalé honnêtement comme non vérifié
      }
    }
    return statuses;
  }

  async getMetadata(ref: string): Promise<Partial<SearchResultItem> | null> {
    const apiKey = this.getApiKey().trim();
    if (!apiKey) return null;
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,status',
      id: ref,
      key: apiKey,
    });
    try {
      const response = await fetch(
        `${API_BASE}/videos?${params.toString()}`,
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        items?: Array<{
          id: string;
          snippet: { title: string; channelTitle?: string };
          contentDetails?: { duration?: string };
        }>;
      };
      const video = data.items?.[0];
      if (!video) return null;
      return {
        ref,
        providerId: this.id,
        title: video.snippet.title,
        artist: video.snippet.channelTitle ?? '',
        durationMs: video.contentDetails?.duration
          ? isoDurationToMs(video.contentDetails.duration)
          : undefined,
        sourceUrl: `https://www.youtube.com/watch?v=${ref}`,
        downloadable: false,
        type: 'video',
      };
    } catch {
      return null;
    }
  }
}

function isoDurationToMs(iso: string): number | undefined {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
