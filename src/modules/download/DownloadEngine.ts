import AmsNative from '../../plugins/amsNative';
import type { KeyValueStorage } from '../../app/storage';

/**
 * Moteur de téléchargement (étape 3).
 *
 * Moteur RÉEL, natif : Android DownloadManager (méthode
 * système robuste — reprise sur interruption réseau,
 * notifications, écriture sécurisée dans le dossier SAF
 * choisi ou le dossier Téléchargements).
 *
 * Garanties :
 *  - file d'attente avec état réel par tâche ;
 *  - progression réelle (octets/total) ;
 *  - annulation ;
 *  - reprise gérée par DownloadManager (nouvelles
 *    tentatives automatiques sur interruption) ;
 *  - fichiers temporaires gérés par le système ;
 *  - vérification du résultat (statut + type MIME +
 *    taille non nulle) ;
 *  - prévention de l'écrasement (suffixe automatique
 *    + garde native) ;
 *  - jamais de simulation : sur navigateur de dev,
 *    le moteur signale son indisponibilité.
 */

export type DownloadTaskStatus =
  | 'queued'
  | 'downloading'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface DownloadTask {
  id: string;
  /** Identifiant natif (DownloadManager). */
  nativeId?: number;
  providerId: string;
  trackRef: string;
  title: string;
  artist: string;
  /** Page source (ouverture). */
  sourceUrl: string;
  /** URL de fichier autorisée. */
  fileUrl: string;
  displayName: string;
  license?: string;
  folderUri?: string;
  status: DownloadTaskStatus;
  progressPercent: number;
  bytesReceived: number;
  totalBytes: number;
  localUri?: string;
  error?: string;
  queuedAt: string;
  finishedAt?: string;
}

export interface NewDownloadTask {
  providerId: string;
  trackRef: string;
  title: string;
  artist: string;
  sourceUrl: string;
  fileUrl: string;
  displayName: string;
  license?: string;
}

type Listener = () => void;

const STORAGE_KEY = 'ams.downloads.v1';

/** Tentatives maximales de décollision de nom de fichier. */
const MAX_NAME_COLLISIONS = 100;

