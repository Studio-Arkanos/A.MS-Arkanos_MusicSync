import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { LibraryIcon } from '../components/icons';
import { fr } from '../i18n/fr';
import { services } from '../app/services';
import type { ScanResult } from '../modules/scanner/scanner';

/**
 * Bibliothèque locale. Le scan natif n'est pas branché à l'étape 1 :
 * le bouton déclenche l'appel RÉEL, qui répond honnêtement
 « non opérationnel » — aucun faux morceau n'est affiché.
 */
export function LibraryScreen() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const onScan = (event: FormEvent) => {
    event.preventDefault();
    setScanning(true);
    services.scanner
      .scan()
      .then((result) => {
        setScan(result);
        setScanning(false);
      })
      .catch(() => {
        setScanning(false);
      });
  };

  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.library} />

      <form onSubmit={onScan}>
        <button className="btn-primary" type="submit" disabled={scanning}>
          {scanning ? '…' : fr.library.scan}
        </button>
      </form>

      {scan ? (
        <div className="banner banner-warning">
          <p>{scan.reason}</p>
        </div>
      ) : null}

      <p className="screen__muted">
        {fr.library.analyzed} : {scan?.tracks.length ?? 0}
      </p>

      {scan && scan.tracks.length === 0 ? (
        <EmptyState icon={<LibraryIcon size={40} />} title={fr.library.scanUnavailable} />
      ) : null}
    </section>
  );
}
