import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { MusicIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadPlaylistAnalysis } from '../app/playlistState';
import { loadLibraryState } from '../app/libraryState';

/**
 * Écran du morceau — ouvert depuis une notification
 * (correspondance incertaine / décision en attente).
 * L’utilisateur tranche : Déjà présent / Télécharger / Ignorer.
 */
export function TrackScreen() {
  const { ref = '' } = useParams<{ ref: string }>();
  const [resolved, setResolved] = useState(false);

  const analysis = loadPlaylistAnalysis(services.storage);
  const library = loadLibraryState(services.storage)?.tracks ?? [];
  const track = analysis?.tracks.find((item) => item.ref === ref) ?? null;

  const sourceId = analysis?.playlistId ?? '';
  const plan = track
    ? services.planner.plan([track], library, sourceId).plans[0]
    : null;

  useEffect(() => {
    if (!track) return;
    // Marque la route en attente comme lue (le deep link
    // a été consommé côté natif au démarrage).
    services.history.record(
      'app_start',
      'Ouverture depuis une notification',
      track.title,
    );
  }, [track]);

  if (!track || !plan) {
    return (
      <section className="screen">
        <ScreenHeader title={fr.track.title} />
        <EmptyState
          icon={<MusicIcon size={40} />}
          title={fr.track.unknown}
          description={fr.track.notFound}
        />
        <Link className="btn-secondary" to="/playlist">
          {fr.track.back}
        </Link>
      </section>
    );
  }

  const onDecide = (resolution: 'present' | 'download' | 'ignore') => {
    const pending = services.decisions
      .listPending()
      .find(
        (decision) =>
          decision.sourceId === sourceId && decision.trackRef === track.ref,
      );
    if (pending) {
      services.decisions.resolve(pending.id, resolution);
    } else {
      const created = services.decisions.create({
        sourceId,
        trackRef: track.ref,
        title: track.title,
        artist: track.artist,
        kind: 'uncertain_match',
        matchedLocalId: plan.matchedLocalId,
        score: plan.score,
      });
      services.decisions.resolve(created.id, resolution);
    }
    services.history.record('config_change', `Décision : ${resolution}`, track.title);
    setResolved(true);
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.track.title} />

      <section className="card">
        {track.thumbnailUrl ? (
          <img className="track-thumb track-thumb--large" src={track.thumbnailUrl} alt={fr.playlist.thumbnail} />
        ) : null}
        <h2 className="card__body">{track.title}</h2>
        <p className="card__muted">
          {track.artist || fr.track.artist}
        </p>
        <p className="card__muted">
          {fr.track.availability} : {fr.availability[track.availability]}
        </p>
        {plan.score !== undefined ? (
          <p className="card__muted">
            {fr.track.matchScore} : {Math.round(plan.score * 100)} %
          </p>
        ) : null}
        <p className="card__muted">
          {fr.playlist.source} : {track.source}
        </p>
      </section>

      {resolved ? (
        <div className="banner banner-info">{fr.playlist.decisionRecorded}</div>
      ) : (
        <section className="card">
          <h2 className="card__title">{fr.track.makeDecision}</h2>
          <div className="decision-actions decision-actions--column">
            <button className="btn-primary" type="button" onClick={() => onDecide('present')}>
              {fr.playlist.markPresent}
            </button>
            <button className="btn-primary" type="button" onClick={() => onDecide('download')}>
              {fr.playlist.authorizeDownload}
            </button>
            <button className="btn-secondary" type="button" onClick={() => onDecide('ignore')}>
              {fr.playlist.ignore}
            </button>
          </div>
        </section>
      )}

      <Link className="btn-secondary" to="/playlist">
        {fr.track.back}
      </Link>
    </section>
  );
}
