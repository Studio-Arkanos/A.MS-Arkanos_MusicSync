import AmsNative from '../../plugins/amsNative';
import type { DownloadTask, NewDownloadTask } from '../download/DownloadEngine';
import type { NativeDownloadEngine } from '../download/DownloadEngine';
import { safeFileName } from '../providers/jamendo';
import type { JamendoProvider } from '../providers/jamendo';

/** Pont natif (injectable pour les tests). */
export interface ImportBridge {
  probeUrl(options: {
    url: string;
  }): Promise<{ statusCode: number; contentType: string; contentLength: number }>;
}

/**
 * Import d'URL directe (étape 3).
 *
 * Règles strictes :
 *  - URL valide http(s) ;
 *  - Jamendo : résolution officielle via l'API (track id),
 *    téléchargement UNIQUEMENT si audiodownload_allowed ;
 *  - YouTube : jamais d'extraction — « Ouvrir la source » ;
 *  - autre source : sonde native du type de contenu —
 *    seules les ressources audio directes sont acceptées ;
 *  - aucun contournement de paywall, DRM ou restriction.
 */

export type ImportOutcome =
  | { status: 'queued'; task: DownloadTask }
  | { status: 'open_only'; reason: string; url: string }
  | { status: 'refused'; reason: string }
  | { status: 'error'; reason: string };

export class UrlImportService {
  constructor(
    private readonly jamendo: JamendoProvider,
    private readonly engine: NativeDownloadEngine,
    private readonly bridge: ImportBridge = AmsNative,
  ) {}

  async importUrl(rawUrl: string, folderUri?: string): Promise<ImportOutcome> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { status: 'refused', reason: 'URL_INVALID : URL malformée.' };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { status: 'refused', reason: 'URL_PROTOCOL : http(s) requis.' };
    }

    // --- Jamendo : résolution officielle par l'API ---
    const jamendoMatch = url.pathname.match(/^\/track\/(\d+)/);
    if (jamendoMatch) {
      if (!this.jamendo.isConfigured()) {
        return { status: 'error', reason: 'JAMENDO_NOT_CONFIGURED' };
      }
      const metadata = await this.jamendo.getMetadata(jamendoMatch[1]!);
      if (!metadata) {
        return { status: 'refused', reason: 'JAMENDO_TRACK_NOT_FOUND' };
      }
      if (!metadata.downloadable || !metadata.downloadUrl) {
        return {
          status: 'open_only',
          reason: 'JAMENDO_DOWNLOAD_NOT_ALLOWED : l’artiste n’autorise pas le téléchargement.',
          url: metadata.sourceUrl ?? url.toString(),
        };
      }
      return this.queue(
        {
          ref: jamendoMatch[1]!,
          providerId: metadata.providerId ?? this.jamendo.id,
          title: metadata.title ?? '',
          artist: metadata.artist ?? '',
          sourceUrl: metadata.sourceUrl,
          downloadUrl: metadata.downloadUrl,
          license: metadata.license,
        },
        url,
        folderUri,
      );
    }

    // --- YouTube : ouverture uniquement, jamais d'extraction ---
    if (/(^|\.)youtube\.com$/.test(url.hostname) || url.hostname === 'youtu.be') {
      return {
        status: 'open_only',
        reason:
          'YOUTUBE_NO_EXTRACTION : les conditions de YouTube interdisent l’extraction de flux audio. Le morceau sera ouvert sur YouTube.',
        url: url.toString(),
      };
    }

    // --- Autre source : sonde native du type de contenu ---
    try {
      const probe = await this.bridge.probeUrl({ url: url.toString() });
      if (probe.statusCode !== 200) {
        return {
          status: 'refused',
          reason: `URL_UNAVAILABLE : HTTP ${probe.statusCode}.`,
        };
      }
      if (!probe.contentType.startsWith('audio/')) {
        return {
          status: 'refused',
          reason:
            'NOT_AN_AUDIO_RESOURCE : cette page n’est pas une ressource audio téléchargeable et aucune intégration officielle n’existe pour cette source.',
        };
      }
      const name = safeFileName(
        url.pathname.split('/').pop() || `import-${Date.now()}.mp3`,
      );
      return this.queue(
        {
          ref: url.toString(),
          providerId: 'url',
          title: name,
          artist: '',
          sourceUrl: url.toString(),
          downloadUrl: url.toString(),
        },
        url,
        folderUri,
      );
    } catch (error) {
      return { status: 'error', reason: `PROBE_FAILED : ${(error as Error).message}` };
    }
  }

  private async queue(
    item: { ref: string; providerId: string; title: string; artist: string; sourceUrl?: string; downloadUrl?: string; license?: string },
    pageUrl: URL,
    folderUri?: string,
  ): Promise<ImportOutcome> {
    if (!item.downloadUrl) {
      return { status: 'refused', reason: 'DOWNLOAD_URL_MISSING' };
    }
    const task = await this.engine.enqueue(
      this.toTask(item, pageUrl),
      folderUri,
    );
    return { status: 'queued', task };
  }

  private toTask(
    item: { ref: string; providerId: string; title: string; artist: string; sourceUrl?: string; downloadUrl?: string; license?: string },
    pageUrl: URL,
  ): NewDownloadTask {
    const displayName = safeFileName(`${item.title}.mp3`);
    return {
      providerId: item.providerId,
      trackRef: item.ref,
      title: item.title,
      artist: item.artist,
      sourceUrl: item.sourceUrl ?? pageUrl.toString(),
      fileUrl: item.downloadUrl ?? pageUrl.toString(),
      displayName,
      license: item.license,
    };
  }
}
