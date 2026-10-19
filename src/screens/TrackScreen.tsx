import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AmsNative from '../plugins/amsNative';
import type { AssociationCandidate } from '../modules/association/association';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import { loadPlaylistAnalysis } from '../app/playlistState';
import { loadSettings } from '../app/settings';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { MusicIcon } from '../components/icons';
import { fr } from '../i18n/fr';

/**
 * Écran du morceau — ouvert depuis une notification
 * (correspondance incertaine) ou depuis la playlist.
 * L'utilisateur tranche : « Déjà présent »,
 * « Autoriser le téléchargement » ou « Ignorer ».
 * Association : recherche de versions téléchargeables
 * autorisées (Jamendo), comparaison bibliothèque,
 * confirmations explicites.
 */
export function TrackScreen() {
  const { ref = '' } = useParams<{ ref: string }>();
  const [resolved, setResolved] = useState(false);
  const [candidates, setCandidates] = useState<AssociationCandidate[] | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const analysis = loadPlaylistAnalysis(services.storage);
  const library = loadLibraryState(services.storage)?.tracks ?? [];
  const track = analysis?.tracks.find((item) => item.ref === ref) ?? null;

  const sourceId = analysis?.playlistId ?? '';
  const plan = track
    ? services.planner.plan([track], library, sourceId).plans[0]
    : null;

  useEffect(() => {
    if (!track) return;
    // Marque la route en attente comme lue (le deep-link
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

  /** Recherche de versions téléchargeables autorisées. */
  const onFindVersions = async () => {
    setSearching(true);
    const found = await services.association.findDownloadableVersions(
      { title: track.title, artist: track.artist },
      library,
      sourceId,
      track.ref,
    );
    setCandidates(found);
    setSearching(false);
  };

  const onDownloadCandidate = async (candidate: AssociationCandidate) => {
    // Correspondance incertaine : confirmation explicite.
    if (candidate.matchState === 'uncertain') {
      const confirmed = window.confirm(fr.track.confirmUncertain);
      if (!confirmed) return;
    }
    const provider = services.providers.getDownloadProvider(
      candidate.item.providerId,
    );
    if (!provider || !candidate.item.downloadUrl) return;

    const request = await provider.getDownloadRequest(candidate.item);
    const folder = loadSettings(services.storage).downloadFolderUri;
    await services.downloadEngine.enqueue(
      {
        providerId: candidate.item.providerId,
        trackRef: candidate.item.ref,
        title: candidate.item.title,
        artist: candidate.item.artist,
        sourceUrl: candidate.item.sourceUrl,
        fileUrl: request.url,
        displayName: request.displayName,
        license: request.license,
      },
      folder || undefined,
    );
    services.history.record(
      'sync_attempt',
      'Téléchargement autorisé en file',
      candidate.item.title,
    );
    setNotice(fr.track.queued);
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.track.title} />

      <section className="card">
        {track.thumbnailUrl ? (
          <img
            className="track-thumb track-thumb--large"
            src={track.thumbnailUrl}
            alt={fr.playlist.thumbnail}
          />
        ) : null}
        <h2 className="card__body">{track.title}</h2>
        <p className="card__muted">{track.artist || fr.track.artist}</p>
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

      {/* Association : versions téléchargeables autorisées */}
      <section className="card">
        <h2 className="card__title">{fr.track.findVersion}</h2>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => void onFindVersions()}
          disabled={searching}
        >
          {searching ? fr.track.finding : fr.track.findVersion}
        </button>

        {candidates && candidates.length === 0 ? (
          <p className="card__muted">{fr.track.candidatesNone}</p>
        ) : null}

        {candidates && candidates.length > 0 ? (
          <ul className="result-list">
            {candidates.map((candidate) => (
              <li className="card" key={candidate.item.ref}>
                <p className="card__body">
                  {candidate.item.title} — {candidate.item.artist}
                </p>
                <p className="card__muted">
                  {fr.track.provider} : {candidate.item.providerId} ·{' '}
                  {fr.search.compareResult.replace('{state}', fr.match[candidate.matchState])}
                  {candidate.score > 0 ? ` (${Math.round(candidate.score * 100)} %)` : ''}
                </p>
                {candidate.item.license ? (
                  <p className="card__muted">
                    {fr.search.license} : {candidate.item.license}
                  </p>
                ) : null}
                <p className="card__muted">{candidate.reason}</p>
                {candidate.excluded ? (
                  <span className="badge badge-excluded">{fr.track.excludedNote}</span>
                ) : null}
                <div className="decision-actions">
                  {candidate.eligible && candidate.item.downloadable ? (
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={() => void onDownloadCandidate(candidate)}
                    >
                      {fr.track.queueDownload}
                    </button>
                  ) : null}
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() =>
                      void AmsNative.openUrl({ url: candidate.item.sourceUrl })
                    }
                  >
                    {fr.search.openSource}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {notice ? <div className="banner banner-info">{notice}</div> : null}

      <Link className="btn-secondary" to="/playlist">
        {fr.track.back}
      </Link>
    </section>
  );
}
