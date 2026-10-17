import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { DownloadIcon } from '../components/icons';
import { fr } from '../i18n/fr';

export function DownloadsScreen() {
  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.downloads} />
      <EmptyState
        icon={<DownloadIcon size={40} />}
        title={fr.downloads.empty}
        description={fr.downloads.upcoming}
      />
    </section>
  );
}
