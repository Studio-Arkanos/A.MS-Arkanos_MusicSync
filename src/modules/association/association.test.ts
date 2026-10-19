import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedExclusionStore } from '../exclusions/exclusions';
import { DuplicateMatcher } from '../duplicates/matcher';
import { PlaylistAssociation } from './association';
import { ProviderRegistry } from '../providers/registry';
import type { AuthorizedDownloadProvider, SearchResultItem } from '../providers/types';

/** Fournisseur autorisé de test. */
class FakeAuthorizedProvider implements AuthorizedDownloadProvider {
  readonly id = 'fake';
  readonly label = 'Fake';
  readonly capabilities = {
    search: true,
    metadata: true,
    download: true,
    playlist: false,
    local: false,
  };

  constructor(private readonly items: SearchResultItem[]) {}

  isConfigured(): boolean {
    return true;
  }

  async search() {
    return { providerId: this.id, items: this.items };
  }

  canDownload(item: SearchResultItem): boolean {
    return item.downloadable;
  }

  async getDownloadRequest(item: SearchResultItem) {
    return { url: item.downloadUrl!, displayName: `${item.title}.mp3` };
  }
}

function item(ref: string, title: string, artist: string): SearchResultItem {
  return {
    ref,
    providerId: 'fake',
    title,
    artist,
    type: 'track',
    downloadable: true,
    sourceUrl: `https://example.com/${ref}`,
    downloadUrl: `https://example.com/files/${ref}.mp3`,
  };
}

describe('PlaylistAssociation — versions téléchargeables autorisées', () => {
  it('présente les candidats avec source, triés par score', async () => {
    const fake = new FakeAuthorizedProvider([
      item('j1', 'Spider', 'Gims'),
      item('j2', 'Spider (Remix)', 'Gims'),
    ]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      new PersistedExclusionStore(new MemoryStorage()),
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      [], // bibliothèque vide
      null,
      null,
    );
    expect(candidates.length).toBe(2);
    // Version la plus proche d'abord.
    expect(candidates[0]!.item.ref).toBe('j1');
    expect(candidates[0]!.eligible).toBe(true);
    // Version différente (remix) présentée distinctement,
    // jamais fondue avec l'originale.
    expect(candidates[1]!.item.title).toContain('Remix');
  });

  it('morceau déjà présent dans la bibliothèque → jamais candidat', async () => {
    const fake = new FakeAuthorizedProvider([item('j1', 'Spider', 'Gims')]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      new PersistedExclusionStore(new MemoryStorage()),
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      [{ id: 'local-1', title: 'Spider', artist: 'Gims' }],
      null,
      null,
    );
    expect(candidates[0]!.eligible).toBe(false);
    expect(candidates[0]!.matchState).toBe('present');
  });

  it('correspondance incertaine : éligible mais à confirmer', async () => {
    const fake = new FakeAuthorizedProvider([item('j1', 'Spiders', 'Gims')]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      new PersistedExclusionStore(new MemoryStorage()),
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      // Bibliothèque contenant l'original : « Spiders » est
      // proche mais non identique → incertain.
      [{ id: 'local-1', title: 'Spider', artist: 'Gims' }],
      null,
      null,
    );
    expect(candidates[0]!.matchState).toBe('uncertain');
    expect(candidates[0]!.reason).toContain('confirmation');
  });

  it('les exclusions de la playlist (partie 2) continuent de s’appliquer', async () => {
    const exclusionStore = new PersistedExclusionStore(
      new MemoryStorage(),
    );
    // Exclusion créée dans la partie 2 (identité stable playlist+morceau).
    exclusionStore.exclude('PL-playlist', 'vid-playlist', {
      title: 'Spider',
      artist: 'Gims',
    });

    const fake = new FakeAuthorizedProvider([item('j1', 'Spider', 'Gims')]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      exclusionStore,
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      [],
      'PL-playlist',
      'vid-playlist',
    );
    expect(candidates[0]!.excluded).toBe(true);
    expect(candidates[0]!.eligible).toBe(false);
    expect(candidates[0]!.reason).toContain('exclu');
  });

  it('un candidat exclu (source recherche) n’est pas éligible', async () => {
    const exclusionStore = new PersistedExclusionStore(
      new MemoryStorage(),
    );
    exclusionStore.exclude('search', 'j1', {
      title: 'Spider',
      artist: 'Gims',
    });

    const fake = new FakeAuthorizedProvider([item('j1', 'Spider', 'Gims')]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      exclusionStore,
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      [],
      null,
      null,
    );
    expect(candidates[0]!.excluded).toBe(true);
    expect(candidates[0]!.eligible).toBe(false);
  });

  it('ne considère jamais deux titres proches comme identiques', async () => {
    const fake = new FakeAuthorizedProvider([item('j1', 'Spider Man', 'Gims')]);
    const registry = new ProviderRegistry();
    registry.registerSearch(fake);
    registry.registerDownload(fake);

    const association = new PlaylistAssociation(
      registry,
      new DuplicateMatcher(),
      new PersistedExclusionStore(new MemoryStorage()),
    );

    const candidates = await association.findDownloadableVersions(
      { title: 'Spider', artist: 'Gims' },
      [],
      null,
      null,
    );
    // « Spider Man » ≠ « Spider » : score bas → absent, mais présenté honnêtement.
    expect(candidates[0]!.matchState).toBe('absent');
  });
});
