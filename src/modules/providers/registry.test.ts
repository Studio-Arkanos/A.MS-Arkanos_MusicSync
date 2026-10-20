import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from './registry';
import type {
  AuthorizedDownloadProvider,
  SearchProvider,
} from './types';

/** Fournisseur de test contrôlable. */
class FakeProvider
  implements SearchProvider, AuthorizedDownloadProvider
{
  readonly label: string;
  readonly capabilities: {
    search: boolean;
    metadata: boolean;
    download: boolean;
    playlist: boolean;
    local: boolean;
  };

  constructor(
    readonly id: string,
    private readonly configured: boolean,
    private readonly downloadable: boolean,
    private readonly items: Array<{ ref: string; title: string }>,
    private readonly error?: string,
  ) {
    this.label = `Fournisseur ${id}`;
    this.capabilities = {
      search: true,
      metadata: true,
      download: downloadable,
      playlist: false,
      local: false,
    };
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async search(query: string) {
    if (this.error) {
      return {
        providerId: this.id,
        items: [],
        error: this.error,
      };
    }
    if (!query) {
      return { providerId: this.id, items: [], error: 'EMPTY_QUERY' };
    }
    return {
      providerId: this.id,
      items: this.items.map((item) => ({
        ref: item.ref,
        providerId: this.id,
        title: item.title,
        artist: 'Artiste',
        type: 'track' as const,
        downloadable: this.downloadable,
        sourceUrl: `https://example.com/${item.ref}`,
        downloadUrl: this.downloadable
          ? `https://example.com/files/${item.ref}.mp3`
          : undefined,
      })),
    };
  }

  canDownload() {
    return this.downloadable;
  }

  async getDownloadRequest(item: { title: string }) {
    return { url: 'https://example.com/f.mp3', displayName: `${item.title}.mp3` };
  }
}

describe('ProviderRegistry — fédération', () => {
  it('combine les résultats de plusieurs fournisseurs', async () => {
    const registry = new ProviderRegistry();
    registry.registerSearch(
      new FakeProvider('a', true, true, [{ ref: 'a1', title: 'Titre A' }]),
    );
    registry.registerSearch(
      new FakeProvider('b', true, false, [{ ref: 'b1', title: 'Titre B' }]),
    );
    const page = await registry.searchPage('requete', new Map(), {});
    expect(page.items).toHaveLength(2);
    expect(page.errors).toEqual([]);
  });

  it('un fournisseur non configuré est exclu (rien de fabriqué)', async () => {
    const registry = new ProviderRegistry();
    registry.registerSearch(
      new FakeProvider('a', false, true, [{ ref: 'a1', title: 'Titre A' }]),
    );
    const page = await registry.searchPage('requete', new Map(), {});
    expect(page.items).toHaveLength(0);
  });

  it('les erreurs fournisseurs sont affichées, jamais masquées', async () => {
    const registry = new ProviderRegistry();
    registry.registerSearch(
      new FakeProvider('a', true, true, [], 'API_DOWN'),
    );
    const page = await registry.searchPage('requete', new Map(), {});
    expect(page.items).toHaveLength(0);
    expect(page.errors).toHaveLength(1);
    expect(page.errors[0]!.error).toBe('API_DOWN');
  });

  it('filtre « téléchargeables uniquement »', async () => {
    const registry = new ProviderRegistry();
    registry.registerSearch(
      new FakeProvider('a', true, true, [{ ref: 'a1', title: 'DL' }]),
    );
    registry.registerSearch(
      new FakeProvider('b', true, false, [{ ref: 'b1', title: 'NonDL' }]),
    );
    const page = await registry.searchPage('requete', new Map(), {
      downloadableOnly: true,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.providerId).toBe('a');
  });

  it('seuls les fournisseurs autorisés ET configurés téléchargent', async () => {
    const registry = new ProviderRegistry();
    registry.registerSearch(
      new FakeProvider('a', true, true, []),
    );
    registry.registerDownload(
      new FakeProvider('a', true, true, []),
    );
    registry.registerSearch(
      new FakeProvider('b', true, false, []),
    );
    registry.registerDownload(
      new FakeProvider('b', true, false, []),
    );
    expect(registry.authorizedDownloadProviders()).toHaveLength(1);
    expect(registry.authorizedDownloadProviders()[0]!.id).toBe('a');
  });
});
