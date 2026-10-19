/**
 * Câblage central des services (singletons).
 * Chaque module est injecté ici ; l'étape 4 (finition)
 * ne remplacera que ce qui reste stubé.
 */

import { Capacitor } from '@capacitor/core';
import { PersistedDecisionStore } from '../modules/decisions/decisions';
import { PersistedExclusionStore } from '../modules/exclusions/exclusions';
import { NativeDownloadEngine } from '../modules/download/DownloadEngine';
import { HistoryService } from '../modules/history/HistoryService';
import { NativeNotificationService } from '../modules/notifications/NotificationService';
import { BackgroundTaskSchedulerStub } from '../modules/background/BackgroundTaskScheduler';
import { LocalLibraryScanner } from '../modules/scanner/scanner';
import { SyncEngineStub } from '../modules/sync/SyncEngine';
import { SyncPlanner } from '../modules/sync/planner';
import { DuplicateDetector } from '../modules/duplicates/duplicates';
import { DuplicateMatcher } from '../modules/duplicates/matcher';
import { ExclusionEngine } from '../modules/exclusions/exclusions';
import { YouTubePlaylistProvider } from '../modules/playlist/playlist';
import { PlaylistAssociation } from '../modules/association/association';
import { ProviderRegistry } from '../modules/providers/registry';
import { JamendoProvider } from '../modules/providers/jamendo';
import { YouTubeSearchProvider } from '../modules/providers/youtube';
import { ConversionManagerStub } from '../modules/conversion/conversion';
import { UrlImportService } from '../modules/import/urlImport';
import { PersistedWatchlistStore } from '../modules/watchlist/watchlist';
import { InMemoryHistoryRepository, InMemoryTrackRepository } from '../modules/database/InMemoryRepositories';
import { NativePlayerService } from '../modules/player/player';
import { nativePlayerBridge } from '../modules/player/bridge';
import { PersistedFavoriteStore } from '../modules/favorites/favorites';
import { PersistedUserPlaylistStore } from '../modules/userplaylist/userPlaylist';
import { MemoryStorage, WebStorage } from './storage';
import { loadSettings, saveSettings, type Settings } from './settings';
import AmsNative from '../plugins/amsNative';

const storage =
  typeof window !== 'undefined' && 'localStorage' in window
    ? new WebStorage()
    : new MemoryStorage();

const settings = () => loadSettings(storage);

/** Listeur réel : passe par le plugin natif (SAF / DocumentFile). */
const nativeFileLister = async (folderUri: string) => {
  const result = await AmsNative.scanLibrary({ folderUri });
  return result.files;
};

// --- Fournisseurs (capacités déclarées réellement) ---
const jamendo = new JamendoProvider(() => settings().jamendoClientId);
const youtubeSearch = new YouTubeSearchProvider(() => settings().youtubeApiKey);

const providerRegistry = new ProviderRegistry();
providerRegistry.registerSearch(jamendo);
providerRegistry.registerSearch(youtubeSearch);
providerRegistry.registerDownload(jamendo);

// --- Moteur de téléchargement natif (Android DownloadManager) ---
const downloadEngine = new NativeDownloadEngine(
  storage,
  Capacitor.isNativePlatform(),
);

const exclusionStore = new PersistedExclusionStore(storage);
const decisionStore = new PersistedDecisionStore(storage);
const watchlistStore = new PersistedWatchlistStore(storage);

export const services = {
  // Planificateur de synchronisation (étape 2).
  syncEngine: new SyncEngineStub(),
  planner: new SyncPlanner(
    new DuplicateMatcher(),
    exclusionStore,
    (sourceId, trackRef) => decisionStore.resolutionFor(sourceId, trackRef),
  ),

  // Analyse de playlist (YouTube Data API v3 officielle).
  playlistProvider: new YouTubePlaylistProvider(),

  // Scan local : moteur web réel + listeur natif.
  scanner: new LocalLibraryScanner(
    nativeFileLister,
    Capacitor.isNativePlatform(),
  ),

  // Fournisseurs : recherche fédérée + téléchargement autorisé.
  providers: providerRegistry,
  jamendo,
  youtubeSearch,

  // Association playlist ↔ fournisseurs autorisés.
  association: new PlaylistAssociation(
    providerRegistry,
    new DuplicateMatcher(),
    exclusionStore,
  ),

  // Téléchargement réel (Android DownloadManager).
  downloadEngine,

  // Import d'URL directe (vérifiée, jamais de contournement).
  urlImport: new UrlImportService(jamendo, downloadEngine),

  // Conversion : non intégrée (documenté, jamais simulée).
  conversion: new ConversionManagerStub(),

  // Liste de suivi (YouTube — surveillance, pas téléchargement).
  watchlist: watchlistStore,

  notifications: new NativeNotificationService(),

  // Lecteur audio (MediaPlayer Android — fichiers locaux uniquement).
  player: new NativePlayerService(
    nativePlayerBridge,
    Capacitor.isNativePlatform(),
  ),

  // Favoris et playlists utilisateur (persistés en local).
  favorites: new PersistedFavoriteStore(storage),
  userPlaylists: new PersistedUserPlaylistStore(storage),

  background: new BackgroundTaskSchedulerStub(),
  duplicates: new DuplicateDetector(),
  matcher: new DuplicateMatcher(),
  exclusions: new ExclusionEngine(),
  exclusionStore,
  decisions: decisionStore,
  tracks: new InMemoryTrackRepository(),
  history: new HistoryService(new InMemoryHistoryRepository()),
  storage,
  settings: {
    load: () => settings(),
    save: (patch: Settings) => saveSettings(storage, patch),
  },
};
