import { useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseIcon, PlayIcon, SkipNextIcon, SkipPreviousIcon } from './icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';

/**
 * Barre de lecture miniature — affichée dès qu'une
 * file existe, au-dessus de la navigation.
 * Ouvre l'écran du lecteur au toucher.
 */
export function MiniPlayer() {
  const navigate = useNavigate();
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => services.player.subscribe(bump), []);

  const player = services.player;
  const current = player.current;
  if (!current) return null;

  const playing = player.state === 'playing';

  return (
    <div className="mini-player" role="region" aria-label={fr.player.title}>
      <button
        className="mini-player__info"
        type="button"
        onClick={() => navigate('/player')}
        aria-label={`${fr.player.title} : ${current.title}`}
      >
        {current.thumbnailUrl ? (
          <img className="mini-player__thumb" src={current.thumbnailUrl} alt="" />
        ) : null}
        <span className="mini-player__text">
          <span className="mini-player__title">{current.title}</span>
          <span className="mini-player__artist">{current.artist}</span>
        </span>
      </button>
      <div className="mini-player__controls">
        <button
          className="mini-player__button"
          type="button"
          onClick={() => void player.previous()}
          aria-label={fr.player.previous}
        >
          <SkipPreviousIcon size={22} />
        </button>
        <button
          className="mini-player__button"
          type="button"
          onClick={() => void player.toggle()}
          aria-label={playing ? fr.player.pause : fr.player.play}
        >
          {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        </button>
        <button
          className="mini-player__button"
          type="button"
          onClick={() => void player.next()}
          aria-label={fr.player.next}
        >
          <SkipNextIcon size={22} />
        </button>
      </div>
    </div>
  );
}
