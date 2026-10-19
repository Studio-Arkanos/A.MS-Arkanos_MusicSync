import { useEffect, useState } from 'react';
import type { DownloadTask } from '../modules/download/DownloadEngine';
import { services } from '../app/services';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { DownloadIcon } from '../components/icons';
import { fr } from '../i18n/fr';

/**
 * File de téléchargements RÉELLE (Android DownloadManager).
 * Chaque tâche affiche sa source, son état réel et sa
 * progression. Consultable après avoir quitté la
 * recherche (persistance locale).
 */
export function DownloadsScreen() {
  const [tasks, setTasks] = useState<DownloadTask[]>(
    services.downloadEngine.list(),
  );
  const operational = services.downloadEngine.available;

  useEffect(() => {
    const unsubscribe = services.downloadEngine.subscribe(() => {
      setTasks(services.downloadEngine.list());
    });
    // Actualisation périodique tant que des tâches sont actives.
    const interval = setInterval(() => {
      void services.downloadEngine.refresh();
    }, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const onCancel = (task: DownloadTask) => {
    void services.downloadEngine.cancel(task.id);
  };

  const statusLabel = (task: DownloadTask): string => {
    switch (task.status) {
      case 'queued':
        return fr.downloads.statusQueued;
      case 'downloading':
        return fr.downloads.statusDownloading;
      case 'done':
        return fr.downloads.statusDone;
      case 'cancelled':
        return fr.downloads.statusCancelled;
      case 'failed':
      default:
        return `${fr.downloads.statusFailed}${task.error ? ` — ${task.error}` : ''}`;
    }
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.downloads} />

      {!operational ? (
        <div className="banner banner-warning">
          <p>{fr.downloads.notNative}</p>
        </div>
      ) : (
        <p className="screen__muted">{fr.downloads.engineNote}</p>
      )}

      <p className="screen__muted">{fr.downloads.neverOverwrite}</p>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<DownloadIcon size={40} />}
          title={fr.downloads.empty}
        />
      ) : (
        <ul className="track-list">
          {tasks.map((task) => (
            <li className="card" key={task.id}>
              <p className="card__body">
                <strong>{task.title}</strong> — {task.artist}
              </p>
              <p className="card__muted">
                {fr.downloads.source} : {task.providerId} ·{' '}
                {task.license ? `${fr.downloads.license} : ${task.license} · ` : ''}
                {statusLabel(task)}
              </p>
              {task.status === 'downloading' || task.status === 'queued' ? (
                <ProgressBar
                  percent={task.progressPercent}
                  label={fr.downloads.progress}
                />
              ) : null}
              {task.status === 'done' && task.localUri ? (
                <p className="card__muted">
                  {fr.downloads.fileSaved} : {task.localUri}
                </p>
              ) : null}
              {task.status === 'queued' || task.status === 'downloading' ? (
                <div className="track-row__actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => onCancel(task)}
                  >
                    {fr.downloads.cancel}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
