import type { DownloadProviderId, ModuleStatus, SearchProviderId } from '../domain/models';

export const APP = {
  name: 'A.MS',
  fullName: 'Arkanos Music Sync',
  androidAppId: 'com.arkanos.ams',
  organization: 'Studio-Arkanos',
  version: '0.1.0',
  defaultLanguage: 'fr',
} as const;

/**
 * Statut réel de chaque fonctionnalité à l'étape 4.
 * Règle : jamais de statut « operational » sans implémentation réelle.
 */
export const FEATURES: Record<string, { status: ModuleStatus; label: string }> = {
  syncEngine: { status: 'operational', label: 'Exécution de synchronisation (orchestration réelle)' },
  playlistAnalysis: { status: 'operational', label: 'Analyse de playlist (YouTube Data API v3)' },
  playlists: { status: 'operational', label: 'Playlists' },
  localScan: { status: 'operational', label: 'Scan de la bibliothèque locale (SAF)' },
  normalization: { status: 'operational', label: 'Normalisation des noms' },
  duplicates: { status: 'operational', label: 'Détection des doublons' },
  exclusions: { status: 'operational', label: 'Gestion des exclusions (persistantes)' },
  decisions: { status: 'operational', label: 'Décisions en attente' },
  searchProviders: { status: 'operational', label: 'Recherche (Jamendo + YouTube)' },
  downloadProviders: { status: 'operational', label: 'Téléchargement autorisé (Jamendo, DownloadManager)' },
  notifications: { status: 'operational', label: 'Notifications (permission runtime Android 13+)' },
  backgroundTasks: { status: 'operational', label: 'Arrière-plan (WorkManager — analyse périodique)' },
  database: { status: 'operational', label: 'Base locale (persistance WebView ; Room prêt)' },
  history: { status: 'operational', label: 'Historique des opérations' },
  conversion: { status: 'planned', label: 'Conversion audio (aucune solution vérifiée)' },
  urlImport: { status: 'operational', label: 'Import d’URL vérifié' },
  watchlist: { status: 'operational', label: 'Liste de suivi' },
  association: { status: 'operational', label: 'Association playlist ↔ fournisseurs' },
  player: { status: 'operational', label: 'Lecteur (fichiers locaux uniquement)' },
  favorites: { status: 'operational', label: 'Favoris' },
  userPlaylists: { status: 'operational', label: 'Playlists utilisateur' },
  diagnostics: { status: 'operational', label: 'Diagnostic (état réel des composants)' },
};

/** Dossier de bibliothèque locale par défaut (cahier des charges). */
export const DEFAULT_LIBRARY_FOLDER = '/storage/emulated/0/Music/Musics';

/**
 * Le moteur de synchronisation est RÉEL (étape 4) :
 * orchestration plan → association → file native.
 * L'exécution des téléchargements requiert Android.
 */
export const SYNC_ENGINE_READY = true;

/** Fournisseurs de recherche enregistrés (aucun à l'étape 1). */
export const SEARCH_PROVIDERS: SearchProviderId[] = [];

/**
 * Liste blanche des fournisseurs de téléchargement autorisés.
 * Vide à l'étape 1 : aucun fournisseur ne sera appelé.
 */
export const ALLOWED_DOWNLOAD_PROVIDERS: DownloadProviderId[] = [];
