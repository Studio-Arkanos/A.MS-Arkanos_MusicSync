import type { SearchResult, SearchProviderId } from '../../domain/models';

/**
 * Fournisseurs de recherche (catalogues distants).
 *
 * Module PRÉPARÉ à l'étape 1 : aucun fournisseur n'est enregistré.
 * Le registre est l'extension point des étapes suivantes
 * (Spotify / Deezer / Apple Music / YouTube Music… via leurs API).
 */

export interface SearchProvider {
  readonly id: SearchProviderId;
  readonly label: string;
  /** Le fournisseur est-il configuré (clés/authentification) ? */
  isConfigured(): boolean;
  search(query: string): Promise<SearchResult[]>;
}

export class SearchProviderRegistry {
  private readonly providers = new Map<SearchProviderId, SearchProvider>();

  register(provider: SearchProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(id: SearchProviderId): void {
    this.providers.delete(id);
  }

  list(): SearchProvider[] {
    return [...this.providers.values()];
  }

  /** Uniquement les fournisseurs réellement configurés. */
  configured(): SearchProvider[] {
    return this.list().filter((provider) => provider.isConfigured());
  }

  /** Recherche fédérée. Aucun fournisseur configuré → aucun résultat fabriqué. */
  async searchAll(query: string): Promise<SearchResult[]> {
    const configured = this.configured();
    if (configured.length === 0) return [];
    const results = await Promise.all(configured.map((p) => p.search(query)));
    return results.flat();
  }
}
