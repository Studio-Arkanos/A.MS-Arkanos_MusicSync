import type {
  AuthorizedDownloadProvider,
  MetadataProvider,
  ProviderCapabilities,
  ProviderResultPage,
  SearchProvider,
  SearchResultItem,
} from './types';

/**
 * Fournisseur Jamendo (API v3 officielle).
 *
 * Jamendo est le fournisseur de TÉLÉCHARGEMENT AUTORISÉ
 * d'A.MS : les artistes activent eux-mêmes
 * `audiodownload_allowed`, et l'API renvoie alors l'URL
 * directe du fichier. Conditions (vérifiées dans la doc
 * officielle) :
 *  - client_id gratuit requis (devportal.jamendo.com) ;
 *  - téléchargement UNIQUEMENT quand l'artiste l'autorise ;
 *  - licences Creative Commons / Jamendo — attribution requise ;
 *  - usage non commercial par défaut (licence commerciale
 *    Jamendo pour un usage commercial).
 *
 * Aucun contournement : si audiodownload_allowed est faux,
 * le bouton « Télécharger » est remplacé par « Ouvrir la source ».
 */

const API_BASE = 'https://api.jamendo.com/v3.0';
const PAGE_SIZE = 20;

interface JamendoTrackRaw {
  id: string | number;
  name: string;
  artist_name: string;
  artist_id?: string | number;
  album_name?: string;
  album_id?: string | number;
  duration?: string | number; // secondes
  image?: string;
  shareurl?: string;
  audio?: string;
  audiodownload_allowed?: boolean;
  audiodownload?: string;
  licensing?: Array<{ name?: string; url?: string }>;
}

interface JamendoResponse {
  headers?: { status?: string; results_count?: number };
  results?: JamendoTrackRaw[];
}

function toMilliseconds(seconds: string | number | undefined): number | undefined {
  const parsed = Number(seconds);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : undefined;
}

export class JamendoProvider
  implements SearchProvider, MetadataProvider, AuthorizedDownloadProvider
{
  readonly id = 'jamendo';
  readonly label = 'Jamendo';

  /** Capacités RÉELLES : recherche, métadonnées ET téléchargement autorisé. */
  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    download: true,
    playlist: false,
    local: false,
  };

  constructor(private readonly getClientId: () => string) {}

  isConfigured(): boolean {
    return this.getClientId().trim().length > 0;
  }

  async search(query: string, continuationToken?: string): Promise<ProviderResultPage> {
    const clientId = this.getClientId().trim();
    if (!clientId) {
      return {
        providerId: this.id,
        items: [],
        error: 'JAMENDO_NOT_CONFIGURED : client_id requis (Paramètres).',
      };
    }

    const offset = continuationToken ? Number(continuationToken) : 0;
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      limit: String(PAGE_SIZE),
      offset: String(offset),
      search: query,
      // Types simples + singles inclus ; licences détaillées.
      type: 'single albumtrack',
      include: 'licenses',
      fullcount: 'true',
      // Format de téléchargement demandé : MP3 VBR qualité correcte.
      audiodlformat: 'mp32',
    });

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/tracks/?${params.toString()}`);
    } catch (networkError) {
      return {
        providerId: this.id,
        items: [],
        error: `JAMENDO_NETWORK : ${(networkError as Error).message}`,
      };
    }

    if (!response.ok) {
      return {
        providerId: this.id,
        items: [],
        error: `JAMENDO_HTTP_${response.status} : ${response.statusText}`,
      };
    }

    const data = (await response.json()) as JamendoResponse;
    if (data.headers?.status !== 'success') {
      return {
        providerId: this.id,
        items: [],
        error: 'JAMENDO_API_ERROR : réponse non réussie.',
      };
    }

    const items = (data.results ?? []).map((track) =>
      this.toResult(track),
    );
    // Pagination par offset (plafond de sécurité : 1000 résultats).
    const nextToken =
      items.length === PAGE_SIZE && offset + PAGE_SIZE < 1000
        ? String(offset + PAGE_SIZE)
        : undefined;

    return {
      providerId: this.id,
      items,
      nextToken,
      total: data.headers?.results_count,
    };
  }

  async getMetadata(ref: string): Promise<Partial<SearchResultItem> | null> {
    const clientId = this.getClientId().trim();
    if (!clientId) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      id: ref,
      include: 'licenses',
    });
    try {
      const response = await fetch(`${API_BASE}/tracks/?${params.toString()}`);
      if (!response.ok) return null;
      const data = (await response.json()) as JamendoResponse;
      const track = data.results?.[0];
      return track ? this.toResult(track) : null;
    } catch {
      return null;
    }
  }

  canDownload(item: SearchResultItem): boolean {
    return item.downloadable && this.isConfigured();
  }

  async getDownloadRequest(item: SearchResultItem): Promise<{
    url: string;
    displayName: string;
    license?: string;
  }> {
    if (!this.canDownload(item)) {
      throw new Error(
        'JAMENDO_DOWNLOAD_NOT_ALLOWED : téléchargement non autorisé pour ce morceau.',
      );
    }
    if (!item.downloadUrl) {
      throw new Error('JAMENDO_DOWNLOAD_URL_MISSING : URL autorisée absente.');
    }
    return {
      url: item.downloadUrl,
      displayName: safeFileName(`${item.artist} - ${item.title}`),
      license: item.license,
    };
  }

  private toResult(track: JamendoTrackRaw): SearchResultItem {
    const downloadable =
      track.audiodownload_allowed === true &&
      typeof track.audiodownload === 'string' &&
      track.audiodownload.length > 0;

    return {
      ref: String(track.id),
      providerId: this.id,
      title: track.name ?? 'Sans titre',
      artist: track.artist_name ?? 'Artiste inconnu',
      album: track.album_name || undefined,
      thumbnailUrl: track.image || undefined,
      durationMs: toMilliseconds(track.duration),
      type: 'track',
      downloadable,
      license: track.licensing?.[0]?.name,
      licenseUrl: track.licensing?.[0]?.url,
      sourceUrl:
        track.shareurl ?? `https://www.jamendo.com/track/${track.id}`,
      // URL de fichier présente UNIQUEMENT si l'artiste autorise.
      downloadUrl: downloadable ? track.audiodownload : undefined,
    };
  }
}

/** Nom de fichier sûr (sans séparateurs de chemin). */
export function safeFileName(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'morceau'
  );
}
