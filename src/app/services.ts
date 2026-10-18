/**
 * Câblage central des services (singletons).
 * Chaque module est injecté ici ; l'étape 3 remplacera les
 * stubs restants sans toucher à l'UI.
 */

import { DuplicateDetector } from '../modules/duplicates/duplicates';
import { DuplicateMatcher } from '../modules/duplicates/matcher';
import { ExclusionEngine, PersistedExclusionStore } from '../modules/exclusions/exclusions';
import { PersistedDecisionStore } from '../modules/decisions/decisions';
import { DownloadManagerStub } from '../modules/download/DownloadManager';
import { HistoryService } from '../modules/history/HistoryService';
import { NativeNotificationService } from '../modules/notifications/NotificationService';
import { BackgroundTaskSchedulerStub } from '../modules/background/BackgroundTaskScheduler';
import { SearchProviderRegistry } from '../modules/search/SearchProviderRegistry';
import { LocalLibraryScanner } from '../modules/scanner/scanner';
import { SyncEngineStub } from '../modules/sync/SyncEngine';
import { SyncPlanner } from '../modules/sync/planner';
import { YouTubePlaylistProvider } from '../modules/playlist/playlist';
import { InMemoryHistoryRepository, InMemoryTrackRepository } from '../modules/database/InMemoryRepositories';
import { MemoryStorage, WebStorage } from './storage';
import AmsNative from '../plugins/amsNative';
import { Capacitor } from '@capacitor/core';

const storage =
  typeof window !== 'undefined' && 'localStorage' in window
    ? new WebStorage()
    : new MemoryStorage();

/** Listeur réel : passe par le plugin natif (SAF / DocumentFile). */
const nativeFileLister = async (folderUri: string) => {
  const result = await AmsNative.scanLibrary({ folderUri });
  return result.files;
};

export const services = {
  // Moteur de synchronisation : planification (étape 2),
  // exécution réelle à l'étape 3.
  syncEngine: new SyncEngineStub(),
  planner: new SyncPlanner(
    new DuplicateMatcher(),
    new PersistedExclusionStore(storage),
    (sourceId, trackRef) =>
      new PersistedDecisionStore(storage).resolutionFor(sourceId, trackRef),
  ),

  // Analyse de playlist (YouTube Data API officielle).
  playlistProvider: new YouTubePlaylistProvider(),

  // Scan local : moteur web réel + listeur natif.
  scanner: new LocalLibraryScanner(
    nativeFileLister,
    Capacitor.isNativePlatform(),
  ),

  search: new SearchProviderRegistry(),
  downloads: new DownloadManagerStub(),
  notifications: new NativeNotificationService(),
  background: new BackgroundTaskSchedulerStub(),
  duplicates: new DuplicateDetector(),
  matcher: new DuplicateMatcher(),
  exclusions: new ExclusionEngine(),
  exclusionStore: new PersistedExclusionStore(storage),
  decisions: new PersistedDecisionStore(storage),
  tracks: new InMemoryTrackRepository(),
  history: new HistoryService(new InMemoryHistoryRepository()),
  storage,
};
