/** Barre de progression (largeur animée, légère). */
export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress">
      <div className="progress__track">
        <div
          className="progress__fill"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
      <span className="progress__value">{clamped} %</span>
    </div>
  );
}
