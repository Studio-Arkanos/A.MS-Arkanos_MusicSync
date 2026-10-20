import type { SyncProgress, SyncReport } from '../../domain/models';

export type { SyncProgress, SyncReport };

/**
 * Moteur de synchronisation (bibliothèque locale ↔ catalogue distant).
 *
 * Module PRÉPARÉ à l'étape 1 : orchestration réelle à l'étape 2
 * (scan → normalisation → déduplication → décisions → téléchargements).
 * Ce stub est HONNÊTE : il refuse de synchroniser tant qu'il n'est pas prêt.
 */

export class SyncEngineError extends Error {
  constructor(
    public readonly code:
      | 'NOT_CONFIGURED'
      | 'NOT_IMPLEMENTED'
      | 'NOT_NATIVE',
    message: string,
  ) {
    super(message);
    this.name = 'SyncEngineError';
  }
}

export interface SyncEngine {
  /** Faux tant qu'aucun fournisseur n'est configuré (étape 2). */
  readonly ready: boolean;
  readonly status: 'idle' | 'running' | 'error';
  sync(): Promise<SyncReport>;
  subscribe(listener: (progress: SyncProgress) => void): () => void;
}

export class SyncEngineStub implements SyncEngine {
  readonly ready = false;
  readonly status = 'idle' as const;

  subscribe(_listener: (progress: SyncProgress) => void): () => void {
    // Aucune progression réelle à diffuser à l'étape 1.
    return () => {};
  }

  async sync(): Promise<SyncReport> {
    throw new SyncEngineError(
      'NOT_CONFIGURED',
      'SYNC_NOT_CONFIGURED : le moteur sera opérationnel à l’étape 2 (fournisseurs + Room).',
    );
  }
}
