import type { KeyValueStorage } from '../../app/storage';

/**
 * Playlists de l'utilisateur (étape pré-4).
 *
 * Une playlist rassemble des morceaux jouables
 * (bibliothèque locale + téléchargements), par
 * identifiant stable (URI locale). Persistée en
 * local — aucun compte, aucun cloud.
 */

const STORAGE_KEY = 'ams.userplaylists.v1';

export interface UserPlaylist {
  id: string;
  name: string;
  createdAt: string;
  trackIds: string[];
}

export interface UserPlaylistStore {
  create(name: string): UserPlaylist;
  rename(id: string, name: string): boolean;
  remove(id: string): boolean;
  list(): UserPlaylist[];
  get(id: string): UserPlaylist | null;
  addTrack(playlistId: string, trackId: string): boolean;
  removeTrack(playlistId: string, trackId: string): boolean;
}

export class PersistedUserPlaylistStore implements UserPlaylistStore {
  private playlists: UserPlaylist[] = [];

  constructor(private readonly storage: KeyValueStorage) {
    this.load();
  }

  create(name: string): UserPlaylist {
    const playlist: UserPlaylist = {
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      trackIds: [],
    };
    this.playlists = [...this.playlists, playlist];
    this.save();
    return playlist;
  }

  rename(id: string, name: string): boolean {
    const playlist = this.playlists.find((p) => p.id === id);
    if (!playlist) return false;
    playlist.name = name.trim();
    this.save();
    return true;
  }

  remove(id: string): boolean {
    const before = this.playlists.length;
    this.playlists = this.playlists.filter((p) => p.id !== id);
    if (this.playlists.length === before) return false;
    this.save();
    return true;
  }

  list(): UserPlaylist[] {
    return [...this.playlists];
  }

  get(id: string): UserPlaylist | null {
    return this.playlists.find((p) => p.id === id) ?? null;
  }

  addTrack(playlistId: string, trackId: string): boolean {
    const playlist = this.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;
    if (playlist.trackIds.includes(trackId)) return false;
    playlist.trackIds = [...playlist.trackIds, trackId];
    this.save();
    return true;
  }

  removeTrack(playlistId: string, trackId: string): boolean {
    const playlist = this.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;
    const before = playlist.trackIds.length;
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
    if (playlist.trackIds.length === before) return false;
    this.save();
    return true;
  }

  private load(): void {
    const raw = this.storage.get(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as UserPlaylist[];
      this.playlists = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.playlists = [];
    }
  }

  private save(): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(this.playlists));
  }
}
