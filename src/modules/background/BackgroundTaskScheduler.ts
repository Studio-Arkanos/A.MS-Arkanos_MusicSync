import AmsNative from '../../plugins/amsNative';
import { Capacitor } from '@capacitor/core';

/**
 * Tâches en arrière-plan (étape 4).
 *
 * Planification RÉELLE via WorkManager (natif) :
 * analyse périodique de la bibliothèque locale
 * dont l'URI SAF est mémorisée.
 *
 * Limites honnêtes (jamais cachées) :
 *  - WorkManager ne garantit AUCUNE heure exacte
 *    (doze, restrictions OEM, batterie) ;
 *  - intervalle minimal côté système : 15 min ;
 *    A.MS utilise 12 h pour préserver la batterie ;
 *  - nécessite l'application Android ;
 *  - le scan complet (playlist → téléchargements)
 *    reste piloté depuis l'interface ouverte.
 */

export interface BackgroundTaskScheduler {
  schedulePeriodicSync(): Promise<{
    scheduled: boolean;
    reason?: string;
    intervalHours?: number;
  }>;
  cancelAll(): Promise<void>;
  isScheduled(): Promise<boolean>;
}

export class NativeBackgroundScheduler implements BackgroundTaskScheduler {
  private readonly isNative: boolean;

  constructor(
    isNative = Capacitor.isNativePlatform(),
    private readonly libraryFolder: () => string = () => '',
  ) {
    this.isNative = isNative;
  }

  async schedulePeriodicSync(): Promise<{
    scheduled: boolean;
    reason?: string;
    intervalHours?: number;
  }> {
    if (!this.isNative) {
      return {
        scheduled: false,
        reason:
          'BACKGROUND_NOT_NATIVE : la planification WorkManager requiert l’application Android.',
      };
    }
    const folderUri = this.libraryFolder();
    if (!folderUri) {
      return {
        scheduled: false,
        reason: 'SYNC_NO_FOLDER : choisissez d’abord un dossier de bibliothèque (Bibliothèque).',
      };
    }
    try {
      const result = await AmsNative.schedulePeriodicSync({
        folderUri,
      });
      return {
        scheduled: result.scheduled,
        intervalHours: result.intervalHours,
      };
    } catch (error) {
      return {
        scheduled: false,
        reason: `SYNC_SCHEDULE_FAILED : ${(error as Error).message}`,
      };
    }
  }

  async cancelAll(): Promise<void> {
    if (!this.isNative) return;
    try {
      await AmsNative.cancelPeriodicSync();
    } catch {
      // Annulation d’une tâche absente : sans effet.
    }
  }

  async isScheduled(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const { scheduled } = await AmsNative.isPeriodicSyncScheduled();
      return scheduled;
    } catch {
      return false;
    }
  }
}

/** Stub honnête conservé pour la compatibilité des tests. */
export class BackgroundTaskSchedulerStub implements BackgroundTaskScheduler {
  async schedulePeriodicSync(): Promise<{
    scheduled: boolean;
    reason?: string;
    intervalHours?: number;
  }> {
    return {
      scheduled: false,
      reason: 'BACKGROUND_STUB : remplacé par le scheduler natif.',
    };
  }

  async cancelAll(): Promise<void> {}

  async isScheduled(): Promise<boolean> {
    return false;
  }
}
