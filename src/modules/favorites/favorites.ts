import type { KeyValueStorage } from '../../app/storage';

/**
 * Favoris de l'utilisateur (étape pré-4).
 *
 * Identité stable d'un favori :
 *  - morceau distant : `source:ref` (jamendo:12345) ;
 *  - morceau local/téléchargé : l'URI du fichier.
 *
 * Le favori garde le titre/artiste/vignette pour
 * l'affichage hors ligne, et l'URI locale quand le
 * fichier est présent (lecture possible).
 */

const STORAGE_KEY = 'ams.favorites.v1';

export interface FavoriteEntry {
  /** Identité stable (source:ref ou URI locale). */
  id: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  /** Origine : bibliothèque, téléchargement, fournisseur. */
  source: 'local' | 'downloaded' | 'jamendo' | 'youtube';
  /** URI locale jouable (bibliothèque ou téléchargement). */
  uri?: string;
  addedAt: string;
}

export type FavoriteInput = Omit<FavoriteEntry, 'addedAt'>;

export interface FavoriteStore {
  isFavorite(id: string): boolean;
  /** Ajoute ou retire ; vrai si le favori est présent après l'opération. */
  toggle(entry: FavoriteInput): boolean;
  add(entry: FavoriteInput): void;
  remove(id: string): boolean;
  list(): FavoriteEntry[];
}

export class PersistedFavoriteStore implements FavoriteStore {
  private entries: FavoriteEntry[] = [];

  constructor(private readonly storage: KeyValueStorage) {
    this.load();
  }

  isFavorite(id: string): boolean {
    return this.entries.some((entry) => entry.id === id);
  }

  toggle(entry: FavoriteInput): boolean {
    const exists = this.entries.some((e) => e.id === entry.id);
    if (exists) {
      this.remove(entry.id);
      return false;
    }
    this.add(entry);
    return true;
  }

  add(entry: FavoriteInput): void {
    this.entries = [
      { ...entry, addedAt: new Date().toISOString() },
      ...this.entries.filter((e) => e.id !== entry.id),
    ];
    this.save();
  }

  remove(id: string): boolean {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length === before) return false;
    this.save();
    return true;
  }

  list(): FavoriteEntry[] {
    return [...this.entries];
  }

  private load(): void {
    const raw = this.storage.get(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FavoriteEntry[];
      this.entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(this.entries));
  }
}

/** Clé de favori stable et unique. */
export function favoriteId(source: string, ref: string): string {
  return `${source}:${ref}`;
}

/** Favori jouable depuis un morceau de bibliothèque. */
export function favoriteFromLocal(track: {
  id: string;
  title: string;
  artist: string;
}): FavoriteInput {
  return { id: track.id, title: track.title, artist: track.artist, source: 'local', uri: track.id };
}

/** Favori jouable depuis un téléchargement terminé. */
export function favoriteFromDownload(task: {
  title: string;
  artist: string;
  localUri?: string;
}): FavoriteInput | null {
  if (!task.localUri) return null;
  return {
    id: task.localUri,
    title: task.title,
    artist: task.artist,
    source: 'downloaded',
    uri: task.localUri,
  };
}
