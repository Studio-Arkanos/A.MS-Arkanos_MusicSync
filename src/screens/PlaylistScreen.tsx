import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { FEATURES } from '../config/app.config';
import { PlaylistIcon } from '../components/icons';
import { fr } from '../i18n/fr';

export function PlaylistScreen() {
  return (
    <section className="screen">
      <ScreenHeader title={fr.nav.playlist} />
      <EmptyState
        icon={<PlaylistIcon size={40} />}
        title={fr.playlist.empty}
        description={fr.playlist.upcoming}
      />
      <StatusBadge status={FEATURES.playlists?.status ?? 'planned'} />
    </section>
  );
}
