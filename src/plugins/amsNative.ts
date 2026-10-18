import { registerPlugin } from '@capacitor/core';

/**
 * Contrat TypeScript du plugin Capacitor natif AmsNative.
 * Implémentation Kotlin dans android/app (MainActivity + plugins/).
 * Sur le web (navigateur de développement), les appels échouent
 * proprement et les appelants gèrent l'indisponibilité —
 * aucune donnée n'est fabriquée.
 */

export interface ScannedFile {
  name: string;
  uri: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface AmsNativePlugin {
  /** Indique si la couche native est joignable (Android uniquement). */
  isNativeAvailable(): Promise<{ available: boolean; platform: string }>;
  /** Informations appareil minimales. */
  getDeviceInfo(): Promise<{ platform: string; version: string }>;

  /** Notification locale réelle (canal « décisions », ouvert l'écran du morceau). */
  notify(options: {
    title: string;
    message: string;
    route?: string;
    trackRef?: string;
  }): Promise<{ delivered: boolean; id?: number }>;

  /** Sélecteur de dossier (Storage Access Framework). */
  pickFolder(): Promise<{ uri: string | null }>;

  /** Dossier courant mémorisé. */
  getLastFolder(): Promise<{ uri: string | null }>;

  /** Liste les fichiers audio d'un dossier (SAF ou parcours direct). */
  scanLibrary(options: {
    folderUri: string;
  }): Promise<{ files: ScannedFile[]; count: number }>;

  /** Route en attente après ouverture depuis une notification. */
  getPendingRoute(): Promise<{ route: string; trackRef: string }>;

  /** Planification d'une synchronisation périodique (étape 3). */
  schedulePeriodicSync(options: { intervalMinutes: number }): Promise<{ scheduled: boolean }>;
}

const AmsNative = registerPlugin<AmsNativePlugin>('AmsNative');

export default AmsNative;
