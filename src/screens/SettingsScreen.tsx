import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { APP, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';

/** Paramètres — les sections dépendantes des étapes suivantes sont désactivées. */
export function SettingsScreen() {
  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.settings} />

      <section className="card">
        <h2 className="card__title">{fr.settings.appId}</h2>
        <p className="card__body">{APP.androidAppId}</p>
        <p className="card__muted">
          {fr.settings.version} : {APP.version} · {fr.settings.languageValue}
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.settings.language}</h2>
        <p className="card__body">{fr.settings.languageValue}</p>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.settings.theme}</h2>
        <p className="card__body">{fr.settings.themeValue}</p>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.settings.providers}</h2>
        <p className="card__muted">{fr.settings.providersNote}</p>
        <StatusBadge status={FEATURES.searchProviders.status} />
      </section>

      <section className="card">
        <h2 className="card__title">{fr.settings.sync}</h2>
        <p className="card__muted">{fr.settings.syncNote}</p>
        <StatusBadge status={FEATURES.syncEngine.status} />
      </section>
    </section>
  );
}
