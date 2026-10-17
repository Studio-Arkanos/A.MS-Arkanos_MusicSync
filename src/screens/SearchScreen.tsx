import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import type { SearchResult } from '../domain/models';

/**
 * Recherche fédérée. À l'étape 1, aucun fournisseur n'est configuré :
 * l'écran l'affiche honnêtement au lieu de fabriquer des résultats.
 */
export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const providerCount = services.search.configured().length;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    services.search
      .searchAll(query)
      .then((found) => {
        setResults(found);
        setSearched(true);
      })
      .catch(() => {
        setResults([]);
        setSearched(true);
      });
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.search.title} subtitle={fr.search.upcoming} />

      <form className="search-form" onSubmit={onSubmit}>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={fr.search.placeholder}
          aria-label={fr.search.placeholder}
        />
        <button className="btn-secondary" type="submit">
          {fr.search.launch}
        </button>
      </form>

      {providerCount === 0 ? (
        <div className="banner banner-warning">
          <p>{fr.search.noProvider}</p>
        </div>
      ) : null}

      {searched && results.length === 0 && providerCount > 0 ? (
        <EmptyState icon={<SearchIcon size={40} />} title={fr.home.none} />
      ) : null}

      {results.length > 0 ? (
        <ul className="result-list">
          {results.map((result) => (
            <li className="card" key={`${result.providerId}-${result.title}-${result.artist}`}>
              <p className="card__body">
                {result.title} — {result.artist}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
