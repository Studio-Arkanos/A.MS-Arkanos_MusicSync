import { useCallback, useEffect, useState } from 'react';
import AmsNative from '../plugins/amsNative';
import {
  buildDiagnosticReport,
  formatDiagnosticReport,
  type DiagnosticContext,
  type DiagnosticEntry,
  type DiagnosticState,
} from '../modules/diagnostics/diagnostics';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchIcon } from '../components/icons';
import { LoadingScreen } from '../components/LoadingScreen';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import { loadSettings } from '../app/settings';
import { APP } from '../config/app.config';

/**
 * Diagnostic (étape 4) — état RÉEL de chaque
 * composant. Aucun composant n'est « opérationnel »
 * par défaut : l'absence de sonde est « non testé ».
 * Le rapport exportable ne contient que des données
 * de configuration — aucune donnée personnelle.
 */
export function DiagnosticScreen() {
  const [entries, setEntries] = useState<DiagnosticEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSplash, setPreviewSplash] = useState(false);

  const probe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = loadSettings(services.storage);
      const library = loadLibraryState(services.storage);

      // Sondes réelles (échec = composant non testé,
      // jamais « opérationnel » supposé).
      let androidVersion: string | undefined;
      let sdkInt: number | undefined;
      try {
        const info = await AmsNative.getDeviceInfo();
        androidVersion = info.version;
        sdkInt = info.sdkInt;
      } catch {
        // navigateur de développement
      }

      let notificationPermissionGranted: boolean | undefined;
      try {
        const { granted } =
          await AmsNative.getNotificationPermissionStatus();
        notificationPermissionGranted = granted;
      } catch {
        notificationPermissionGranted = undefined;
      }

      let backgroundScheduled = false;
      try {
        backgroundScheduled = await services.background.isScheduled();
      } catch {
        backgroundScheduled = false;
      }

      let storageWritable = true;
      try {
        services.storage.set('ams.diagnostic.probe', '1');
        storageWritable = services.storage.get('ams.diagnostic.probe') === '1';
        services.storage.remove('ams.diagnostic.probe');
      } catch {
        storageWritable = false;
      }

      const context: DiagnosticContext = {
        isNative: services.player.available,
        androidVersion,
        sdkInt,
        appVersion: APP.version,
        notificationPermissionGranted,
        libraryFolder: settings.libraryFolder,
        libraryScanned: library !== null,
        libraryTrackCount: library?.tracks.length ?? 0,
        downloadFolderUri: settings.downloadFolderUri,
        jamendoConfigured: settings.jamendoClientId.trim().length > 0,
        youtubeConfigured: settings.youtubeApiKey.trim().length > 0,
        downloadEngineAvailable: services.downloadEngine.available,
        backgroundScheduled,
        online: navigator.onLine,
        storageWritable,
      };

      setEntries(buildDiagnosticReport(context));
    } catch (probeError) {
      setError((probeError as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  const onExport = () => {
    if (!entries) return;
    const report = formatDiagnosticReport(entries, new Date().toISOString());
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ams-diagnostic-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="screen">
      <ScreenHeader
        title={fr.diagnostics.title}
        subtitle={fr.diagnostics.subtitle}
      />

      {loading ? <ProgressBar percent={50} label={fr.diagnostics.probing} /> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      {entries === null ? (
        <EmptyState
          icon={<SearchIcon size={40} />}
          title={fr.diagnostics.error}
          description={error ?? ''}
        />
      ) : (
        <>
          <ul className="diagnostic-list">
            {entries.map((entry) => (
              <li className="card" key={entry.component}>
                <div className="diagnostic-row">
                  <p className="diagnostic-component">
                    {fr.diagnostics.components[entry.component as keyof typeof fr.diagnostics.components] ??
                      entry.component}
                  </p>
                  <span className={`badge badge-state-${entry.state}`}>
                    {fr.diagnostics.states[entry.state]}
                  </span>
                </div>
                <p className="card__muted">{entry.detail}</p>
              </li>
            ))}
          </ul>

          <div className="button-row">
            <button className="btn-secondary" type="button" onClick={() => void probe()}>
              {fr.diagnostics.refresh}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setPreviewSplash(true)}>
              Tester l'écran de chargement
            </button>
            <button className="btn-primary" type="button" onClick={onExport}>
              {fr.diagnostics.export}
            </button>
          </div>

          <p className="demo-notice">{fr.diagnostics.privacy}</p>
        </>
      )}

      {previewSplash && (
        <LoadingScreen
          message="Démonstration du démarrage A.MS…"
          minDuration={2200}
          onFinish={() => setPreviewSplash(false)}
        />
      )}
    </section>
  );
}

export type { DiagnosticState };
