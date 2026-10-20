import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import {
  favoriteFromDownload,
  favoriteFromLocal,
  favoriteId,
  PersistedFavoriteStore,
} from './favorites';

describe('PersistedFavoriteStore', () => {
  it('toggle ajoute puis retire un favori', () => {
    const store = new PersistedFavoriteStore(new MemoryStorage());
    const input = favoriteFromLocal({
      id: 'content://a.mp3',
      title: 'Spider',
      artist: 'Gims',
    });
    expect(store.toggle(input)).toBe(true);
    expect(store.isFavorite('content://a.mp3')).toBe(true);
    expect(store.toggle(input)).toBe(false);
    expect(store.isFavorite('content://a.mp3')).toBe(false);
    expect(store.list()).toHaveLength(0);
  });

  it('un même favori n’est jamais dupliqué', () => {
    const store = new PersistedFavoriteStore(new MemoryStorage());
    const input = favoriteFromLocal({
      id: 'content://a.mp3',
      title: 'Spider',
      artist: 'Gims',
    });
    store.add(input);
    store.add(input);
    expect(store.list()).toHaveLength(1);
  });

  it('remove signale l’absence', () => {
    const store = new PersistedFavoriteStore(new MemoryStorage());
    expect(store.remove('inconnu')).toBe(false);
  });

  it('persiste entre deux instances (redémarrage)', () => {
    const backend = new MemoryStorage();
    const premier = new PersistedFavoriteStore(backend);
    premier.add(favoriteFromLocal({
      id: 'content://a.mp3',
      title: 'Spider',
      artist: 'Gims',
    }));
    const apresRedemarrage = new PersistedFavoriteStore(backend);
    expect(apresRedemarrage.isFavorite('content://a.mp3')).toBe(true);
    expect(apresRedemarrage.list()[0]!.title).toBe('Spider');
  });

  it('identité stable distante : source:ref', () => {
    expect(favoriteId('jamendo', '12345')).toBe('jamendo:12345');
    expect(favoriteId('youtube', 'vid-1')).toBe('youtube:vid-1');
  });

  it('favori depuis un téléchargement : requiert l’URI locale', () => {
    expect(
      favoriteFromDownload({ title: 'A', artist: 'B', localUri: 'file:///a.mp3' }),
    ).toEqual({
      id: 'file:///a.mp3',
      title: 'A',
      artist: 'B',
      source: 'downloaded',
      uri: 'file:///a.mp3',
    });
    expect(favoriteFromDownload({ title: 'A', artist: 'B' })).toBeNull();
  });

  it('un favori non local reste visible mais non jouable', () => {
    const store = new PersistedFavoriteStore(new MemoryStorage());
    store.add({
      id: 'youtube:vid-1',
      title: 'Clip',
      artist: 'Artiste',
      source: 'youtube',
    });
    const favorite = store.list()[0]!;
    expect(favorite.uri).toBeUndefined();
  });

  it('ignore un stockage corrompu sans planter', () => {
    const backend = new MemoryStorage();
    backend.set('ams.favorites.v1', '{corrompu');
    const store = new PersistedFavoriteStore(backend);
    expect(store.list()).toHaveLength(0);
  });
});
