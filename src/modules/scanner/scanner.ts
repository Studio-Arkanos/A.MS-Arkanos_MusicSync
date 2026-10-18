import { parseTrackName, AUDIO_EXTENSIONS } from '../normalization/normalization';
import type { Track } from '../../domain/models';

/**
 * Scan de la bibliothèque locale (fichiers audio stockés sur l'appareil).
 *
 * Étape 2 : le moteur web est réel. Il reçoit la liste des fichiers
 * du plugin natif AmsNative (Storage Access Framework sur Android 11+,
 * parcours direct sur les versions antérieures) et reconnaît les
 * morceaux **par leur nom de fichier** — aucune métadonnée n'est
 * requise (beaucoup de musique locale n'a que le nom de fichier).
 */

export interface ScannedFile {
  name: string;
  uri: string;
  sizeBytes: number;
  mimeType?: string;
}

export type LocalScanStatus = 'ok' | 'error' | 'not_operational';

export interface LocalScanResult {
  status: LocalScanStatus;
  folder: string;
  /** Date réelle du scan (ISO). */
  scannedAt?: string;
  files: ScannedFile[];
  tracks: Track[];
  errors: string[];
}

/** Fournisseur de fichiers : injecté (natif en app, simulé en test). */
export type FileLister = (folderUri: string) => Promise<ScannedFile[]>;

function isAudioFile(file: ScannedFile): boolean {
  const lower = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Fichier → morceau, à partir du seul nom de fichier. */
export function fileToTrack(file: ScannedFile): Track {
  const parsed = parseTrackName(file.name);
  return {
    id: file.uri,
    title: parsed.title || file.name,
    artist: parsed.artist || 'Artiste inconnu',
    durationMs: undefined, // aucune métadonnée supposée
    source: 'local',
    localPath: file.uri,
    fingerprint: `${parsed.artist}||${parsed.title}`,
  };
}

export class LocalLibraryScanner {
  constructor(
    private readonly lister: FileLister,
    private readonly isNative: boolean,
  ) {}

  async scan(folderUri: string): Promise<LocalScanResult> {
    if (!this.isNative) {
      return {
        status: 'not_operational',
        folder: folderUri,
        files: [],
        tracks: [],
        errors: [
          'SCAN_NOT_NATIVE : le scan de fichiers n’est disponible que dans l’application Android (SAF).',
        ],
      };
    }

    let files: ScannedFile[];
    try {
      files = await this.lister(folderUri);
    } catch (error) {
      return {
        status: 'error',
        folder: folderUri,
        files: [],
        tracks: [],
        errors: [
          `SCAN_ERROR : dossier inaccessible — ${(error as Error).message}`,
        ],
      };
    }

    const tracks = files.filter(isAudioFile).map(fileToTrack);
    return {
      status: 'ok',
      folder: folderUri,
      scannedAt: new Date().toISOString(),
      files,
      tracks,
      errors: [],
    };
  }
}
