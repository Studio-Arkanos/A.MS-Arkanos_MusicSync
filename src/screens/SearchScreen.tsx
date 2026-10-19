import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import AmsNative from '../plugins/amsNative';
import type { SearchResultItem } from '../modules/providers/types';
import type { MatchCandidate, MatchResult } from '../modules/duplicates/matcher';
import type { WatchlistEntry } from '../modules/watchlist/watchlist';
import { services } from '../app/services';
import { loadLibraryState } from '../app/libraryState';
import { loadSettings } from '../app/settings';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchIcon } from '../components/icons';
import { fr } from '../i18n/fr';

type ProviderFilter = 'all' | 'jamendo' | 'youtube';

/** Libellé de disponibilité (liste de suivi). */
function availabilityLabel(entry: WatchlistEntry): string {
  if (entry.availability === 'unchecked') {
    return fr.search.availabilityUnchecked;
  }
  return fr.availability[entry.availability];
}

/**
 * Centre de recherche musicale (étape 3).
 *
 * - saisie libre (titre, artiste, album, mots-clés) ;
 * - import d'URL vérifié (jamais de contournement) ;
 * - recherche fédérée sur les fournisseurs configurés ;
 * - filtres par fournisseur et par téléchargeabilité ;
 * - chargement progressif (pagination par jetons) ;
 * - aucun résultat n'est jamais fabriqué.
 */
