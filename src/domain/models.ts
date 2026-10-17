/**
 * Types métier centraux d'A.MS (Arkanos Music Sync).
 * Partagés entre l'interface, le moteur de synchronisation et la couche native.
 */

export type TrackSource = 'local' | 'remote';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  source: TrackSource;
  /** Chemin local lorsque le morceau provient du appareil. */
  localPath?: string;
  /** Empreinte normalisée (voir modules/normalization). */
  fingerprint: string;
}

export type SyncDecisionStatus = 'pending' | 'download' | 'keep' | 'exclude';

export interface SyncDecision {
  track: Track;
  status: SyncDecisionStatus;
  reason?: string;
}

export type ExclusionRuleType = 'title' | 'artist' | 'folder' | 'pattern';

export interface ExclusionRule {
  id: string;
  type: ExclusionRuleType;
  value: string;
  enabled: boolean;
}

export type SyncPhase = 'idle' | 'scanning' | 'analyzing' | 'downloading' | 'done' | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  percent: number;
  message: string;
}

export interface SyncReport {
  startedAt: string;
  finishedAt: string;
  analyzed: number;
  alreadyPresent: number;
  toDownload: number;
  excluded: number;
  pendingDecisions: number;
  downloaded: number;
  errors: string[];
}

export interface SearchResult {
  providerId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
}

export type SearchProviderId = string;
export type DownloadProviderId = string;

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'failed';

export interface DownloadItem {
  id: string;
  track: Track;
  status: DownloadStatus;
  progressPercent: number;
}

export type OperationType =
  | 'app_start'
  | 'sync_attempt'
  | 'sync_success'
  | 'sync_error'
  | 'scan_attempt'
  | 'config_change';

export interface OperationRecord {
  id: string;
  /** Date ISO. */
  at: string;
  type: OperationType;
  label: string;
  detail?: string;
}

/** Statut de maturité d'un module, affiché honnêtement dans l'UI. */
export type ModuleStatus = 'operational' | 'stub' | 'planned';
