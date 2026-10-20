import type { KeyValueStorage } from './storage';
import type { PlaylistConfig, PlaylistAnalysis } from '../modules/playlist/playlist';

/**
 * État de la playlist (configuration + dernière analyse),
 * persisté : survit à un redémarrage et à une nouvelle analyse.
 */

const CONFIG_KEY = 'ams.playlist.config.v1';
const ANALYSIS_KEY = 'ams.playlist.analysis.v1';

export function loadPlaylistConfig(
  storage: KeyValueStorage,
  fallback: PlaylistConfig,
): PlaylistConfig {
  try {
    const raw = storage.get(CONFIG_KEY);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<PlaylistConfig>) };
  } catch {
    // corrompu → défaut
  }
  return fallback;
}

export function savePlaylistConfig(storage: KeyValueStorage, config: PlaylistConfig): void {
  storage.set(CONFIG_KEY, JSON.stringify(config));
}

export function loadPlaylistAnalysis(storage: KeyValueStorage): PlaylistAnalysis | null {
  try {
    const raw = storage.get(ANALYSIS_KEY);
    return raw ? (JSON.parse(raw) as PlaylistAnalysis) : null;
  } catch {
    return null;
  }
}

export function savePlaylistAnalysis(storage: KeyValueStorage, analysis: PlaylistAnalysis): void {
  storage.set(ANALYSIS_KEY, JSON.stringify(analysis));
}