export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [continuations, setContinuations] = useState<
    Map<string, string | undefined>
  >(new Map());
  const [errors, setErrors] = useState<Array<{ providerId: string; error: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [downloadableOnly, setDownloadableOnly] = useState(false);
  const [matches, setMatches] = useState<Map<string, MatchResult>>(new Map());
  const [excludedRefs, setExcludedRefs] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState(services.watchlist.list());
  const [library] = useState<MatchCandidate[]>(
    () => loadLibraryState(services.storage)?.tracks ?? [],
  );

  const configuredProviders = services.providers.searchProvidersList().filter(
    (provider) => provider.isConfigured(),
  );

  const doSearch = useCallback(
    async (reset: boolean) => {
      if (!query.trim()) return;
      setSearching(true);
      setImportError(null);
      const page = await services.providers.searchPage(
        query,
        reset ? new Map() : continuations,
        {
          providerIds:
            providerFilter === 'all'
              ? undefined
              : [providerFilter],
          downloadableOnly,
        },
      );
      setItems((previous) => (reset ? page.items : [...previous, ...page.items]));
      setContinuations(page.nextTokens);
      setErrors(page.errors);
      setHasMore(page.nextTokens.size > 0);
      setSearching(false);
    },
    [query, providerFilter, downloadableOnly, continuations],
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    void doSearch(true);
  };

  const onLoadMore = () => {
    void doSearch(false);
  };

  /** Comparaison réelle avec la bibliothèque locale. */
  const onCompare = (item: SearchResultItem) => {
    const result = services.matcher.match(
      { title: item.title, artist: item.artist },
      library,
    );
    setMatches((previous) => new Map(previous).set(item.ref, result));
  };

  const onExclude = (item: SearchResultItem) => {
    services.exclusionStore.exclude('search', item.ref, {
      title: item.title,
      artist: item.artist,
    });
    setExcludedRefs((previous) => new Set(previous).add(item.ref));
    services.history
      .record('config_change', 'Résultat exclu', `${item.title} — ${item.providerId}`)
      .catch(() => {});
    setNotice(fr.search.excludedNote);
  };

  const onRestore = (item: SearchResultItem) => {
    services.exclusionStore.include('search', item.ref);
    setExcludedRefs((previous) => {
      const next = new Set(previous);
      next.delete(item.ref);
      return next;
    });
    setNotice(fr.search.restoredNote);
  };

  const onFollow = (item: SearchResultItem) => {
    services.watchlist.add({
      ref: item.ref,
      providerId: item.providerId,
      title: item.title,
      artist: item.artist,
      thumbnailUrl: item.thumbnailUrl,
      sourceUrl: item.sourceUrl,
    });
    setWatchlist(services.watchlist.list());
    setNotice(fr.search.followed);
  };

  const onUnfollow = (ref: string) => {
    services.watchlist.remove(ref);
    setWatchlist(services.watchlist.list());
    setNotice(fr.search.unfollowed);
  };

  const onRefreshAvailability = async () => {
    const youtube = services.youtubeSearch;
    const updated = await services.watchlist.refreshAvailability(
      async (refs) => youtube.checkAvailability(refs),
    );
    setWatchlist(services.watchlist.list());
    setNotice(`${updated} disponibilité(s) actualisée(s).`);
  };

  const onImportUrl = async (event: FormEvent) => {
    event.preventDefault();
    setImportError(null);
    const folder = loadSettings(services.storage).downloadFolderUri;
    const outcome = await services.urlImport.importUrl(
      url,
      folder || undefined,
    );
    switch (outcome.status) {
      case 'queued':
        setNotice(
          fr.search.importQueued.replace('{name}', outcome.task.displayName),
        );
        setUrl('');
        break;
      case 'open_only':
        await AmsNative.openUrl({ url: outcome.url });
        setNotice(
          fr.search.importOpenOnly.replace('{reason}', outcome.reason),
        );
        break;
      case 'refused':
        setImportError(fr.search.importRefused.replace('{reason}', outcome.reason));
        break;
      case 'error':
        setImportError(fr.search.importError.replace('{reason}', outcome.reason));
        break;
    }
  };

  const visibleItems = items.filter((item) => {
    if (providerFilter !== 'all' && item.providerId !== providerFilter) {
      return false;
    }
    if (downloadableOnly && !item.downloadable) return false;
    return true;
  });

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.search} />

      {/* Recherche par mots-clés */}
      <form className="search-form" onSubmit={onSearch}>
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={fr.search.placeholder}
          aria-label={fr.search.placeholder}
        />
        <button className="btn-primary" type="submit" disabled={searching}>
          {searching ? fr.search.searching : fr.search.launch}
        </button>
      </form>

      {/* Import d'URL */}
      <form className="search-form" onSubmit={onImportUrl}>
        <input
          className="input"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={fr.search.urlPlaceholder}
          aria-label={fr.search.urlImport}
        />
        <button className="btn-secondary" type="submit">
          {fr.search.import}
        </button>
      </form>

      {/* Filtres */}
      <div className="filter-tabs" role="tablist">
        {(
          [
            ['all', fr.search.allProviders],
            ['jamendo', fr.providers.jamendo],
            ['youtube', fr.providers.youtube],
          ] as Array<[ProviderFilter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={providerFilter === key}
            className={`filter-tab${providerFilter === key ? ' filter-tab--active' : ''}`}
            onClick={() => setProviderFilter(key)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={downloadableOnly}
          className={`filter-tab${downloadableOnly ? ' filter-tab--active' : ''}`}
          onClick={() => setDownloadableOnly((value) => !value)}
        >
          {fr.search.downloadableOnly}
        </button>
      </div>

      {importError ? <div className="banner banner-error">{importError}</div> : null}
      {notice ? <div className="banner banner-info">{notice}</div> : null}

      {configuredProviders.length === 0 ? (
        <div className="banner banner-warning">
          <p>{fr.search.noProvider}</p>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="banner banner-error">
          <strong>{fr.search.errors}</strong>
          {errors.map((error) => (
            <p key={error.providerId}>
              {error.providerId} : {error.error}
            </p>
          ))}
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <>
          <p className="screen__muted">
            {fr.search.resultsFor.replace('{q}', query)} — {visibleItems.length}
          </p>
          <ul className="track-list">
            {visibleItems.map((item) => (
              <ResultRow
                key={`${item.providerId}-${item.ref}`}
                item={item}
                match={matches.get(item.ref)}
                excluded={excludedRefs.has(item.ref) ||
                  services.exclusionStore.isExcluded('search', item.ref)}
                followed={watchlist.some(
                  (entry) => entry.providerId === item.providerId && entry.ref === item.ref,
                )}
              onCompare={() => onCompare(item)}
              onExclude={() => onExclude(item)}
              onRestore={() => onRestore(item)}
              onFollow={() => onFollow(item)}
              onUnfollow={() => onUnfollow(item.ref)}
            />
            ))}
          </ul>
          {hasMore ? (
            <button className="btn-secondary" type="button" onClick={onLoadMore}>
              {fr.search.loadMore}
            </button>
          ) : (
            <p className="screen__muted">{fr.search.noMore}</p>
          )}
        </>
      ) : null}

      {!searching && visibleItems.length === 0 && configuredProviders.length > 0 ? (
        <EmptyState
          icon={<SearchIcon size={40} />}
          title={fr.search.results}
          description={fr.search.noProvider}
        />
      ) : null}

      {/* Liste de suivi */}
      <section className="card">
        <h2 className="card__title">{fr.search.watchlist}</h2>
        <div className="button-row">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => void onRefreshAvailability()}
          >
            {fr.search.refreshAvailability}
          </button>
        </div>
        {watchlist.length === 0 ? (
          <p className="card__muted">{fr.search.watchlistEmpty}</p>
        ) : (
          <ul className="result-list">
            {watchlist.map((entry) => (
              <li className="card" key={`${entry.providerId}-${entry.ref}`}>
                <p className="card__body">
                  {entry.title} — {entry.artist}
                </p>
                <p className="card__muted">
          {entry.providerId} · {fr.search.availability} :{' '}
          {availabilityLabel(entry)}
                </p>
                <div className="track-row__actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => void AmsNative.openUrl({ url: entry.sourceUrl })}
                  >
                    {fr.search.openSource}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => onUnfollow(entry.ref)}
                  >
                    {fr.search.unfollow}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function ResultRow({
  item,
  match,
  excluded,
  followed,
  onCompare,
  onExclude,
  onRestore,
  onFollow,
  onUnfollow,
}: {
  item: SearchResultItem;
  match?: MatchResult;
  excluded: boolean;
  followed: boolean;
  onCompare: () => void;
  onExclude: () => void;
  onRestore: () => void;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const downloadProvider = item.downloadable
    ? services.providers.getDownloadProvider(item.providerId)
    : undefined;

  const onDownload = async () => {
    if (!downloadProvider) return;
    const request = await downloadProvider.getDownloadRequest(item);
    const folder = loadSettings(services.storage).downloadFolderUri;
    await services.downloadEngine.enqueue(
      {
        providerId: item.providerId,
        trackRef: item.ref,
        title: item.title,
        artist: item.artist,
        sourceUrl: item.sourceUrl,
        fileUrl: request.url,
        displayName: request.displayName,
        license: request.license,
      },
      folder || undefined,
    );
  };

  const onOpenSource = () => {
    void AmsNative.openUrl({ url: item.sourceUrl });
  };

  return (
    <li className="track-row card">
        {item.thumbnailUrl ? (
        <img
          className="track-thumb"
          src={item.thumbnailUrl}
          alt={fr.search.thumbnail}
          loading="lazy"
        />
      ) : (
        <span className="track-thumb track-thumb--empty" aria-hidden="true" />
      )}
      <div className="track-row__body">
        <p className="track-row__title">{item.title}</p>
        <p className="track-row__artist">
          {[item.artist, item.album].filter(Boolean).join(' — ') || fr.track.artist}
        </p>
        <p className="track-row__meta">
          <span className="badge">{item.providerId}</span>
          <span className="badge">{fr.search.type} : {item.type}</span>
          {item.durationMs ? (
            <span className="badge">
              {fr.search.duration} : {Math.round(item.durationMs / 1000)} s
            </span>
          ) : null}
          {item.license ? (
            <span className="badge">{fr.search.license} : {item.license}</span>
          ) : null}
          <span className={`badge ${item.downloadable ? 'badge-present' : 'badge-muted'}`}>
            {item.downloadable ? fr.search.downloadable : fr.search.readOnly}
          </span>
          {match ? (
            <span className={`badge badge-${match.state}`}>
              {fr.search.compareResult.replace('{state}', fr.match[match.state])}
            </span>
          ) : null}
          {excluded ? <span className="badge badge-excluded">{fr.match.excluded}</span> : null}
        </p>

        <div className="decision-actions">
          {item.downloadable && downloadProvider && !excluded ? (
            <button className="btn-primary" type="button" onClick={() => void onDownload()}>
              {fr.search.download}
            </button>
          ) : (
            <button className="btn-secondary" type="button" onClick={onOpenSource}>
              {fr.search.openSource}
            </button>
          )}
          <button className="btn-secondary" type="button" onClick={onCompare}>
            {fr.search.compare}
          </button>
          {excluded ? (
            <button className="btn-secondary" type="button" onClick={onRestore}>
              {fr.playlist.restore}
            </button>
          ) : (
            <button className="btn-secondary" type="button" onClick={onExclude}>
              {fr.search.exclude}
            </button>
          )}
          {item.providerId === 'youtube' ? (
            followed ? (
              <button className="btn-secondary" type="button" onClick={onUnfollow}>
                {fr.search.unfollow}
              </button>
            ) : (
              <button className="btn-secondary" type="button" onClick={onFollow}>
                {fr.search.follow}
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
