import type {
  AuthorizedDownloadProvider,
  ProviderId,
  SearchProvider,
  SearchFilters,
  SearchResultItem,
} from './types';

/**
 * Registre fédéré des fournisseurs.
 *
 * - recherche fédérée sur les fournisseurs CONFIGURÉS ;
 * - filtres par fournisseur et par disponibilité du
 *   téléchargement ;
 * - pagination par jetons de continuation (opaques,
 *   propres à chaque fournisseur) ;
 * - aucun résultat n'est jamais fabriqué : un fournisseur
 *   non configuré ou en erreur est signalé comme tel.
 */

export interface FederatedPage {
  items: SearchResultItem[];
  /** Erreurs par fournisseur (jamais masquées). */
  errors: Array<{ providerId: ProviderId; error: string }>;
  /** Jetons de continuation pour les pages suivantes. */
  nextTokens: Map<ProviderId, string>;
}

export class ProviderRegistry {
  private readonly searchProviders = new Map<ProviderId, SearchProvider>();
  private readonly downloadProviders = new Map<
    ProviderId,
    AuthorizedDownloadProvider
  >();

  registerSearch(provider: SearchProvider): void {
    this.searchProviders.set(provider.id, provider);
  }

  registerDownload(provider: AuthorizedDownloadProvider): void {
    this.downloadProviders.set(provider.id, provider);
  }

  searchProvidersList(): SearchProvider[] {
    return [...this.searchProviders.values()];
  }

  downloadProvidersList(): AuthorizedDownloadProvider[] {
    return [...this.downloadProviders.values()];
  }

  /** Fournisseurs de téléchargement AUTORISÉS et configurés. */
  authorizedDownloadProviders(): AuthorizedDownloadProvider[] {
    return [...this.downloadProviders.values()].filter(
      (provider) =>
        provider.capabilities.download && provider.isConfigured(),
    );
  }

  /**
   * Fournisseurs sachant À LA FOIS rechercher ET télécharger
   * (autorisé). C'est l'intersection réelle — un fournisseur
   * qui sait seulement rechercher n'y figure jamais.
   */
  searchAndDownloadProviders(): Array<
    SearchProvider & AuthorizedDownloadProvider
  > {
    const combined: Array<SearchProvider & AuthorizedDownloadProvider> = [];
    for (const [id, search] of this.searchProviders) {
      const download = this.downloadProviders.get(id);
      // Même identifiant + même instance (câblage services).
      if (
        download &&
        download === (search as unknown) &&
        search.capabilities.search &&
        download.capabilities.download &&
        search.isConfigured() &&
        download.isConfigured()
      ) {
        combined.push(search as SearchProvider & AuthorizedDownloadProvider);
      }
    }
    return combined;
  }

  getSearchProvider(id: ProviderId): SearchProvider | undefined {
    return this.searchProviders.get(id);
  }

  getDownloadProvider(id: ProviderId): AuthorizedDownloadProvider | undefined {
    return this.downloadProviders.get(id);
  }

  /**
   * Recherche fédérée. `continuations` porte, par fournisseur,
   * le jeton de la page à appeler (undefined = première page).
   */
  async searchPage(
    query: string,
    continuations: Map<ProviderId, string | undefined>,
    filters: SearchFilters = {},
  ): Promise<FederatedPage> {
    const providers = [...this.searchProviders.values()].filter(
      (provider) =>
        provider.isConfigured() &&
        (!filters.providerIds ||
          filters.providerIds.length === 0 ||
          filters.providerIds.includes(provider.id)),
    );

    const pages = await Promise.all(
      providers.map(async (provider) => {
        const pageResult = await provider.search(
          query,
          continuations.get(provider.id),
        );
        return { provider, pageResult };
      }),
    );

    let items: SearchResultItem[] = [];
    const errors: Array<{ providerId: ProviderId; error: string }> = [];
    const nextTokens = new Map<ProviderId, string>();

    for (const { provider, pageResult } of pages) {
      if (pageResult.error) {
        errors.push({ providerId: provider.id, error: pageResult.error });
        continue;
      }
      items.push(...pageResult.items);
      if (pageResult.nextToken !== undefined) {
        nextTokens.set(provider.id, pageResult.nextToken);
      }
    }

    if (filters.downloadableOnly) {
      items = items.filter((item) => item.downloadable);
    }

    return { items, errors, nextTokens };
  }
}
