import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AmsNative from '../plugins/amsNative';
import {
  DEFAULT_PLAYLIST,
  parseLocalPlaylist,
  type PlaylistAnalysis,
  type PlaylistConfig,
} from '../modules/playlist/playlist';
import type { SyncSummary, TrackPlan } from '../modules/sync/planner';
import type { MatchCandidate } from '../modules/duplicates/matcher';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import {
  loadPlaylistAnalysis,
  loadPlaylistConfig,
  savePlaylistAnalysis,
  savePlaylistConfig,
} from '../app/playlistState';
import { loadSettings } from '../app/settings';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { PlaylistIcon, SearchIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { resolvePlayableTracks } from '../modules/player/player';
import type { Filter, FilterKey } from '../components/playlistFilters';

/**
 * Playlist : analyse réelle (YouTube Data API v3 officielle),
 * consultation morceau par morceau, sélections, exclusions
 * manuelles persistantes, décisions sur correspondances
 * incertaines.
 *
 * Règles d'or :
 *  - une exclusion ne supprime JAMAIS la chanson de la
 *    playlist source ; elle reste visible, statut « Exclu » ;
 *  - une erreur d'analyse n'est jamais confondue avec une
 *    playlist vide ;
 *  - aucun téléchargement n'est lancé ici (moteur étape 3).
 */
export function PlaylistScreen() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PlaylistConfig>(() =>
    loadPlaylistConfig(services.storage, DEFAULT_PLAYLIST),
  );
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(() =>
    loadPlaylistAnalysis(services.storage),
  );
  const [library] = useState<MatchCandidate[]>(
    () => loadLibraryState(services.storage)?.tracks ?? [],
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // Playlists de l'utilisateur (persistées en local).
  const [playlistName, setPlaylistName] = useState('');
  const [, bumpPlaylists] = useReducer((n: number) => n + 1, 0);
  const userPlaylists = services.userPlaylists.list();

  const onCreatePlaylist = () => {
    const name = playlistName.trim();
    if (!name) return;
    services.userPlaylists.create(name);
    setPlaylistName('');
    setNotice(fr.player.playlistCreated);
    bumpPlaylists();
  };

  const onPlayUserPlaylist = (id: string) => {
    const playlist = services.userPlaylists.get(id);
    if (!playlist) return;
    const tracks = resolvePlayableTracks(
      playlist.trackIds,
      loadLibraryState(services.storage)?.tracks ?? [],
      services.downloadEngine.list(),
    );
    if (tracks.length === 0) {
      setNotice(fr.player.queueEmpty);
      return;
    }
    void services.player.playQueue(tracks);
  };

  const sourceId = analysis?.playlistId ?? config.sourceId;

  const recompute = useCallback(() => setRevision((n) => n + 1), []);

  // Plans recalculés à chaque changement (exclusions, décisions,
  // bibliothèque, ré-analyse).
  const [plans, setPlans] = useState<TrackPlan[]>([]);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  useEffect(() => {
    if (!analysis || analysis.status !== 'ok') {
      setPlans([]);
      setSummary(null);
      return;
    }
    const result = services.planner.plan(analysis.tracks, library, sourceId);
    setPlans(result.plans);
    setSummary(result.summary);
  }, [analysis, library, sourceId, revision]);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => filterMatches(filter, plan)),
    [plans, filter],
  );

  const onSaveConfig = () => {
    const cleaned: PlaylistConfig = {
      ...config,
      sourceId: config.url.match(/[?&]list=([A-Za-z0-9_-]+)/)?.[1] ?? config.url,
    };
    savePlaylistConfig(services.storage, cleaned);
    setConfig(cleaned);
    setNotice(fr.playlist.saved);
  };

  const onImportLocalPlaylist = async () => {
    setAnalyzing(true);
    setNotice(null);
    try {
      const { uri } = await AmsNative.pickFile();
      const { content } = await AmsNative.readTextFile({ uri });
      const result = parseLocalPlaylist(content);
      setAnalysis(result);
      savePlaylistAnalysis(services.storage, result);
      setNotice(result.status === 'ok'
        ? `Playlist locale importée : ${result.tracks.length} entrée(s).`
        : 'Playlist locale vide : aucune entrée trouvée.');
    } catch (error) {
      setNotice(`Import de playlist locale impossible : ${(error as Error).message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const onAnalyze = async () => {
    setAnalyzing(true);
    setNotice(null);
    const apiKey = loadSettings(services.storage).youtubeApiKey;
    const result = await services.playlistProvider.analyze(config, apiKey || undefined);
    setAnalysis(result);
    savePlaylistAnalysis(services.storage, result);
    // Identité stable de la nouvelle analyse.
    const analyzedSourceId = result.playlistId ?? config.sourceId;

    if (result.status === 'ok') {
      // Décisions en attente + notifications pour les
      // correspondances incertaines.
      const planned = services.planner.plan(result.tracks, library, analyzedSourceId);
      for (const plan of planned.plans) {
        if (plan.matchState !== 'uncertain') continue;
        services.decisions.create({
          sourceId: analyzedSourceId,
          trackRef: plan.track.ref,
          title: plan.track.title,
          artist: plan.track.artist,
          kind: 'uncertain_match',
          matchedLocalId: plan.matchedLocalId,
          score: plan.score,
        });
        const notification = await services.notifications.notify({
          title: fr.playlist.uncertain,
          body: `${plan.track.title} — ${plan.track.artist || fr.track.artist}`,
          route: `/track/${plan.track.ref}`,
          trackRef: plan.track.ref,
        });
        // Jamais de notification « envoyée » si elle ne l'est pas.
        if (notification.delivered) {
          services.history.record(
            'sync_attempt',
            'Notification de décision envoyée',
            plan.track.title,
          );
        }
      }
      setNotice(
        fr.playlist.analysisReady.replace('{n}', String(result.tracks.length)),
      );
      services.history.record(
        'scan_attempt',
        'Playlist analysée',
        `${result.tracks.length} morceau(s) — ${config.name}`,
      );
    } else {
      setNotice(
        fr.playlist.analysisError.replace(
          '{detail}',
          result.errors[0] ?? fr.playlist.errorTitle,
        ),
      );
      services.history.record(
        'sync_error',
        'Échec d’analyse de playlist',
        result.errors[0],
      );
    }
    recompute();
    setAnalyzing(false);
  };

  const onExclude = (plan: TrackPlan) => {
    services.exclusionStore.exclude(sourceId, plan.track.ref, {
      title: plan.track.title,
      artist: plan.track.artist,
    });
    services.history.record(
      'config_change',
      'Morceau exclu',
      plan.track.title,
    );
    recompute();
  };

  const onRestore = (plan: TrackPlan) => {
    services.exclusionStore.include(sourceId, plan.track.ref);
    services.history.record(
      'config_change',
      'Morceau réintégré',
      plan.track.title,
    );
    recompute();
  };

  const onExcludeSelected = () => {
    const refs = plans
      .filter((plan) => selected.has(plan.track.ref))
      .map((plan) => ({
        ref: plan.track.ref,
        title: plan.track.title,
        artist: plan.track.artist,
      }));
    services.exclusionStore.excludeMany(sourceId, refs);
    setSelected(new Set());
    recompute();
  };

  const onRestoreSelected = () => {
    const refs = plans
      .filter((plan) => selected.has(plan.track.ref))
      .map((plan) => plan.track.ref);
    services.exclusionStore.includeMany(sourceId, refs);
    setSelected(new Set());
    recompute();
  };

  const onResetExclusions = () => {
    if (!window.confirm(fr.playlist.confirmReset)) return;
    services.exclusionStore.clearAll(sourceId);
    recompute();
  };

  const toggle = (ref: string) => {
    const next = new Set(selected);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    setSelected(next);
  };

  const allVisibleSelected =
    visiblePlans.length > 0 && visiblePlans.every((plan) => selected.has(plan.track.ref));

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.playlist} subtitle={fr.playlist.content} />

      {/* Playlists de l'utilisateur */}
      <section className="card">
        <h2 className="card__title">{fr.player.myPlaylists}</h2>
        <div className="playlist-create">
          <input
            className="input"
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            placeholder={fr.player.playlistName}
            aria-label={fr.player.playlistName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCreatePlaylist();
            }}
          />
          <button
            className="btn-secondary"
            type="button"
            onClick={onCreatePlaylist}
            disabled={!playlistName.trim()}
          >
            {fr.player.create}
          </button>
        </div>
        {userPlaylists.length > 0 ? (
          <ul className="track-list">
            {userPlaylists.map((playlist) => (
              <li className="track-row card" key={playlist.id}>
                <div className="track-row__body">
                  <p className="track-row__title">{playlist.name}</p>
                  <p className="track-row__artist">
                    {fr.player.tracksCount.replace('{n}', String(playlist.trackIds.length))}
                  </p>
                  <div className="track-row__actions">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => onPlayUserPlaylist(playlist.id)}
                      disabled={playlist.trackIds.length === 0}
                    >
                      {fr.player.play}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => {
                        const next = window.prompt(fr.player.rename, playlist.name);
                        if (next && next.trim()) {
                          services.userPlaylists.rename(playlist.id, next);
                          setNotice(fr.player.playlistRenamed);
                          bumpPlaylists();
                        }
                      }}
                    >
                      {fr.player.rename}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => {
                        if (window.confirm(fr.common.confirmDelete)) {
                          services.userPlaylists.remove(playlist.id);
                          setNotice(fr.player.playlistDeleted);
                          bumpPlaylists();
                        }
                      }}
                    >
                      {fr.player.delete}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card__muted">{fr.player.emptyPlaylists}</p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">{fr.playlist.name}</h2>
        <input
          className="input"
          value={config.name}
          onChange={(event) => setConfig({ ...config, name: event.target.value })}
          aria-label={fr.playlist.name}
        />
        <h2 className="card__title">{fr.playlist.url}</h2>
        <input
          className="input"
          value={config.url}
          onChange={(event) => setConfig({ ...config, url: event.target.value })}
          aria-label={fr.playlist.url}
        />
        <div className="button-row">
          <button className="btn-secondary" type="button" onClick={onSaveConfig}>
            {fr.playlist.save}
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            {analyzing ? fr.playlist.analyzing : fr.playlist.analyze}
          </button>
          <button className="btn-secondary" type="button" onClick={() => void onImportLocalPlaylist()} disabled={analyzing}>
            Importer une playlist locale (M3U/PLS/TXT)
          </button>
        </div>
      </section>

      {notice ? <div className="banner banner-info">{notice}</div> : null}

      {!analysis ? (
        <EmptyState
          icon={<PlaylistIcon size={40} />}
          title={fr.playlist.empty}
          description={fr.playlist.emptyHint}
        />
      ) : null}

      {analysis && analysis.status !== 'ok' ? (
        <div className="banner banner-error">
          <strong>{fr.playlist.errorTitle}</strong>
          <p>
            {analysis.status === 'not_configured'
              ? fr.playlist.notConfigured
              : analysis.status === 'empty'
                ? fr.playlist.emptyPlaylist
                : analysis.status === 'unavailable'
                  ? fr.playlist.unavailableBanner
                  : (analysis.errors[0] ?? fr.playlist.errorTitle)}
          </p>
        </div>
      ) : null}

      {summary ? (
        <section className="card">
          <h2 className="card__title">{fr.playlist.summary}</h2>
          <div className="summary-grid">
            <span>{fr.playlist.found} : {summary.found}</span>
            <span>{fr.playlist.present} : {summary.present}</span>
            <span>{fr.playlist.absent} : {summary.absent}</span>
            <span>{fr.playlist.uncertain} : {summary.uncertain}</span>
            <span>{fr.playlist.excluded} : {summary.excluded}</span>
            <span>{fr.playlist.unavailable} : {summary.unavailable}</span>
            <span className="summary-candidates">
              {fr.playlist.candidates} : {summary.candidates}
            </span>
          </div>
        </section>
      ) : null}

      {plans.length > 0 ? (
        <>
          <div className="filter-tabs" role="tablist">
            {(
              [
                ['all', fr.playlist.filterAll],
                ['present', fr.playlist.filterPresent],
                ['absent', fr.playlist.filterAbsent],
                ['uncertain', fr.playlist.filterUncertain],
                ['excluded', fr.playlist.filterExcluded],
                ['unavailable', fr.playlist.filterUnavailable],
              ] as Array<[FilterKey, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`filter-tab${filter === key ? ' filter-tab--active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="button-row">
            <button
              className="btn-secondary"
              type="button"
              onClick={() =>
                setSelected(
                  allVisibleSelected
                    ? new Set()
                    : new Set(visiblePlans.map((plan) => plan.track.ref)),
                )
              }
            >
              {allVisibleSelected ? fr.playlist.deselectAll : fr.playlist.selectAll}
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={selected.size === 0}
              onClick={onExcludeSelected}
            >
              {fr.playlist.excludeSelected} ({selected.size})
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={selected.size === 0}
              onClick={onRestoreSelected}
            >
              {fr.playlist.restoreSelected} ({selected.size})
            </button>
          </div>

          <div className="button-row">
            <button className="btn-secondary" type="button" onClick={onResetExclusions}>
              {fr.playlist.resetExclusions}
            </button>
          </div>

          <p className="demo-notice">{fr.playlist.excludedNote}</p>

          <ul className="track-list">
            {visiblePlans.map((plan) => (
              <TrackRow
                key={plan.track.ref}
                plan={plan}
                selected={selected.has(plan.track.ref)}
                onToggle={() => toggle(plan.track.ref)}
                onExclude={() => onExclude(plan)}
                onRestore={() => onRestore(plan)}
                onDecide={(resolution) => onDecide(plan, resolution)}
                onFindVersion={() => navigate(`/track/${plan.track.ref}`)}
              />
            ))}
          </ul>
        </>
      ) : null}

      {plans.length === 0 && analysis?.status === 'ok' ? (
        <EmptyState icon={<SearchIcon size={40} />} title={fr.playlist.emptyPlaylist} />
      ) : null}

      <ProgressBar percent={analyzing ? 50 : 0} label={fr.playlist.analyzing} />
    </section>
  );

  /** Décision utilisateur sur une correspondance incertaine. */
  function onDecide(plan: TrackPlan, resolution: 'present' | 'download' | 'ignore') {
    const pending = services.decisions
      .listPending()
      .find(
        (decision) =>
          decision.sourceId === sourceId && decision.trackRef === plan.track.ref,
      );
    if (pending) {
      services.decisions.resolve(pending.id, resolution);
    } else {
      const created = services.decisions.create({
        sourceId,
        trackRef: plan.track.ref,
        title: plan.track.title,
        artist: plan.track.artist,
        kind: 'uncertain_match',
        matchedLocalId: plan.matchedLocalId,
        score: plan.score,
      });
      services.decisions.resolve(created.id, resolution);
    }
    services.history.record(
      'config_change',
      `Décision : ${resolution}`,
      plan.track.title,
    );
    setNotice(fr.playlist.decisionRecorded);
    recompute();
  }
}

