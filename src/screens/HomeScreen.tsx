import { useEffect, useState } from 'react';
import { SYNC_ENGINE_READY, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import type { OperationRecord } from '../domain/models';

/**
 * Écran Accueil — tableau de bord.
 * Toutes les valeurs affichées sont RÉELLES (vide à l'étape 1).
 * Le bouton de synchronisation est désactivé tant que le moteur
 * n'est pas opérationnel : aucune synchronisation n'est simulée.
 */
export function HomeScreen() {
  const [trackCount, setTrackCount] = useState<number | null>(null);
  const [lastOperation, setLastOperation] = useState<OperationRecord | null>(null);

  useEffect(() => {
    services.tracks.count().then(setTrackCount).catch(() => setTrackCount(0));
    services.history
      .list()
      .then((records) => setLastOperation(records[0] ?? null))
      .catch(() => setLastOperation(null));
  }, []);

  return (
    <section className="screen">
      <h1 className="screen-title">{fr.home.title}</h1>

      <div className="banner banner-warning">
        <strong>A.MS — {fr.app.stepBadge}</strong>
        <p>{fr.home.engineNotReady}</p>
      </div>

      <div className="stat-grid">
        <StatCard label={fr.home.activePlaylist} value={fr.home.none} />
        <StatCard
          label={fr.home.analyzed}
          value={trackCount ?? '—'}
          hint={FEATURES.localScan.label}
        />
        <StatCard label={fr.home.present} value={0} />
        <StatCard label={fr.home.toDownload} value={0} />
        <StatCard label={fr.home.excluded} value={0} />
        <StatCard label={fr.home.pending} value={0} />
      </div>

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

      <PrimaryButton
        disabled={!SYNC_ENGINE_READY}
        disabledReason={fr.home.engineNotReady}
      >
        {fr.home.syncNow}
      </PrimaryButton>

      <section className="card">
        <h2 className="card__title">{fr.home.upcoming}</h2>
        <ul className="feature-list">
          <li>
            {FEATURES.syncEngine.label} <StatusBadge status={FEATURES.syncEngine.status} />
          </li>
          <li>
            {FEATURES.localScan.label} <StatusBadge status={FEATURES.localScan.status} />
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
            {FEATURES.notifications.label} <StatusBadge status={FEATURES.notifications.status} />
          </li>
          <li>
            {FEATURES.backgroundTasks.label}{' '}
            <StatusBadge status={FEATURES.backgroundTasks.status} />
          </li>
          <li>
            {FEATURES.database.label} <StatusBadge status={FEATURES.database.status} />
          </li>
        </ul>
      </section>

      <p className="demo-notice">{fr.home.demoNotice}</p>
    </section>
  );
}
