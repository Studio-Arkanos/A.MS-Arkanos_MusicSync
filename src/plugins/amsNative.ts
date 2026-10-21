import { registerPlugin } from '@capacitor/core';

/**
 * Contrat TypeScript du plugin Capacitor natif AmsNative.
 * Implémentation Kotlin dans android/app (plugins/AmsNativePlugin.kt).
 * Sur le web (navigateur de développement), les appels échouent
 * proprement — aucune donnée n'est fabriquée.
 */

export interface ScannedFile {
  name: string;
  uri: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface DownloadStatusResult {
  status: string; // queued | downloading | done | failed | cancelled
  progressPercent: number;
  bytesReceived: number;
  totalBytes: number;
  localUri: string;
  mediaType: string;
  reason: string;
}

export interface AmsNativePlugin {
  isNativeAvailable(): Promise<{ available: boolean; platform: string }>;
  getDeviceInfo(): Promise<{
    platform: string;
    version: string;
    sdkInt: number;
  }>;

  /** État réel de la permission POST_NOTIFICATIONS (sans demander). */
  getNotificationPermissionStatus(): Promise<{ granted: boolean }>;

  /** Notification locale réelle (canal « décisions », deep-link). */
  notify(options: {
    title: string;
    message: string;
    route?: string;
    trackRef?: string;
  }): Promise<{ delivered: boolean; id?: number }>;

  /** Demande runtime POST_NOTIFICATIONS (Android 13+). */
  requestNotificationPermission(): Promise<{ granted: boolean }>;

  /** Sélecteur de dossier (Storage Access Framework). */
  pickFolder(): Promise<{ uri: string | null }>;
  /** Sélection d’un fichier local, notamment playlist M3U/PLS. */
  pickFile(): Promise<{ uri: string }>;
  readTextFile(options: { uri: string }): Promise<{ content: string }>;
  getLastFolder(): Promise<{ uri: string | null }>;

  /** Liste les fichiers audio d'un dossier (SAF / DocumentFile). */
  scanLibrary(options: {
    folderUri: string;
  }): Promise<{ files: ScannedFile[]; count: number }>;

  /** Route en attente après clic sur une notification. */
  getPendingRoute(): Promise<{ route: string; trackRef: string }>;

  /* ---------- Moteur de téléchargement (étape 3) ---------- */

  /** Enfile un téléchargement via Android DownloadManager. */
  enqueueDownload(options: {
    url: string;
    title: string;
    artist: string;
    displayName: string;
    folderUri?: string;
  }): Promise<{ nativeId: number }>;

  /** État réel d'une tâche (DownloadManager.Query). */
  getDownloadStatus(options: {
    nativeId: number;
  }): Promise<DownloadStatusResult>;

  /** Annule une tâche (retire du DownloadManager). */
  cancelDownload(options: { nativeId: number }): Promise<{ cancelled: boolean }>;

  /** Un fichier existe-t-il déjà dans le dossier cible ? */
  fileExists(options: {
    folderUri: string;
    name: string;
  }): Promise<{ exists: boolean }>;

  /** Ouvre une URL dans le navigateur/l'application source. */
  openUrl(options: { url: string }): Promise<{ opened: boolean }>;

  /** Sonde native (HEAD) : type de contenu d'une URL directe. */
  probeUrl(options: {
    url: string;
  }): Promise<{ statusCode: number; contentType: string; contentLength: number }>;

  /* ---------- Arrière-plan WorkManager (étape 4) ---------- */

  /**
   * Planifie l'analyse périodique réelle (WorkManager).
   * Aucune heure exacte n'est jamais garantie.
   */
  schedulePeriodicSync(options: {
    folderUri: string;
  }): Promise<{ scheduled: boolean; intervalHours: number; exact: boolean }>;

  /** Annule la planification. */
  cancelPeriodicSync(): Promise<{ cancelled: boolean }>;

  /** État réel de la planification. */
  isPeriodicSyncScheduled(): Promise<{ scheduled: boolean }>;
}

const AmsNative = registerPlugin<AmsNativePlugin>('AmsNative');

export default AmsNative;
