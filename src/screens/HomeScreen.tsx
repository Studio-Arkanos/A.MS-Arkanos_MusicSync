import { useEffect, useMemo, useState } from 'react';
import { SYNC_ENGINE_READY, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import { loadPlaylistAnalysis } from '../app/playlistState';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import type { OperationRecord } from '../domain/models';

/**
 * Écran Accueil — tableau de bord.
 * Toutes les valeurs sont RÉELLES (calculées depuis les
 * analyses, scans, exclusions et décisions persistés).
 * Le bouton de synchronisation reste désactivé : l’exécution
 * des téléchargements arrive à l’étape 3.
 */
export function HomeScreen() {
  const [lastOperation, setLastOperation] = useState<OperationRecord | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState(0);

  useEffect(() => {
    services.history
      .list()
      .then((records) => setLastOperation(records[0] ?? null))
      .catch(() => setLastOperation(null));
    setPendingDecisions(services.decisions.listPending().length);
  }, []);

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
        <p className="card__muted">{fr.home.idle}</p>
        <ProgressBar percent={0} label={fr.home.syncProgress} />
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

      <PrimaryButton disabled={!SYNC_ENGINE_READY} disabledReason={fr.home.engineNotReady}>
        {fr.home.syncNow}
      </PrimaryButton>

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
