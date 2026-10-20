import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { HistoryIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import type { OperationRecord } from '../domain/models';

/** Historique des opérations RÉELLES de l'application. */
export function HistoryScreen() {
  const [records, setRecords] = useState<OperationRecord[]>([]);

  const refresh = useCallback(() => {
    services.history
      .list()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClear = () => {
    services.history.clear().then(refresh).catch(() => {});
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.history} />

      {records.length > 0 ? (
        <>
          <button className="btn-secondary" type="button" onClick={onClear}>
            {fr.history.clear}
          </button>
          <ul className="history-list">
            {records.map((record) => (
              <li className="card" key={record.id}>
                <p className="card__body">{record.label}</p>
                <p className="card__muted">
                  {new Date(record.at).toLocaleString('fr-FR')} · {record.type}
                  {record.detail ? ` — ${record.detail}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={<HistoryIcon size={40} />} title={fr.history.empty} />
      )}
    </section>
  );
}
