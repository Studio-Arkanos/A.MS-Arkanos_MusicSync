import { useState } from 'react';
import type { FormEvent } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { APP, DEFAULT_LIBRARY_FOLDER, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadSettings, saveSettings } from '../app/settings';

/** Paramètres — les sections dépendantes des étapes suivantes sont désactivées. */
export function SettingsScreen() {
  const [settings, setSettings] = useState(() => loadSettings(services.storage));
  const [saved, setSaved] = useState(false);

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    saveSettings(services.storage, settings);
    setSaved(true);
    services.history.record('config_change', 'Paramètres enregistrés').catch(() => {});
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.settings} />

      <form className="card" onSubmit={onSave}>
        <h2 className="card__title">{fr.settings.youtubeApiKey}</h2>
        <p className="card__muted">{fr.settings.youtubeApiKeyHint}</p>
        <input
          className="input"
          type="password"
          value={settings.youtubeApiKey}
          onChange={(event) =>
            setSettings({ ...settings, youtubeApiKey: event.target.value })
          }
          placeholder="AIza…"
          aria-label={fr.settings.youtubeApiKey}
        />
        <div className="form-row">
          <label className="input-label" htmlFor="folder-input">
            {fr.settings.defaultFolder}
          </label>
          <input
            id="folder-input"
            className="input"
            value={settings.libraryFolder || DEFAULT_LIBRARY_FOLDER}
            onChange={(event) =>
              setSettings({ ...settings, libraryFolder: event.target.value })
            }
          />
        </div>
        <button className="btn-primary" type="submit">
          {fr.playlist.save}
        </button>
        {saved ? <p className="card__muted">{fr.settings.apiKeySaved}</p> : null}
      </form>

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
