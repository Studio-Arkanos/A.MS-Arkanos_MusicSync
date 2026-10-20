/**
 * Architecture des fournisseurs (étape 3).
 *
 * Séparation stricte : recherche / métadonnées / téléchargement
 * autorisé / playlists / bibliothèque locale. Chaque fournisseur
 * déclare ses capacités RÉELLES — un fournisseur qui sait
 * seulement rechercher n'est jamais présenté comme fournisseur
 * de téléchargement.
 */

export type ProviderId = string;

export interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  download: boolean;
  playlist: boolean;
  local: boolean;
}

export type ResultType = 'track' | 'album' | 'playlist' | 'video';

export interface SearchResultItem {
  /** Référence stable chez le fournisseur. */
  ref: string;
  providerId: ProviderId;
  title: string;
  artist: string;
  album?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  type: ResultType;
  /** VRAI drapeau : le fournisseur autorise-t-il le téléchargement
   *  pour CE morceau (ex. Jamendo audiodownload_allowed) ? */
  downloadable: boolean;
  /** Informations de licence / droits lorsque fournies. */
  license?: string;
  licenseUrl?: string;
  /** Lien vers la source (ouverture, jamais extraction). */
  sourceUrl: string;
  /** URL de fichier autorisée — présente UNIQUEMENT si
   *  downloadable === true. */
  downloadUrl?: string;
}

export interface ProviderResultPage {
  providerId: ProviderId;
  items: SearchResultItem[];
  /** Jeton de continuation opaque pour la page suivante
   *  (offset Jamendo, pageToken YouTube) ; undefined = fin. */
  nextToken?: string;
  total?: number;
  error?: string;
}

export interface SearchQuery {
  query: string;
  /** URL de contenu prise en charge (import). */
  url?: string;
}

export interface SearchFilters {
  providerIds?: ProviderId[];
  downloadableOnly?: boolean;
}

export interface SearchProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;
  isConfigured(): boolean;
  /** continuationToken : jeton opaque de page suivante. */
  search(query: string, continuationToken?: string): Promise<ProviderResultPage>;
}

export interface MetadataProvider {
  readonly id: ProviderId;
  getMetadata(ref: string): Promise<Partial<SearchResultItem> | null>;
}

export interface DownloadRequest {
  url: string;
  displayName: string;
  license?: string;
}

export interface AuthorizedDownloadProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** Capacités déclarées — download doit être vrai. */
  readonly capabilities: ProviderCapabilities;
  isConfigured(): boolean;
  /** Le fournisseur autorise-t-il le téléchargement de CE résultat ? */
  canDownload(item: SearchResultItem): boolean;
  /** Prépare la requête de téléchargement autorisé. */
  getDownloadRequest(item: SearchResultItem): Promise<DownloadRequest>;
}

export interface PlaylistProvider {
  readonly id: ProviderId;
  analyze(config: { url: string; sourceId: string }): Promise<{
    status: 'ok' | 'empty' | 'not_configured' | 'unavailable' | 'error';
    tracks: Array<{
      ref: string;
      title: string;
      artist: string;
      thumbnailUrl?: string;
      durationMs?: number;
      availability: 'available' | 'private' | 'deleted' | 'unavailable';
    }>;
    errors: string[];
  }>;
}

export interface LocalLibraryProvider {
  /** Compare un titre distant avec la bibliothèque locale. */
  compare(track: { title: string; artist: string }): Promise<{
    state: 'present' | 'uncertain' | 'absent';
    score: number;
    localId?: string;
  }>;
}
