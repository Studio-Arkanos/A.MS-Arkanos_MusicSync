import { useState } from 'react';
import type { FormEvent } from 'react';
import AmsNative from '../plugins/amsNative';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { APP, DEFAULT_LIBRARY_FOLDER, FEATURES } from '../config/app.config';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import { loadSettings } from '../app/settings';

/** Paramètres — clés fournisseurs, dossiers, capacités réelles. */
export function SettingsScreen() {
  const [settings, setSettings] = useState(() => loadSettings(services.storage));
  const [saved, setSaved] = useState(false);
  const [downloadFolder, setDownloadFolder] = useState<string | null>(null);

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      ...settings,
      downloadFolderUri: downloadFolder ?? settings.downloadFolderUri,
    };
    services.settings.save(next);
    setSettings(next);
    setSaved(true);
    services.history.record('config_change', 'Paramètres enregistrés').catch(() => {});
  };

  const onPickDownloadFolder = async () => {
    try {
      const { uri } = await AmsNative.pickFolder();
      if (uri) setDownloadFolder(uri);
    } catch {
      // navigateur de développement : sans objet.
    }
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.settings} />

      <form className="card" onSubmit={onSave}>
        <h2 className="card__title">{fr.settings.providers}</h2>

        <label className="input-label" htmlFor="yt-key">
          {fr.settings.youtubeApiKey}
        </label>
        <input
          id="yt-key"
          className="input"
          type="password"
          value={settings.youtubeApiKey}
          onChange={(event) =>
            setSettings({ ...settings, youtubeApiKey: event.target.value })
          }
          placeholder="AIza…"
        />

        <label className="input-label" htmlFor="jamendo-key">
          {fr.settings.jamendoClientId}
        </label>
        <input
          id="jamendo-key"
          className="input"
          value={settings.jamendoClientId}
          onChange={(event) =>
            setSettings({ ...settings, jamendoClientId: event.target.value })
          }
          placeholder="client_id Jamendo"
        />
        <p className="card__muted">{fr.settings.jamendoHint}</p>

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

        <label className="input-label" htmlFor="dl-folder">
          {fr.settings.downloadFolder}
        </label>
        <div className="button-row">
          <input
            id="dl-folder"
            className="input"
            value={downloadFolder ?? settings.downloadFolderUri}
            readOnly
            placeholder={fr.settings.downloadFolderNote}
          />
          <button className="btn-secondary" type="button" onClick={() => void onPickDownloadFolder()}>
            {fr.settings.chooseFolder}
          </button>
        </div>
        <p className="card__muted">{fr.settings.downloadFolderNote}</p>

        <button className="btn-primary" type="submit">
          {fr.playlist.save}
        </button>
        {saved ? <p className="card__muted">{fr.settings.apiKeySaved}</p> : null}
      </form>

      <section className="card">
        <h2 className="card__title">{fr.settings.providersList}</h2>
        <p className="card__body">
          <strong>{fr.providers.jamendo}</strong>
          <br />
          {fr.providers.jamendoCaps}
        </p>
        <p className="card__body">
          <strong>{fr.providers.youtube}</strong>
          <br />
          {fr.providers.youtubeCaps}
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">{fr.settings.conversion}</h2>
        <p className="card__muted">{fr.settings.conversionNote}</p>
        <StatusBadge status="planned" />
      </section>

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
        <h2 className="card__title">{fr.settings.sync}</h2>
        <p className="card__muted">{fr.settings.syncNote}</p>
        <StatusBadge status={FEATURES.syncEngine.status} />
      </section>
    </section>
  );
}
