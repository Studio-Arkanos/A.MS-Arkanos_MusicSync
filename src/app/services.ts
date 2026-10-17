/**
 * Câblage central des services (singletons de l'étape 1).
 * Chaque module est injecté ici ; les étapes suivantes remplaceront
 * les stubs par les implémentations réelles sans toucher à l'UI.
 */

import { DuplicateDetector } from '../modules/duplicates/duplicates';
import { ExclusionEngine } from '../modules/exclusions/exclusions';
import { DownloadManagerStub } from '../modules/download/DownloadManager';
import { HistoryService } from '../modules/history/HistoryService';
import { NativeNotificationService } from '../modules/notifications/NotificationService';
import { BackgroundTaskSchedulerStub } from '../modules/background/BackgroundTaskScheduler';
import { SearchProviderRegistry } from '../modules/search/SearchProviderRegistry';
import { LocalScannerStub } from '../modules/scanner/scanner';
import { SyncEngineStub } from '../modules/sync/SyncEngine';
import { InMemoryHistoryRepository, InMemoryTrackRepository } from '../modules/database/InMemoryRepositories';

export const services = {
  syncEngine: new SyncEngineStub(),
  scanner: new LocalScannerStub(),
  search: new SearchProviderRegistry(),
  downloads: new DownloadManagerStub(),
  notifications: new NativeNotificationService(),
  background: new BackgroundTaskSchedulerStub(),
  duplicates: new DuplicateDetector(),
  exclusions: new ExclusionEngine(),
  tracks: new InMemoryTrackRepository(),
  history: new HistoryService(new InMemoryHistoryRepository()),
};
