import type { ModuleStatus } from '../domain/models';
import { fr } from '../i18n/fr';

/** Pastille de maturité d'un module — toujours honnête. */
export function StatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      {fr.status[status]}
    </span>
  );
}
