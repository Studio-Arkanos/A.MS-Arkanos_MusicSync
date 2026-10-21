import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export interface LoadingScreenProps {
  /** Message d'état courant affiché sous l'égaliseur. */
  message?: string;
  /** Durée minimale d'affichage en ms (défaut : 1400 ms pour savourer l'animation sans bloquer). */
  minDuration?: number;
  /** Callback invoqué dès que le chargement est terminé ou passé. */
  onFinish?: () => void;
  /** Permet à l'utilisateur d'ignorer l'écran immédiatement (défaut : true). */
  allowSkip?: boolean;
}

const DEFAULT_STAGES = [
  'Initialisation du moteur A.MS…',
  'Vérification du stockage et des dossiers SAF…',
  'Chargement de la bibliothèque et des métadonnées…',
  'Système prêt.',
];

/**
 * Écran de chargement immersif aux couleurs d'Arkanos Music Sync.
 * - Symbole officiel A.MS en lévitation avec halo orbital
 * - Ondes audio animées (effet égaliseur live)
 * - Typographie dorée électrique
 * - Barre de progression fluide et sortie en fondu
 */
export function LoadingScreen({
  message,
  minDuration = 1400,
  onFinish,
  allowSkip = true,
}: LoadingScreenProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    // Progression par paliers fluides
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1, elapsed / minDuration);
      setProgress(Math.round(15 + ratio * 85));

      const nextStage = Math.min(
        DEFAULT_STAGES.length - 1,
        Math.floor(ratio * DEFAULT_STAGES.length),
      );
      setStageIndex(nextStage);

      if (elapsed >= minDuration) {
        clearInterval(progressInterval);
        setClosing(true);
        setTimeout(() => {
          onFinish?.();
        }, 450); // durée de transition fondu
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [minDuration, onFinish]);

  const handleSkip = () => {
    setClosing(true);
    setTimeout(() => {
      onFinish?.();
    }, 200);
  };

  const displayMessage = message ?? DEFAULT_STAGES[stageIndex];

  return (
    <div
      className={`ams-splash ${closing ? 'ams-splash--closing' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Chargement de A.MS Arkanos Music Sync"
    >
      <div className="ams-splash__backdrop" aria-hidden="true" />

      <div className="ams-splash__center">
        {/* Conteneur emblème avec halo orbital */}
        <div className="ams-splash__emblem-container">
          <div className="ams-splash__orbit-glow" aria-hidden="true" />
          <div className="ams-splash__orbit-ring" aria-hidden="true" />
          <div className="ams-splash__emblem">
            <Logo size={110} variant="symbol" alt="Symbole officiel A.MS" />
          </div>
        </div>

        {/* Typographie de marque */}
        <div className="ams-splash__brand">
          <h1 className="ams-splash__title">A.MS</h1>
          <p className="ams-splash__subtitle">Arkanos Music Sync</p>
        </div>

        {/* Égaliseur audio animé (7 barres synchronisées) */}
        <div className="ams-splash__equalizer" aria-hidden="true">
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
          <span className="ams-splash__eq-bar" />
        </div>

        {/* Message d'état dynamique */}
        <p className="ams-splash__status">{displayMessage}</p>

        {/* Barre de progression fine */}
        <div className="ams-splash__progress-track" aria-hidden="true">
          <div
            className="ams-splash__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {allowSkip && (
        <button
          type="button"
          className="ams-splash__skip"
          onClick={handleSkip}
          aria-label="Passer l'animation de démarrage"
        >
          Passer l'animation
        </button>
      )}
    </div>
  );
}
