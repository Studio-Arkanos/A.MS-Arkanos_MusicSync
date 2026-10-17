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
 * Statut réel de chaque fonctionnalité à l'étape 1.
 * Règle : jamais de statut « operational » sans implémentation réelle.
 */
export const FEATURES: Record<string, { status: ModuleStatus; label: string }> = {
  syncEngine: { status: 'stub', label: 'Moteur de synchronisation' },
  playlists: { status: 'planned', label: 'Playlists' },
  localScan: { status: 'stub', label: 'Scan de la bibliothèque locale' },
  normalization: { status: 'operational', label: 'Normalisation des noms' },
  duplicates: { status: 'operational', label: 'Détection des doublons' },
  exclusions: { status: 'operational', label: 'Gestion des exclusions' },
  searchProviders: { status: 'planned', label: 'Fournisseurs de recherche' },
  downloadProviders: { status: 'planned', label: 'Fournisseurs de téléchargement autorisés' },
  notifications: { status: 'stub', label: 'Notifications' },
  backgroundTasks: { status: 'stub', label: 'Tâches en arrière-plan' },
  database: { status: 'stub', label: 'Base de données (Room)' },
  history: { status: 'operational', label: 'Historique des opérations' },
};

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
