import type { KeyValueStorage } from '../../app/storage';

/**
 * Liste de suivi (« watched playlist ») : morceaux
 * découverts (YouTube) que l'utilisateur souhaite
 * surveiller — disponibilité vérifiée via l'API
 * officielle, jamais de téléchargement.
 */

export interface WatchlistEntry {
  ref: string;
  providerId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  sourceUrl: string;
  addedAt: string;
  availability: 'unchecked' | 'available' | 'private' | 'deleted' | 'unavailable';
}

export interface WatchlistStore {
  add(entry: Omit<WatchlistEntry, 'addedAt' | 'availability'>): WatchlistEntry;
  remove(ref: string): boolean;
  list(): WatchlistEntry[];
  /** Vérification réelle de disponibilité via le fournisseur. */
  refreshAvailability(checker: (refs: string[]) => Promise<Map<string, 'available' | 'private' | 'deleted' | 'unavailable'>>): Promise<number>;
}

const STORAGE_KEY = 'ams.watchlist.v1';

export class PersistedWatchlistStore implements WatchlistStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  private load(): WatchlistEntry[] {
    try {
      const raw = this.storage.get(this.key);
      return raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
    } catch {
      return [];
    }
  }

  private save(entries: WatchlistEntry[]): void {
    this.storage.set(this.key, JSON.stringify(entries));
  }

  add(entry: Omit<WatchlistEntry, 'addedAt' | 'availability'>): WatchlistEntry {
    const entries = this.load();
    const existing = entries.find(
      (e) => e.providerId === entry.providerId && e.ref === entry.ref,
    );
    if (existing) return existing;
    const record: WatchlistEntry = {
      ...entry,
      addedAt: new Date().toISOString(),
      availability: 'unchecked',
    };
    entries.unshift(record);
    this.save(entries);
    return record;
  }

  remove(ref: string): boolean {
    const before = this.load();
    const after = before.filter(
      (entry) => !(entry.providerId === 'youtube' && entry.ref === ref),
    );
    const removed = before.length - after.length;
    if (removed > 0) this.save(after);
    return removed > 0;
  }

  list(): WatchlistEntry[] {
    return this.load();
  }

  async refreshAvailability(
    checker: (refs: string[]) => Promise<Map<string, WatchlistEntry['availability']>>,
  ): Promise<number> {
    const entries = this.load();
    const refs = [...new Set(entries.map((e) => e.ref))];
    if (refs.length === 0) return 0;
    const statuses = await checker(refs);
    let updated = 0;
    for (const entry of entries) {
      const status = statuses.get(entry.ref);
      if (status && status !== entry.availability) {
        entry.availability = status;
        updated++;
      }
    }
    this.save(entries);
    return updated;
  }
}
