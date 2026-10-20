import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PLAYLIST,
  extractPlaylistId,
  parseIsoDuration,
  YouTubePlaylistProvider,
} from './playlist';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** fetch simulé renvoyant une réponse JSON. */
function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe('extractPlaylistId', () => {
  it('extrait l’identifiant d’une URL YouTube', () => {
    expect(
      extractPlaylistId(
        'https://youtube.com/playlist?list=PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub',
      ),
    ).toBe('PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub');
  });

  it('URL invalide → null', () => {
    expect(extractPlaylistId('https://youtube.com/playlist')).toBeNull();
  });
});

describe('parseIsoDuration', () => {
  it('convertit PT#M#S en millisecondes', () => {
    expect(parseIsoDuration('PT3M42S')).toBe(222_000);
    expect(parseIsoDuration('PT1H2M3S')).toBe(3_723_000);
    expect(parseIsoDuration('inconnu')).toBeUndefined();
  });
});

describe('YouTubePlaylistProvider', () => {
  const provider = new YouTubePlaylistProvider();

  it('playlist vide ≠ erreur : statut « empty » distinct', async () => {
    mockFetch({ items: [] });
    const analysis = await provider.analyze(DEFAULT_PLAYLIST, 'cle-test');
    expect(analysis.status).toBe('empty');
    expect(analysis.tracks).toEqual([]);
    expect(analysis.errors).toEqual([]);
  });

  it('playlist indisponible (404) → statut « unavailable », pas « empty »', async () => {
    mockFetch({ error: { message: 'Playlist not found' } }, 404);
    const analysis = await provider.analyze(DEFAULT_PLAYLIST, 'cle-test');
    expect(analysis.status).toBe('unavailable');
    expect(analysis.tracks).toEqual([]);
    expect(analysis.errors.length).toBeGreaterThan(0);
  });

  it('clé API absente → « not_configured », jamais de données fabriquées', async () => {
    const analysis = await provider.analyze(DEFAULT_PLAYLIST);
    expect(analysis.status).toBe('not_configured');
    expect(analysis.tracks).toEqual([]);
    expect(analysis.errors[0]).toContain('YOUTUBE_API_KEY_MISSING');
  });

  it('URL sans identifiant → erreur explicite', async () => {
    const analysis = await provider.analyze(
      { ...DEFAULT_PLAYLIST, url: 'https://youtube.com/' },
      'cle-test',
    );
    expect(analysis.status).toBe('error');
    expect(analysis.errors[0]).toContain('PLAYLIST_URL_INVALID');
  });

  it('analyse une playlist avec vidéos disponibles, privées et supprimées', async () => {
    const playlistItems = {
      items: [
        {
          snippet: { title: 'GIMS - Spider (Official Music Video)', thumbnails: { default: { url: 'https://i.ytimg.com/t1.jpg' } } },
          contentDetails: { videoId: 'vid-1' },
        },
        {
          snippet: { title: 'GIMS - Spider (Remix)', thumbnails: {} },
          contentDetails: { videoId: 'vid-2' },
        },
        {
          snippet: { title: 'Vidéo supprimée', thumbnails: {} },
          contentDetails: { videoId: 'vid-3' },
        },
      ],
      nextPageToken: undefined,
    };
    const videoDetails = {
      items: [
        {
          id: 'vid-1',
          snippet: { title: 'GIMS - Spider (Official Music Video)', thumbnails: { default: { url: 'https://i.ytimg.com/t1.jpg' } } },
          contentDetails: { duration: 'PT3M42S' },
          status: { privacyStatus: 'public' },
        },
        {
          id: 'vid-2',
          snippet: { title: 'GIMS - Spider (Remix)', thumbnails: {} },
          contentDetails: { duration: 'PT3M50S' },
          status: { privacyStatus: 'public' },
        },
        // vid-3 absent : vidéo supprimée ou privée
      ],
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => playlistItems })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => videoDetails });
    vi.stubGlobal('fetch', fetchMock);

    const analysis = await provider.analyze(DEFAULT_PLAYLIST, 'cle-test');
    expect(analysis.status).toBe('ok');
    expect(analysis.tracks).toHaveLength(3);

    const [first, second, third] = analysis.tracks;
    expect(first!.availability).toBe('available');
    expect(first!.durationMs).toBe(222_000);
    expect(first!.thumbnailUrl).toBe('https://i.ytimg.com/t1.jpg');

    expect(second!.availability).toBe('available');

    // Vidéo supprimée/privée : identifiée comme telle, pas une erreur globale.
    expect(third!.availability).toBe('unavailable');
  });

  it('vidéo privée identifiée comme « private »', async () => {
    const playlistItems = {
      items: [
        { snippet: { title: 'Titre privé', thumbnails: {} }, contentDetails: { videoId: 'vid-p' } },
      ],
    };
    const videoDetails = {
      items: [
        {
          id: 'vid-p',
          snippet: { title: 'Titre privé', thumbnails: {} },
          contentDetails: { duration: 'PT2M0S' },
          status: { privacyStatus: 'private' },
        },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => playlistItems })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => videoDetails });
    vi.stubGlobal('fetch', fetchMock);

    const analysis = await provider.analyze(DEFAULT_PLAYLIST, 'cle-test');
    expect(analysis.status).toBe('ok');
    expect(analysis.tracks[0]!.availability).toBe('private');
  });

  it('erreur réseau → statut « error » (distinct de « empty »)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    const analysis = await provider.analyze(DEFAULT_PLAYLIST, 'cle-test');
    expect(analysis.status).toBe('error');
    expect(analysis.errors[0]).toContain('network down');
  });
});
