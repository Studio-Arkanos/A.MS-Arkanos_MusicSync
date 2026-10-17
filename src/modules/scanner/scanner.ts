import type { Track } from '../../domain/models';

/**
 * Scan de la bibliothèque locale (médias stockés sur l'appareil).
 *
 * Module PRÉPARÉ à l'étape 1 : l'implémentation native (MediaStore via
 * le plugin Capacitor AmsNative) sera branchée à l'étape 2.
 * Ce stub renvoie un résultat HONNÊTE : jamais de fausses données.
 */

export interface ScanOptions {
  folders?: string[];
}

export interface ScanResult {
  status: 'ok' | 'not_operational';
  reason?: string;
  tracks: Track[];
  durationMs: number;
}

export interface LocalLibraryScanner {
  readonly operational: boolean;
  scan(options?: ScanOptions): Promise<ScanResult>;
}

export class LocalScannerStub implements LocalLibraryScanner {
  readonly operational = false;

  async scan(_options?: ScanOptions): Promise<ScanResult> {
    return {
      status: 'not_operational',
      reason:
        'SCAN_NOT_IMPLEMENTED : le scan natif (MediaStore) sera branché à l’étape 2 via le plugin AmsNative.',
      tracks: [],
      durationMs: 0,
    };
  }
}