function filterMatches(filter: Filter, plan: TrackPlan): boolean {
  switch (filter) {
    case 'excluded':
      return plan.excluded;
    case 'present':
      return plan.matchState === 'present';
    case 'absent':
      return plan.matchState === 'absent';
    case 'uncertain':
      return plan.matchState === 'uncertain';
    case 'unavailable':
      return plan.matchState === 'unavailable';
    case 'all':
    default:
      return true;
  }
}

function TrackRow({
  plan,
  selected,
  onToggle,
  onExclude,
  onRestore,
  onDecide,
  onFindVersion,
}: {
  plan: TrackPlan;
  selected: boolean;
  onToggle: () => void;
  onExclude: () => void;
  onRestore: () => void;
  onDecide: (resolution: 'present' | 'download' | 'ignore') => void;
  onFindVersion: () => void;
}) {
  const track = plan.track;
  return (
    <li className="track-row card">
      <label className="track-row__check">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${fr.common.select} ${track.title}`}
        />
      </label>

      {track.thumbnailUrl ? (
        <img
          className="track-thumb"
          src={track.thumbnailUrl}
          alt={fr.playlist.thumbnail}
          loading="lazy"
        />
      ) : (
        <span className="track-thumb track-thumb--empty" aria-hidden="true" />
      )}

      <div className="track-row__body">
        <p className="track-row__title">{track.title}</p>
        <p className="track-row__artist">
          {track.artist || fr.track.artist}
        </p>
        <p className="track-row__meta">
          <span className="badge">{fr.playlist.source} : {track.source}</span>
          <span className={`badge badge-${plan.matchState}`}>
            {fr.match[plan.matchState]}
          </span>
          {plan.excluded ? (
            <span className="badge badge-excluded">{fr.match.excluded}</span>
          ) : null}
          <span className="badge badge-muted">
            {fr.playlist.downloadStatus} : {fr.playlist.notDownloaded}
          </span>
        </p>
        {plan.score !== undefined && plan.matchState === 'uncertain' ? (
          <p className="track-row__score">
            {fr.track.matchScore} : {Math.round(plan.score * 100)} %
          </p>
        ) : null}

        {plan.matchState === 'uncertain' && !plan.excluded ? (
          <div className="decision-actions">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onDecide('present')}
            >
              {fr.playlist.markPresent}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onDecide('download')}
            >
              {fr.playlist.authorizeDownload}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onDecide('ignore')}
            >
              {fr.playlist.ignore}
            </button>
          </div>
        ) : null}

        <div className="track-row__actions">
          {plan.excluded ? (
            <button className="btn-secondary" type="button" onClick={onRestore}>
              {fr.playlist.restore}
            </button>
          ) : (
            <button className="btn-secondary" type="button" onClick={onExclude}>
              {fr.playlist.exclude}
            </button>
          )}
          {plan.matchState !== 'unavailable' && !plan.excluded ? (
            <button className="btn-secondary" type="button" onClick={onFindVersion}>
              {fr.track.findVersion}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
