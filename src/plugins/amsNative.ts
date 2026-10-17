import { registerPlugin } from '@capacitor/core';

/**
 * Contrat TypeScript du plugin Capacitor natif AmsNative.
 * L'implémentation Kotlin vit dans android/app (MainActivity + AmsNativePlugin.kt).
 * Sur le web (navigateur de développement), les appels échouent proprement
 * et les appelants gèrent l'indisponibilité — aucune donnée n'est fabriquée.
 */
export interface AmsNativePlugin {
  /** Indique si la couche native est joignable (Android uniquement). */
  isNativeAvailable(): Promise<{ available: boolean; platform: string }>;
  /** Informations appareil minimales. */
  getDeviceInfo(): Promise<{ platform: string; version: string }>;
  /** Notification locale (stub natif à l'étape 1, réel à l'étape 3). */
  notify(options: { title: string; message: string }): Promise<{ delivered: boolean }>;
  /** Scan de la bibliothèque locale (réel à l'étape 2). */
  scanLibrary(options: { folders?: string[] }): Promise<{ count: number }>;
  /** Planification d'une synchronisation périodique (réel à l'étape 3). */
  schedulePeriodicSync(options: { intervalMinutes: number }): Promise<{ scheduled: boolean }>;
}

const AmsNative = registerPlugin<AmsNativePlugin>('AmsNative');

export default AmsNative;
