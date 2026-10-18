import type { DownloadItem, DownloadProviderId, SearchResult } from '../../domain/models';

/**
 * Fournisseurs de téléchargement AUTORISÉS (liste blanche).
 * Le moteur de téléchargement réel arrive à l'étape 3.
 * Garantie déjà en place : on n'écrase JAMAIS un fichier existant.
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
  /** Téléverse un morceau vers la cible indiquée. */
  queue(source: SearchResult, targetUri: string): Promise<DownloadItem>;
  /** Un fichier existe-t-il déjà à cette cible ? */
  exists(targetUri: string): boolean;
  list(): DownloadItem[];
}

export class DownloadManagerStub implements DownloadManager {
  constructor(private readonly existingTargets: Set<string> = new Set()) {}

  readonly operational = false;

  exists(targetUri: string): boolean {
    return this.existingTargets.has(targetUri);
  }

  async queue(_source: SearchResult, targetUri: string): Promise<DownloadItem> {
    // Garantie anti-écrasement, vérifiable dès maintenant.
    if (this.exists(targetUri)) {
      throw new Error(
        `DOWNLOAD_TARGET_EXISTS : un fichier existe déjà à cette cible (${targetUri}) — jamais écrasé.`,
      );
    }
    throw new Error(
      'DOWNLOAD_NOT_IMPLEMENTED : le moteur de téléchargement arrive à l’étape 3.',
    );
  }

  list(): DownloadItem[] {
    return [];
  }
}
