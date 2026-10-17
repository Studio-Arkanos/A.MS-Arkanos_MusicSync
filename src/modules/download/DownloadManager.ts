import type { DownloadItem, DownloadProviderId, SearchResult } from '../../domain/models';

/**
 * Fournisseurs de téléchargement AUTORISÉS (liste blanche).
 *
 * Module PRÉPARÉ à l'étape 1 : la liste blanche est vide et le
 * gestionnaire est un stub honnête. Seuls les fournisseurs
 * explicitement autorisés (licences / fichiers personnels) seront
 * branchés aux étapes 2 et 3.
 */

export interface DownloadProvider {
  readonly id: DownloadProviderId;
  readonly label: string;
  /** Le fournisseur figure-t-il sur la liste blanche ? */
  readonly allowed: boolean;
  isConfigured(): boolean;
  download(source: SearchResult): Promise<DownloadItem>;
}

export class DownloadProviderRegistry {
  private readonly providers = new Map<DownloadProviderId, DownloadProvider>();

  register(provider: DownloadProvider): void {
    this.providers.set(provider.id, provider);
  }

  list(): DownloadProvider[] {
    return [...this.providers.values()];
  }

  /** Fournisseurs à la fois autorisés ET configurés. */
  allowedAndConfigured(): DownloadProvider[] {
    return this.list().filter((p) => p.allowed && p.isConfigured());
  }
}

export interface DownloadManager {
  readonly operational: boolean;
  queue(source: SearchResult): Promise<DownloadItem>;
  list(): DownloadItem[];
}

export class DownloadManagerStub implements DownloadManager {
  readonly operational = false;

  async queue(_source: SearchResult): Promise<DownloadItem> {
    throw new Error(
      'DOWNLOAD_NOT_IMPLEMENTED : le gestionnaire de téléchargements sera branché à l’étape 3.',
    );
  }

  list(): DownloadItem[] {
    return [];
  }
}
