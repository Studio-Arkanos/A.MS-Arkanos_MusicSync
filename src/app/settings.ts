import type { KeyValueStorage } from './storage';

/**
 * Paramètres utilisateur persistés (clé YouTube, dossier local…).
 * La persistance réelle côté Android passera par Room à l'étape 3.
 */

export interface Settings {
  youtubeApiKey: string;
  jamendoClientId: string;
  libraryFolder: string;
  downloadFolderUri: string;
}

const KEY = 'ams.settings.v1';

export function loadSettings(storage: KeyValueStorage): Settings {
  try {
    const raw = storage.get(KEY);
    if (raw) {
      return {
        youtubeApiKey: '',
        jamendoClientId: '',
        libraryFolder: '',
        downloadFolderUri: '',
        ...(JSON.parse(raw) as Partial<Settings>),
      };
    }
  } catch {
    // corrompu → valeurs par défaut
  }
  return {
    youtubeApiKey: '',
    jamendoClientId: '',
    libraryFolder: '',
    downloadFolderUri: '',
  };
}

export function saveSettings(storage: KeyValueStorage, settings: Settings): void {
  storage.set(KEY, JSON.stringify(settings));
}
