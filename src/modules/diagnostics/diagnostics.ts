/**
 * Diagnostic (étape 4).
 *
 * État RÉEL des composants — jamais « tout est
 * opérationnel » par défaut. Chaque ligne est
 * dérivée d'une sonde concrète (native, stockage,
 * configuration) ; l'absence de sonde est
 * « non testé », jamais « opérationnel ».
 */

export type DiagnosticState =
  | 'operational'
  | 'limited'
  | 'unavailable'
  | 'permission_required'
  | 'error'
  | 'untested';

export interface DiagnosticEntry {
  component: string;
  state: DiagnosticState;
  detail: string;
}

export interface DiagnosticContext {
  /** Application Android (Capacitor native). */
  isNative: boolean;
  /** Version Android lue nativement (ex. "14"). */
  androidVersion?: string;
  sdkInt?: number;
  appVersion: string;
  /** Permission POST_NOTIFICATIONS — undefined = non sondée. */
  notificationPermissionGranted?: boolean;
  libraryFolder: string;
  libraryScanned: boolean;
  libraryTrackCount: number;
  downloadFolderUri: string;
  jamendoConfigured: boolean;
  youtubeConfigured: boolean;
  downloadEngineAvailable: boolean;
  backgroundScheduled: boolean;
  online: boolean;
  storageWritable: boolean;
}

/** Dérivation pure — une ligne par composant. */
export function buildDiagnosticReport(
  context: DiagnosticContext,
): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];

  // --- Stockage local réel ---
  entries.push({
    component: 'database',
    state: context.storageWritable ? 'operational' : 'error',
    detail: context.storageWritable
      ? 'Stockage local WebView (localStorage) accessible ; sans sauvegarde serveur.'
      : 'Écriture localStorage impossible ; les changements ne peuvent pas être persistés.',
  });

  // --- Permissions ---
  if (!context.isNative) {
    entries.push({
      component: 'permissions',
      state: 'untested',
      detail: 'Sonde de permissions native indisponible (navigateur de développement).',
    });
  } else if (context.notificationPermissionGranted === undefined) {
    entries.push({
      component: 'permissions',
      state: 'untested',
      detail: 'Permission de notification non sondée.',
    });
  } else if (context.notificationPermissionGranted) {
    entries.push({
      component: 'permissions',
      state: 'operational',
      detail: 'POST_NOTIFICATIONS accordée (Android 13+) ; SAF persistant.',
    });
  } else {
    entries.push({
      component: 'permissions',
      state: 'permission_required',
      detail: 'POST_NOTIFICATIONS non accordée — envoyez une notification depuis l’analyse pour la demander.',
    });
  }

  // --- Stockage ---
  entries.push(
    context.libraryFolder
      ? {
          component: 'storage',
          state: 'operational',
          detail: `Dossier SAF mémorisé : ${context.libraryFolder}`,
        }
      : {
          component: 'storage',
          state: 'permission_required',
          detail: 'Aucun dossier de bibliothèque choisi (SAF).',
        },
  );

  // --- Bibliothèque locale ---
  entries.push(
    !context.libraryScanned
      ? {
          component: 'localLibrary',
          state: 'untested',
          detail: 'Aucun scan de bibliothèque pour l’instant.',
        }
      : context.libraryTrackCount > 0
        ? {
            component: 'localLibrary',
            state: 'operational',
            detail: `${context.libraryTrackCount} fichier(s) audio détecté(s).`,
          }
        : {
            component: 'localLibrary',
            state: 'limited',
            detail: 'Dernier scan : aucun fichier audio reconnu.',
          },
  );

  // --- Connexion Internet ---
  entries.push(
    context.online
      ? { component: 'connectivity', state: 'operational', detail: 'Connexion détectée.' }
      : { component: 'connectivity', state: 'error', detail: 'Aucune connexion détectée — consultation locale toujours possible.' },
  );

  // --- Fournisseurs ---
  entries.push(
    context.jamendoConfigured
      ? { component: 'providerJamendo', state: 'operational', detail: 'client_id configuré — recherche + téléchargement autorisés.' }
      : { component: 'providerJamendo', state: 'limited', detail: 'client_id Jamendo non configuré (Paramètres) — recherche et téléchargement indisponibles.' },
  );
  entries.push(
    context.youtubeConfigured
      ? { component: 'providerYoutube', state: 'operational', detail: 'Clé API v3 configurée — recherche et métadonnées.' }
      : { component: 'providerYoutube', state: 'limited', detail: 'Clé YouTube Data API v3 non configurée (Paramètres) — analyse de playlist indisponible.' },
  );

  // --- Moteur de téléchargement ---
  entries.push(
    context.downloadEngineAvailable
      ? { component: 'downloadEngine', state: 'operational', detail: 'Android DownloadManager — file, reprise, vérification.' }
      : { component: 'downloadEngine', state: 'unavailable', detail: 'Moteur natif indisponible (navigateur de développement).' },
  );

  // --- Conversion ---
  entries.push({
    component: 'conversion',
    state: 'unavailable',
    detail: 'Aucune solution vérifiée compatible Android + licence (FFmpegKit évalué, rejeté). Fichiers sources conservés tels quels.',
  });

  // --- Notifications ---
  if (!context.isNative) {
    entries.push({
      component: 'notifications',
      state: 'untested',
      detail: 'Notifications natives : application Android uniquement.',
    });
  } else if (context.notificationPermissionGranted) {
    entries.push({
      component: 'notifications',
      state: 'operational',
      detail: 'Canal « décisions » créé, deep-link vers le morceau.',
    });
  } else {
    entries.push({
      component: 'notifications',
      state: 'permission_required',
      detail: 'Permission POST_NOTIFICATIONS à accorder (demande runtime).',
    });
  }

  // --- Arrière-plan ---
  entries.push(
    !context.isNative
      ? { component: 'background', state: 'unavailable', detail: 'WorkManager : application Android uniquement.' }
      : context.backgroundScheduled
        ? { component: 'background', state: 'operational', detail: 'Analyse périodique planifiée (WorkManager, 12 h, contraintes réseau+batterie — aucune heure exacte garantie).' }
        : { component: 'background', state: 'limited', detail: 'Aucune analyse périodique planifiée (Paramètres → Arrière-plan).' },
  );

  // --- Versions ---
  entries.push(
    context.androidVersion
      ? { component: 'androidVersion', state: 'operational', detail: `Android ${context.androidVersion} (SDK ${context.sdkInt ?? '?'})` }
      : { component: 'androidVersion', state: 'untested', detail: 'Version Android non sondée.' },
  );
  entries.push({
    component: 'appVersion',
    state: 'operational',
    detail: `A.MS ${context.appVersion} — Studio-Arkanos.`,
  });

  return entries;
}

/** Rapport technique exportable — données de configuration
 *  uniquement, aucune donnée personnelle (aucun titre,
 *  aucun chemin utilisateur au-delà du dossier choisi). */
export function formatDiagnosticReport(
  entries: DiagnosticEntry[],
  generatedAt: string,
): string {
  return JSON.stringify(
    {
      application: 'A.MS — Arkanos Music Sync',
      generatedAt,
      entries: entries.map((entry) => ({
        component: entry.component,
        state: entry.state,
        detail: entry.detail,
      })),
    },
    null,
    2,
  );
}
