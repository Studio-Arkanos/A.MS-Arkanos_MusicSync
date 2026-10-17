/** En-tête d'écran. */
export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="screen-header">
      <h1 className="screen-header__title">{title}</h1>
      {subtitle ? <p className="screen-header__subtitle">{subtitle}</p> : null}
    </header>
  );
}
