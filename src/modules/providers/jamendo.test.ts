import { afterEach, describe, expect, it, vi } from 'vitest';
import { JamendoProvider } from './jamendo';

afterEach(() => {
  vi.unstubAllGlobals();
});

const CLIENT_ID = 'test-client-id';
const provider = new JamendoProvider(() => CLIENT_ID);

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const TRACK = {
  id: 12345,
  name: 'Sunset Avenue',
  artist_name: 'Example Artist',
  album_name: 'Example Album',
  duration: 222,
  image: 'https://img.jamendo.com/cover.jpg',
  shareurl: 'https://www.jamendo.com/track/12345',
  audiodownload_allowed: true,
  audiodownload: 'https://api.jamendo.com/download/12345.mp3',
  licensing: [{ name: 'CC BY-NC 3.0', url: 'https://creativecommons.org/…' }],
};

describe('JamendoProvider — fournisseur de téléchargement autorisé', () => {
  it('recherche valide : résultats parsés avec droits réels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ headers: { status: 'success', results_count: 1 }, results: [TRACK] }),
      ),
    );
    const page = await provider.search('sunset avenue');
    expect(page.error).toBeUndefined();
    expect(page.items).toHaveLength(1);
    const item = page.items[0]!;
    expect(item.title).toBe('Sunset Avenue');
    expect(item.artist).toBe('Example Artist');
    expect(item.album).toBe('Example Album');
    expect(item.durationMs).toBe(222_000);
    expect(item.providerId).toBe('jamendo');
    expect(item.type).toBe('track');
    expect(item.license).toBe('CC BY-NC 3.0');
    expect(item.sourceUrl).toContain('jamendo.com/track/12345');
  });

  it('distinction RECHERCHER possible vs TÉLÉCHARGER autorisé', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          headers: { status: 'success', results_count: 1 },
          results: [
            { ...TRACK, audiodownload_allowed: false, audiodownload: '' },
          ],
        }),
      ),
    );
    const page = await provider.search('sunset avenue');
    const item = page.items[0]!;
    // Recherche possible…
    expect(item.title).toBe('Sunset Avenue');
    // …mais téléchargement NON autorisé par l'artiste.
    expect(item.downloadable).toBe(false);
    expect(item.downloadUrl).toBeUndefined();
    expect(provider.canDownload(item)).toBe(false);
  });

  it('requête de téléchargement refusée quand non autorisé', async () => {
    const notAllowed: (typeof TRACK) = {
      ...TRACK,
      audiodownload_allowed: false,
      audiodownload: '',
    };
    const item = {
      ref: '1',
      providerId: 'jamendo',
      title: 'X',
      artist: 'Y',
      type: 'track' as const,
      downloadable: false,
      sourceUrl: 'https://www.jamendo.com/track/1',
    };
    void notAllowed;
    await expect(provider.getDownloadRequest(item)).rejects.toThrow(
      'JAMENDO_DOWNLOAD_NOT_ALLOWED',
    );
  });

  it('aucun résultat : liste vide réelle (jamais fabriquée)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ headers: { status: 'success', results_count: 0 }, results: [] }),
      ),
    );
    const page = await provider.search('requete inexistante xyz');
    expect(page.items).toEqual([]);
    expect(page.error).toBeUndefined();
  });

  it('erreur réseau : signalée, jamais masquée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const page = await provider.search('anything');
    expect(page.items).toEqual([]);
    expect(page.error).toContain('offline');
  });

  it('clé absente : not_configured honnête', async () => {
    const unconfigured = new JamendoProvider(() => '');
    const page = await unconfigured.search('anything');
    expect(page.items).toEqual([]);
    expect(page.error).toContain('JAMENDO_NOT_CONFIGURED');
  });

  it('pagination : offsets croissants via jetons de continuation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        headers: { status: 'success', results_count: 100 },
        results: Array.from({ length: 20 }, (_, i) => ({
          ...TRACK,
          id: 1000 + i,
          name: `Track ${i}`,
        })),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await provider.search('q');
    expect(first.nextToken).toBe('20');

    await provider.search('q', first.nextToken);
    const secondUrl = fetchMock.mock.calls[1]![0] as string;
    expect(secondUrl).toContain('offset=20');
  });

  it('capacités déclarées réellement', () => {
    expect(provider.capabilities).toEqual({
      search: true,
      metadata: true,
      download: true,
      playlist: false,
      local: false,
    });
    expect(provider.isConfigured()).toBe(true);
  });
});
