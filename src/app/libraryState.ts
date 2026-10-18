import type { KeyValueStorage } from './storage';
import type { MatchCandidate } from '../modules/duplicates/matcher';

/**
 * État de la dernière analyse de bibliothèque locale,
 * persisté pour survivre à un redémarrage.
 */

export interface LibraryState {
  folder: string;
  scannedAt?: string;
  count: number;
  errors: string[];
  tracks: MatchCandidate[];
}

const KEY = 'ams.library.v1';

export function loadLibraryState(storage: KeyValueStorage): LibraryState | null {
  try {
    const raw = storage.get(KEY);
    return raw ? (JSON.parse(raw) as LibraryState) : null;
  } catch {
    return null;
  }
}

export function saveLibraryState(storage: KeyValueStorage, state: LibraryState): void {
  storage.set(KEY, JSON.stringify(state));
}
