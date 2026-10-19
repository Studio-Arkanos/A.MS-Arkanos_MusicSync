import { useReducer, useState } from 'react';
import type { FormEvent } from 'react';
import AmsNative from '../plugins/amsNative';
import { DEFAULT_LIBRARY_FOLDER } from '../config/app.config';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { HeartIcon, LibraryIcon, PauseIcon, PlayIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadLibraryState, saveLibraryState } from '../app/libraryState';
import { loadSettings, saveSettings } from '../app/settings';
import { playableFromLibrary } from '../modules/player/player';
import { favoriteFromLocal } from '../modules/favorites/favorites';
import type { LibraryState } from '../app/libraryState';

/**
 * Bibliothèque locale.
 *
 * Android 11+ : l’accès direct au chemin n’est pas garanti —
 * le dossier est choisi via le Storage Access Framework
 * (ACTION_OPEN_DOCUMENT_TREE), l’autorisation persiste.
 * Les versions antérieures acceptent le chemin direct.
 * Les morceaux sont reconnus par leur nom de fichier :
 * aucune métadonnée n’est requise.
 *
 * Lecture : chaque morceau local est jouable (MediaPlayer
 * natif) ; les favoris sont persistés localement.
 */
export function LibraryScreen() {
  const [folder, setFolder] = useState<string>(() => {
    const saved = loadSettings(services.storage).libraryFolder;
    return saved || DEFAULT_LIBRARY_FOLDER;
  });
  const [state, setState] = useState<LibraryState | null>(() =>
    loadLibraryState(services.storage),
  );
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, bumpFavorites] = useReducer((n: number) => n + 1, 0);
  // Affichage progressif : bibliothèques volumineuses
  // sur téléphones d'entrée de gamme.
  const [visibleCount, setVisibleCount] = useState(100);

  const onPickFolder = async () => {
    setError(null);
    try {
      const { uri } = await AmsNative.pickFolder();
      if (uri) {
        setFolder(uri);
        const settings = loadSettings(services.storage);
        saveSettings(services.storage, { ...settings, libraryFolder: uri });
        services.history.record('config_change', 'Dossier de bibliothèque choisi', uri);
      }
    } catch (pickError) {
      setError(
        `Sélection de dossier impossible : ${(pickError as Error).message}`,
      );
    }
  };

  const onScan = async (event: FormEvent) => {
    event.preventDefault();
    setScanning(true);
    setError(null);
    const result = await services.scanner.scan(folder);
    if (result.status === 'ok') {
      const next: LibraryState = {
        folder,
        scannedAt: result.scannedAt,
        count: result.files.length,
        errors: [],
        tracks: result.tracks.map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
        })),
      };
      saveLibraryState(services.storage, next);
      setState(next);
      services.history.record(
        'scan_attempt',
        'Bibliothèque analysée',
        `${next.count} fichier(s) audio`,
      );
    } else {
      setError(result.errors.join(' '));
      services.history.record('scan_attempt', 'Échec du scan local', result.errors[0]);
    }
    setScanning(false);
  };

  const favorites = services.favorites.list();
  const playable = state ? playableFromLibrary(state.tracks) : [];

  const playAll = () => {
    void services.player.playQueue(playable);
  };

  const playTrack = (trackId: string) => {
    const track = playable.find((candidate) => candidate.id === trackId);
    if (track) void services.player.play(track);
  };

  const onToggleFavorite = (track: { id: string; title: string; artist: string }) => {
    services.favorites.toggle(favoriteFromLocal(track));
    bumpFavorites();
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.library} />

      <section className="card">
        <h2 className="card__title">{fr.library.currentFolder}</h2>
        <p className="card__body folder-path">{folder}</p>
        <p className="card__muted">{fr.library.formats}</p>
        <div className="button-row">
          <button className="btn-secondary" type="button" onClick={onPickFolder}>
            {fr.library.chooseFolder}
          </button>
        </div>
      </section>

      <form onSubmit={onScan}>
        <button className="btn-primary" type="submit" disabled={scanning}>
          {scanning ? fr.library.scanning : fr.library.scan}
        </button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {state ? (
        <section className="card">
          <h2 className="card__title">{fr.library.scanDate}</h2>
          <p className="card__body">
            {state.scannedAt
              ? new Date(state.scannedAt).toLocaleString('fr-FR')
              : fr.home.never}
          </p>
          <p className="card__body">
            {fr.library.filesFound} : {state.count} ·{' '}
            {fr.library.audioFound} : {state.tracks.length}
          </p>
          {state.errors.length > 0 ? (
            <p className="card__muted">
              {fr.library.errors} : {state.errors.join(', ')}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Favoris de l'utilisateur (persistés en local) */}
      {favorites.length > 0 ? (
        <section className="card">
          <h2 className="card__title">{fr.player.favorites}</h2>
          <ul className="track-list">
            {favorites.map((favorite) => (
              <li className="track-row card" key={favorite.id}>
                <div className="track-row__body">
                  <p className="track-row__title">{favorite.title}</p>
                  <p className="track-row__artist">
                    {favorite.artist || fr.track.artist}
                  </p>
                  <p className="track-row__meta">
                    <span className="badge badge-muted">{favorite.source}</span>
                  </p>
                  <div className="track-row__actions">
                    {favorite.uri ? (
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() =>
                          void services.player.play({
                            id: favorite.id,
                            title: favorite.title,
                            artist: favorite.artist,
                            uri: favorite.uri!,
                            source:
                              favorite.source === 'downloaded' ? 'downloaded' : 'local',
                          })
                        }
                      >
                        {fr.player.play}
                      </button>
                    ) : null}
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => {
                        services.favorites.remove(favorite.id);
                        bumpFavorites();
                      }}
                    >
                      {fr.player.removeFavorite}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state && state.tracks.length > 0 ? (
        <>
          <div className="button-row">
            <button className="btn-primary" type="button" onClick={playAll}>
              {fr.player.playAll} ({state.tracks.length})
            </button>
          </div>
          <ul className="track-list">
            {state.tracks
              .slice(0, visibleCount)
              .map((track) => (
                <LibraryTrackRow
                  key={track.id}
                  track={track}
                  playing={
                    services.player.current?.id === track.id &&
                    services.player.state === 'playing'
                  }
                  isFavorite={services.favorites.isFavorite(track.id)}
                  onPlay={() => playTrack(track.id)}
                  onToggleFavorite={() => onToggleFavorite(track)}
                />
              ))}
          </ul>
          {visibleCount < state.tracks.length ? (
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setVisibleCount((count) => count + 100)}
            >
              {fr.library.showMore.replace(
                '{n}',
                String(state.tracks.length - visibleCount),
              )}
            </button>
          ) : null}
        </>
      ) : null}

      {!state ? (
        <EmptyState
          icon={<LibraryIcon size={40} />}
          title={fr.library.chooseFirst}
          description={fr.library.noMetadata}
        />
      ) : null}

      <p className="demo-notice">{fr.library.noMetadata}</p>
    </section>
  );
}

function LibraryTrackRow({
  track,
  playing,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: {
  track: { id: string; title: string; artist: string };
  playing: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <li className="track-row card">
      <button
        className="track-row__play"
        type="button"
        onClick={onPlay}
        aria-label={`${fr.player.play} ${track.title}`}
      >
        {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </button>
      <div className="track-row__body">
        <p className="track-row__title">{track.title}</p>
        <p className="track-row__artist">{track.artist}</p>
      </div>
      <button
        className={`track-row__heart${isFavorite ? ' track-row__heart--active' : ''}`}
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? fr.player.removeFavorite : fr.player.addFavorite
        }
      >
        <HeartIcon size={20} />
      </button>
    </li>
  );
}
