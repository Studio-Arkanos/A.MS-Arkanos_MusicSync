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
 * Statut réel de chaque fonctionnalité à l'étape 2.
 * Règle : jamais de statut « operational » sans implémentation réelle.
 */
export const FEATURES: Record<string, { status: ModuleStatus; label: string }> = {
  syncEngine: { status: 'stub', label: 'Moteur de synchronisation (exécution — étape 3)' },
  playlistAnalysis: { status: 'operational', label: 'Analyse de playlist (YouTube Data API v3)' },
  playlists: { status: 'operational', label: 'Playlists' },
  localScan: { status: 'operational', label: 'Scan de la bibliothèque locale (SAF)' },
  normalization: { status: 'operational', label: 'Normalisation des noms' },
  duplicates: { status: 'operational', label: 'Détection des doublons' },
  exclusions: { status: 'operational', label: 'Gestion des exclusions (persistantes)' },
  decisions: { status: 'operational', label: 'Décisions en attente' },
  searchProviders: { status: 'planned', label: 'Fournisseurs de recherche' },
  downloadProviders: { status: 'planned', label: 'Fournisseurs de téléchargement autorisés' },
  notifications: { status: 'operational', label: 'Notifications (natif)' },
  backgroundTasks: { status: 'stub', label: 'Tâches en arrière-plan' },
  database: { status: 'operational', label: 'Base locale (Room prêt, pont étape 3)' },
  history: { status: 'operational', label: 'Historique des opérations' },
};

/** Dossier de bibliothèque locale par défaut (cahier des charges). */
export const DEFAULT_LIBRARY_FOLDER = '/storage/emulated/0/Music/Musics';

/**
 * Le moteur de synchronisation n'est PAS opérationnel à l'étape 1.
 * Le bouton « Synchroniser maintenant » doit rester désactivé.
 */
export const SYNC_ENGINE_READY = false;

/** Fournisseurs de recherche enregistrés (aucun à l'étape 1). */
export const SEARCH_PROVIDERS: SearchProviderId[] = [];

/**
 * Liste blanche des fournisseurs de téléchargement autorisés.
 * Vide à l'étape 1 : aucun fournisseur ne sera appelé.
 */
export const ALLOWED_DOWNLOAD_PROVIDERS: DownloadProviderId[] = [];