function nextTaskId(): string {
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nom de fichier sans risque de collision. */
export function suffixedName(base: string, index: number): string {
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return `${base} (${index})`;
  return `${base.slice(0, dot)} (${index})${base.slice(dot)}`;
}

/**
 * Vérification du résultat reçu : type contenu audio
 * et taille non nulle. Un résultat invalide n'est
 * jamais présenté comme un succès.
 */
export function verifyDownloadResult(input: {
  mediaType: string;
  bytesReceived: number;
  displayName: string;
}): { valid: boolean; reason?: string } {
  const audioByType = input.mediaType.startsWith('audio/');
  const audioByExtension = /\.(mp3|m4a|aac|flac|ogg|wav)$/i.test(
    input.displayName,
  );
  if (input.bytesReceived <= 0) {
    return { valid: false, reason: 'DOWNLOAD_EMPTY_FILE' };
  }
  if (!audioByType && !audioByExtension) {
    return { valid: false, reason: 'DOWNLOAD_CONTENT_INVALID' };
  }
  return { valid: true };
}

/** Pont natif (injectable pour les tests). */
export interface DownloadBridge {
  enqueueDownload(options: {
    url: string;
    title: string;
    artist: string;
    displayName: string;
    folderUri?: string;
  }): Promise<{ nativeId: number }>;
  getDownloadStatus(options: {
    nativeId: number;
  }): Promise<{
    status: string;
    progressPercent: number;
    bytesReceived: number;
    totalBytes: number;
    localUri: string;
    mediaType: string;
    reason: string;
  }>;
  cancelDownload(options: { nativeId: number }): Promise<{ cancelled: boolean }>;
  fileExists(options: { folderUri: string; name: string }): Promise<{ exists: boolean }>;
}

export class NativeDownloadEngine {
  private tasks: DownloadTask[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly isNative: boolean,
    private readonly bridge: DownloadBridge = AmsNative,
  ) {
    this.load();
  }

  readonly operational = true; // moteur réel ; disponibilité vérifiée au runtime

  /** Vritable disponibilité (application Android uniquement). */
  get available(): boolean {
    return this.isNative;
  }

  list(): DownloadTask[] {
    return [...this.tasks];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private load(): void {
    try {
      const raw = this.storage.get(STORAGE_KEY);
      this.tasks = raw ? (JSON.parse(raw) as DownloadTask[]) : [];
    } catch {
      this.tasks = [];
    }
    if (this.isNative && this.tasks.some((t) => isActive(t))) {
      this.startPolling();
    }
  }

  private save(): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(this.tasks));
  }

  /**
   * Vérifie la cible et évite tout écrasement.
   * Bornée : un pont défectueux (toujours « existant »)
   * ne peut pas produire de boucle infinie — après
   * MAX_NAME_COLLISIONS essais, un suffixe temporel
   * garantit l'unicité.
   */
  private async uniqueDisplayName(
    folderUri: string | undefined,
    displayName: string,
  ): Promise<string> {
    if (!folderUri) return displayName;
    let candidate = displayName;
    for (let index = 1; index <= MAX_NAME_COLLISIONS; index++) {
      const { exists } = await this.bridge.fileExists({
        folderUri,
        name: candidate,
      });
      if (!exists) return candidate;
      candidate = suffixedName(displayName, index + 1);
    }
    return `${displayName}.${Date.now()}`;
  }

  async enqueue(
    task: NewDownloadTask,
    folderUri?: string,
  ): Promise<DownloadTask> {
    if (!this.isNative) {
      throw new Error(
        'DOWNLOAD_NOT_NATIVE : le moteur de téléchargement requiert l’application Android.',
      );
    }

    const displayName = await this.uniqueDisplayName(
      folderUri,
      task.displayName,
    );

    const { nativeId } = await this.bridge.enqueueDownload({
      url: task.fileUrl,
      title: task.title,
      artist: task.artist,
      displayName,
      folderUri,
    });

    const record: DownloadTask = {
      id: nextTaskId(),
      nativeId,
      providerId: task.providerId,
      trackRef: task.trackRef,
      title: task.title,
      artist: task.artist,
      sourceUrl: task.sourceUrl,
      fileUrl: task.fileUrl,
      displayName,
      license: task.license,
      folderUri,
      status: 'queued',
      progressPercent: 0,
      bytesReceived: 0,
      totalBytes: 0,
      queuedAt: new Date().toISOString(),
    };
    this.tasks.unshift(record);
    this.save();
    this.startPolling();
    this.emit();
    return record;
  }

  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.nativeId === undefined) return false;
    if (task.status === 'done' || task.status === 'cancelled') {
      return false;
    }
    const { cancelled } = await this.bridge.cancelDownload({
      nativeId: task.nativeId,
    });
    if (cancelled) {
      task.status = 'cancelled';
      task.finishedAt = new Date().toISOString();
      this.save();
      this.emit();
    }
    return cancelled;
  }

  /** Arrête le polling (fin de vie / tests). */
  dispose(): void {
    this.stopPolling();
    this.listeners.clear();
  }

  /** Interrogation des états réels auprès du système. */
  async refresh(): Promise<void> {
    if (!this.isNative) return;
    let changed = false;

    for (const task of this.tasks) {
      if (!isActive(task) || task.nativeId === undefined) continue;
      try {
        const status = await this.bridge.getDownloadStatus({
          nativeId: task.nativeId,
        });
        const previous = task.status;
        task.status = mapNativeStatus(status.status);
        task.progressPercent = status.progressPercent;
        task.bytesReceived = status.bytesReceived;
        task.totalBytes = status.totalBytes;

        if (task.status === 'done') {
          // Vérification du résultat : type contenu + taille.
          const verification = verifyDownloadResult({
            mediaType: status.mediaType,
            bytesReceived: status.bytesReceived,
            displayName: task.displayName,
          });
          if (!verification.valid) {
            task.status = 'failed';
            task.error =
              verification.reason ?? 'DOWNLOAD_CONTENT_INVALID';
          } else {
            task.localUri = status.localUri || undefined;
          }
        }
        if (task.status === 'failed' && !task.error) {
          task.error = status.reason || 'DOWNLOAD_FAILED';
        }
        if (task.status !== previous && !isActive(task)) {
          task.finishedAt = new Date().toISOString();
        }
        if (task.status !== previous) changed = true;
      } catch {
        // Tâche inconnue du système : marquée en échec.
        if (isActive(task)) {
          task.status = 'failed';
          task.error = 'DOWNLOAD_LOST : tâche introuvable dans le système.';
          task.finishedAt = new Date().toISOString();
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
      this.emit();
    }
    if (!this.tasks.some((t) => isActive(t))) {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.timer || !this.isNative) return;
    this.timer = setInterval(() => {
      this.refresh().catch(() => {});
    }, 1000);
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

function isActive(task: DownloadTask): boolean {
  return task.status === 'queued' || task.status === 'downloading';
}

function mapNativeStatus(status: string): DownloadTaskStatus {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'queued';
    case 'downloading':
    case 'running':
    case 'paused':
      return 'downloading';
    case 'done':
    case 'successful':
      return 'done';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
    default:
      return 'failed';
  }
}
