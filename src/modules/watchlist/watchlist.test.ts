import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedWatchlistStore } from './watchlist';

describe('PersistedWatchlistStore', () => {
  it('ajout et suppression', () => {
    const store = new PersistedWatchlistStore(new MemoryStorage());
    store.add({
      ref: 'vid-1',
      providerId: 'youtube',
      title: 'Spider',
      artist: 'Gims',
      sourceUrl: 'https://youtube.com/watch?v=vid-1',
    });
    expect(store.list()).toHaveLength(1);
    expect(store.remove('vid-1')).toBe(true);
    expect(store.list()).toHaveLength(0);
  });

  it('pas de doublon', () => {
    const store = new PersistedWatchlistStore(new MemoryStorage());
    store.add({
      ref: 'vid-1',
      providerId: 'youtube',
      title: 'Spider',
      artist: 'Gims',
      sourceUrl: 'https://youtube.com/watch?v=vid-1',
    });
    store.add({
      ref: 'vid-1',
      providerId: 'youtube',
      title: 'Spider',
      artist: 'Gims',
      sourceUrl: 'https://youtube.com/watch?v=vid-1',
    });
    expect(store.list()).toHaveLength(1);
  });

  it('persiste après redémarrage', () => {
    const backend = new MemoryStorage();
    const premier = new PersistedWatchlistStore(backend);
    premier.add({
      ref: 'vid-1',
      providerId: 'youtube',
      title: 'Spider',
      artist: 'Gims',
      sourceUrl: 'https://youtube.com/watch?v=vid-1',
    });
    const apresRedemarrage = new PersistedWatchlistStore(backend);
    expect(apresRedemarrage.list()).toHaveLength(1);
  });

  it('actualisation réelle de la disponibilité', async () => {
    const store = new PersistedWatchlistStore(new MemoryStorage());
    store.add({
      ref: 'vid-1',
      providerId: 'youtube',
      title: 'Spider',
      artist: 'Gims',
      sourceUrl: 'https://youtube.com/watch?v=vid-1',
    });
    const updated = await store.refreshAvailability(
      async () => new Map([['vid-1', 'deleted']]),
    );
    expect(updated).toBe(1);
    expect(store.list()[0]!.availability).toBe('deleted');
  });
});
