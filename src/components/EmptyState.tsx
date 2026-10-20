import type { ReactNode } from 'react';

/** État vide — explique ce qui manque, sans rien simuler. */
export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-state__icon">{icon}</div> : null}
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
    </div>
  );
}
