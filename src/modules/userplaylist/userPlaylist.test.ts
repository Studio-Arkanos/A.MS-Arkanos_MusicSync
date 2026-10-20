import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedUserPlaylistStore } from './userPlaylist';

describe('PersistedUserPlaylistStore', () => {
  it('crée, renomme et supprime une playlist', () => {
    const store = new PersistedUserPlaylistStore(new MemoryStorage());
    const playlist = store.create('Mes favoris');
    expect(playlist.name).toBe('Mes favoris');
    expect(playlist.trackIds).toEqual([]);

    expect(store.rename(playlist.id, 'Road trip')).toBe(true);
    expect(store.get(playlist.id)!.name).toBe('Road trip');

    expect(store.remove(playlist.id)).toBe(true);
    expect(store.get(playlist.id)).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  it('ajout et retrait de morceaux, sans doublon', () => {
    const store = new PersistedUserPlaylistStore(new MemoryStorage());
    const playlist = store.create('Mix');
    expect(store.addTrack(playlist.id, 'content://a.mp3')).toBe(true);
    expect(store.addTrack(playlist.id, 'content://a.mp3')).toBe(false);
    expect(store.addTrack(playlist.id, 'content://b.mp3')).toBe(true);
    expect(store.get(playlist.id)!.trackIds).toEqual([
      'content://a.mp3',
      'content://b.mp3',
    ]);

    expect(store.removeTrack(playlist.id, 'content://a.mp3')).toBe(true);
    expect(store.get(playlist.id)!.trackIds).toEqual(['content://b.mp3']);
    expect(store.removeTrack(playlist.id, 'inconnu')).toBe(false);
  });

  it('signale les playlists inconnues', () => {
    const store = new PersistedUserPlaylistStore(new MemoryStorage());
    expect(store.rename('nope', 'X')).toBe(false);
    expect(store.remove('nope')).toBe(false);
    expect(store.addTrack('nope', 'id')).toBe(false);
    expect(store.removeTrack('nope', 'id')).toBe(false);
  });

  it('persiste entre deux instances (redémarrage)', () => {
    const backend = new MemoryStorage();
    const premier = new PersistedUserPlaylistStore(backend);
    const playlist = premier.create('Soirée');
    premier.addTrack(playlist.id, 'content://a.mp3');

    const apresRedemarrage = new PersistedUserPlaylistStore(backend);
    const restored = apresRedemarrage.get(playlist.id);
    expect(restored).not.toBeNull();
    expect(restored!.name).toBe('Soirée');
    expect(restored!.trackIds).toEqual(['content://a.mp3']);
  });

  it('ignore un stockage corrompu sans planter', () => {
    const backend = new MemoryStorage();
    backend.set('ams.userplaylists.v1', 'pas-du-json');
    const store = new PersistedUserPlaylistStore(backend);
    expect(store.list()).toHaveLength(0);
  });
});
