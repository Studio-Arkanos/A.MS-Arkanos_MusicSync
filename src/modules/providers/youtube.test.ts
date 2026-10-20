import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouTubeSearchProvider } from './youtube';

afterEach(() => {
  vi.unstubAllGlobals();
});

const API_KEY = 'yt-test-key';
const provider = new YouTubeSearchProvider(() => API_KEY);

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('YouTubeSearchProvider — découverte uniquement', () => {
  it('recherche valide : vidéos listées avec source', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: { videoId: 'vid-1' },
              snippet: {
                title: 'GIMS - Spider (Official Music Video)',
                channelTitle: 'GIMS',
                thumbnails: { default: { url: 'https://i.ytimg.com/v.jpg' } },
              },
            },
          ],
          nextPageToken: 'CAUQAA',
          pageInfo: { totalResults: 1 },
        }),
      ),
    );
    const page = await provider.search('gims spider');
    expect(page.items).toHaveLength(1);
    const item = page.items[0]!;
    expect(item.ref).toBe('vid-1');
    expect(item.title).toContain('Spider');
    expect(item.artist).toBe('GIMS');
    expect(item.sourceUrl).toBe('https://www.youtube.com/watch?v=vid-1');
    expect(page.nextToken).toBe('CAUQAA');
  });

  it('téléchargement JAMAIS proposé (conditions YouTube)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            { id: { videoId: 'vid-1' }, snippet: { title: 'T', channelTitle: 'A' } },
          ],
        }),
      ),
    );
    const page = await provider.search('q');
    expect(page.items[0]!.downloadable).toBe(false);
    expect(page.items[0]!.downloadUrl).toBeUndefined();
  });

  it('capacités déclarées honnêtement : download = false', () => {
    expect(provider.capabilities.download).toBe(false);
    expect(provider.capabilities.search).toBe(true);
  });

  it('disponibilité vérifiée via videos.list (privée/supprimée)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            { id: 'vid-ok', status: { privacyStatus: 'public' } },
            { id: 'vid-priv', status: { privacyStatus: 'private' } },
          ],
        }),
      ),
    );
    const statuses = await provider.checkAvailability([
      'vid-ok',
      'vid-priv',
      'vid-gone',
    ]);
    expect(statuses.get('vid-ok')).toBe('available');
    expect(statuses.get('vid-priv')).toBe('private');
    // Absent de la réponse = supprimé.
    expect(statuses.get('vid-gone')).toBe('deleted');
  });

  it('clé absente : not_configured honnête', async () => {
    const unconfigured = new YouTubeSearchProvider(() => '');
    const page = await unconfigured.search('q');
    expect(page.error).toContain('YOUTUBE_NOT_CONFIGURED');
  });
});
