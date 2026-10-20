import { useEffect, useReducer, useState } from 'react';
import {
  formatDuration,
  type PlayableTrack,
} from '../modules/player/player';
import { favoriteFromLocal } from '../modules/favorites/favorites';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  HeartIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  SkipNextIcon,
  SkipPreviousIcon,
} from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';

/**
 * Lecteur (étape pré-4).
 *
 * Contrôles réels (MediaPlayer Android) : lecture/
 * pause, arrêt, avance rapide, morceau suivant/
 * précédent, favori, ajout à une playlist.
 *
 * Source lisible : fichiers locaux (bibliothèque
 * scannée) et téléchargements autorisés terminés.
 */
export function PlayerScreen() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [notice, setNotice] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState('');

  useEffect(() => services.player.subscribe(bump), []);

  const player = services.player;
  const current = player.current;

  const onToggleFavorite = () => {
    if (!current) return;
    const input = favoriteFromLocal(current);
    const added = services.favorites.toggle(input);
    setNotice(added ? fr.player.favoriteAdded : fr.player.favoriteRemoved);
    bump();
  };

  const onAddToPlaylist = () => {
    if (!current || !playlistId) return;
    const added = services.userPlaylists.addTrack(playlistId, current.id);
    if (added) setNotice(fr.player.playlistAdded);
    bump();
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.player.title} subtitle={fr.player.playLocalOnly} />

      {notice ? (
        <div className="banner banner-info" role="status">
          {notice}
        </div>
      ) : null}

      {!current ? (
        <EmptyState
          icon={<MusicIcon size={40} />}
          title={fr.player.nothing}
          description={fr.player.queueEmpty}
        />
      ) : (
        <PlayerBody
          track={current}
          state={player.state}
          positionMs={player.positionMs}
          durationMs={player.durationMs}
          playlistId={playlistId}
          playlists={services.userPlaylists.list()}
          isFavorite={services.favorites.isFavorite(current.id)}
          onToggle={() => void player.toggle()}
          onStop={() => void player.stop()}
          onNext={() => void player.next()}
          onPrevious={() => void player.previous()}
          onSeek={(ms) => void player.seekTo(ms)}
          onToggleFavorite={onToggleFavorite}
          onPlaylistChange={setPlaylistId}
          onAddToPlaylist={onAddToPlaylist}
        />
      )}
    </section>
  );
}

function PlayerBody({
  track,
  state,
  positionMs,
  durationMs,
  playlistId,
  playlists,
  isFavorite,
  onToggle,
  onStop,
  onNext,
  onPrevious,
  onSeek,
  onToggleFavorite,
  onPlaylistChange,
  onAddToPlaylist,
}: {
  track: PlayableTrack;
  state: string;
  positionMs: number;
  durationMs: number;
  playlistId: string;
  playlists: Array<{ id: string; name: string; trackIds: string[] }>;
  isFavorite: boolean;
  onToggle: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (ms: number) => void;
  onToggleFavorite: () => void;
  onPlaylistChange: (id: string) => void;
  onAddToPlaylist: () => void;
}) {
  const playing = state === 'playing';
  const errored = state === 'error';
  const effectiveDuration = durationMs > 0 ? durationMs : track.durationMs ?? 0;

  return (
    <>
      {errored ? <div className="banner banner-error">{fr.player.error}</div> : null}

      <section className="card player-card">
        {track.thumbnailUrl ? (
          <img className="track-thumb track-thumb--large" src={track.thumbnailUrl} alt="" />
        ) : (
          <span className="track-thumb track-thumb--empty track-thumb--large" aria-hidden="true">
            <MusicIcon size={40} />
          </span>
        )}
        <h2 className="player-card__title">{track.title}</h2>
        <p className="player-card__artist">{track.artist}</p>
        <p className="player-card__meta">
          <span className="badge">
            {track.source === 'local' ? fr.player.localSource : fr.player.downloadedSource}
          </span>
        </p>

        <input
          className="player-seek"
          type="range"
          min={0}
          max={effectiveDuration || 0}
          value={Math.min(positionMs, effectiveDuration || 0)}
          step={500}
          disabled={effectiveDuration <= 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label={fr.player.seek}
        />
        <p className="player-times">
          {formatDuration(positionMs)} {fr.player.of} {formatDuration(effectiveDuration)}
        </p>

        <div className="player-controls">
          <button className="player-button" type="button" onClick={onPrevious} aria-label={fr.player.previous}>
            <SkipPreviousIcon size={26} />
          </button>
          <button className="player-button player-button--main" type="button" onClick={onToggle} aria-label={playing ? fr.player.pause : fr.player.play}>
            {playing ? <PauseIcon size={34} /> : <PlayIcon size={34} />}
          </button>
          <button className="player-button" type="button" onClick={onNext} aria-label={fr.player.next}>
            <SkipNextIcon size={26} />
          </button>
        </div>

        <div className="button-row">
          <button className="btn-secondary" type="button" onClick={onStop}>
            {fr.player.stop}
          </button>
          <button
            className={`btn-secondary${isFavorite ? ' btn-secondary--active' : ''}`}
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
          >
            <HeartIcon size={18} />
            {isFavorite ? fr.player.removeFavorite : fr.player.addFavorite}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.player.addToPlaylist}</h2>
        {playlists.length > 0 ? (
          <select
            className="input"
            value={playlistId}
            onChange={(event) => onPlaylistChange(event.target.value)}
            aria-label={fr.player.myPlaylists}
          >
            <option value="">—</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="card__muted">{fr.player.emptyPlaylists}</p>
        )}
        <button
          className="btn-primary"
          type="button"
          disabled={!playlistId}
          onClick={onAddToPlaylist}
        >
          {fr.player.addToPlaylist}
        </button>
      </section>
    </>
  );
}
