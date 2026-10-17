/**
 * Tâches en arrière-plan (synchronisation périodique).
 *
 * Module PRÉPARÉ à l'étape 1 : la planification native (WorkManager)
 * sera implémentée à l'étape 3. Le stub est honnête : il ne planifie rien.
 */

export interface BackgroundTaskScheduler {
  schedulePeriodicSync(intervalMinutes: number): Promise<{ scheduled: boolean; reason?: string }>;
  cancelAll(): Promise<void>;
}

export class BackgroundTaskSchedulerStub implements BackgroundTaskScheduler {
  async schedulePeriodicSync(_intervalMinutes: number): Promise<{
    scheduled: boolean;
    reason?: string;
  }> {
    return {
      scheduled: false,
      reason: 'BACKGROUND_NOT_IMPLEMENTED : WorkManager sera branché à l’étape 3.',
    };
  }

  async cancelAll(): Promise<void> {
    // Aucune tâche planifiée à l'étape 1.
  }
}
