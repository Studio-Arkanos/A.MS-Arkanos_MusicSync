import { useEffect, useMemo, useState } from 'react';
import { SYNC_ENGINE_READY, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import { loadPlaylistAnalysis } from '../app/playlistState';
import type { SyncProgress, SyncReport } from '../modules/sync/SyncEngine';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import type { OperationRecord } from '../domain/models';

/**
 * Écran Accueil — tableau de bord.
 * Toutes les valeurs sont RÉELLES (calculées depuis les
 * analyses, scans, exclusions et décisions persistés).
 * « Synchroniser maintenant » exécute l'orchestration
 * réelle : plan → association → file de téléchargement
 * native (étape 4).
 */
export function HomeScreen() {
  const [lastOperation, setLastOperation] = useState<OperationRecord | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    services.history
      .list()
      .then((records) => setLastOperation(records[0] ?? null))
      .catch(() => setLastOperation(null));
    setPendingDecisions(services.decisions.listPending().length);
  }, []);

  useEffect(() => services.syncEngine.subscribe(setProgress), []);

  // Relecture des états persistés (réel, jamais simulé).
  const dashboard = useMemo(() => {
    const library = loadLibraryState(services.storage);
    const analysis = loadPlaylistAnalysis(services.storage);
    const sourceId = analysis?.playlistId ?? '';
    const tracks = analysis?.tracks ?? [];
    const result = services.planner.plan(
      tracks,
      library?.tracks ?? [],
      sourceId,
    );
    return {
      playlistName: analysis ? (sourceId ? `Playlist ${sourceId.slice(0, 12)}…` : '') : '',
      libraryCount: library?.tracks.length ?? 0,
      scanDate: library?.scannedAt,
      summary: result.summary,
    };
  }, []);

  const summary = dashboard.summary;

  const onSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setReport(null);
    try {
      const result = await services.syncEngine.sync();
      setReport(result);
      services.history.record(
        'sync_attempt',
        'Synchronisation exécutée',
        `${result.downloaded} téléchargement(s) enfilé(s)`,
      );
    } catch (error) {
      setSyncError((error as Error).message);
      services.history.record('sync_error', 'Échec de synchronisation', (error as Error).message);
    }
    setSyncing(false);
  };

  return (
    <section className="screen">
      <h1 className="screen-title">{fr.home.title}</h1>

      <div className="banner banner-info">
        <strong>A.MS — {fr.app.stepBadge}</strong>
        <p>{fr.home.engineNotReady}</p>
      </div>

      <div className="stat-grid">
        <StatCard label={fr.home.activePlaylist} value={dashboard.playlistName || fr.home.none} />
        <StatCard label={fr.home.analyzed} value={dashboard.libraryCount} />
        <StatCard label={fr.home.found} value={summary.found} />
        <StatCard label={fr.home.present} value={summary.present} />
        <StatCard label={fr.home.toDownload} value={summary.candidates} />
        <StatCard label={fr.home.excluded} value={summary.excluded} />
        <StatCard label={fr.home.uncertain} value={summary.uncertain} />
        <StatCard label={fr.home.unavailable} value={summary.unavailable} />
        <StatCard label={fr.home.pending} value={pendingDecisions} />
      </div>

      <section className="card">
        <h2 className="card__title">{fr.home.scanDate}</h2>
        <p className="card__body">
          {dashboard.scanDate
            ? new Date(dashboard.scanDate).toLocaleString('fr-FR')
            : fr.home.never}
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.home.syncProgress}</h2>
        <p className="card__muted">
          {progress?.message
            ? `${fr.home.phase}: ${progress.message}`
            : fr.home.idle}
        </p>
        <ProgressBar
          percent={progress?.percent ?? 0}
          label={progress ? `${progress.phase} — ${progress.percent} %` : fr.home.syncProgress}
        />
      </section>

      <section className="card">
        <h2 className="card__title">{fr.home.lastOperation}</h2>
        {lastOperation ? (
          <p className="card__body">
            {lastOperation.label}
            {lastOperation.detail ? ` — ${lastOperation.detail}` : ''}
          </p>
        ) : (
          <p className="card__muted">{fr.home.none}</p>
        )}
      </section>

      <PrimaryButton disabled={!SYNC_ENGINE_READY || syncing} disabledReason={fr.home.engineNotReady} onClick={() => void onSync()}>
        {syncing ? fr.home.syncing : fr.home.syncNow}
      </PrimaryButton>

      {syncError ? <div className="banner banner-error">{syncError}</div> : null}

      {report ? (
        <section className="card">
          <h2 className="card__title">{fr.home.syncReport}</h2>
          <div className="summary-grid">
            <span>{fr.home.analyzed} : {report.analyzed}</span>
            <span>{fr.home.present} : {report.alreadyPresent}</span>
            <span>{fr.home.toDownload} : {report.toDownload}</span>
            <span>{fr.home.downloaded} : {report.downloaded}</span>
            <span>{fr.home.excluded} : {report.excluded}</span>
            <span>{fr.home.uncertain} : {report.pendingDecisions}</span>
          </div>
          {report.errors.length > 0 ? (
            <ul className="report-errors">
              {report.errors.map((errorItem, index) => (
                <li key={index}>{errorItem}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h2 className="card__title">{fr.home.upcoming}</h2>
        <ul className="feature-list">
          <li>
            {FEATURES.syncEngine.label} <StatusBadge status={FEATURES.syncEngine.status} />
          </li>
          <li>
            {FEATURES.searchProviders.label}{' '}
            <StatusBadge status={FEATURES.searchProviders.status} />
          </li>
          <li>
            {FEATURES.downloadProviders.label}{' '}
            <StatusBadge status={FEATURES.downloadProviders.status} />
          </li>
          <li>
            {FEATURES.backgroundTasks.label}{' '}
            <StatusBadge status={FEATURES.backgroundTasks.status} />
          </li>
        </ul>
      </section>

      <p className="demo-notice">{fr.home.demoNotice}</p>
    </section>
  );
}
