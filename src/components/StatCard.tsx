import type { ReactNode } from 'react';

/** Carte de statistique du tableau de bord. */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card__header">
        {icon}
        <span className="stat-card__label">{label}</span>
      </div>
      <p className="stat-card__value">{value}</p>
      {hint ? <p className="stat-card__hint">{hint}</p> : null}
    </article>
  );
}
