import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  DownloadIcon,
  HistoryIcon,
  HomeIcon,
  LibraryIcon,
  MusicIcon,
  PlaylistIcon,
  SearchIcon,
  SettingsIcon,
} from '../components/icons';
import { fr } from '../i18n/fr';
import AmsNative from '../plugins/amsNative';
import { MiniPlayer } from '../components/MiniPlayer';
import type { ComponentType } from 'react';
import type { IconProps } from '../components/icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
}

/** Navigation principale — 7 onglets, tactile (≥ 48 px). */
const NAV_ITEMS: NavItem[] = [
  { to: '/accueil', label: fr.nav.home, icon: HomeIcon },
  { to: '/playlist', label: fr.nav.playlist, icon: PlaylistIcon },
  { to: '/recherche', label: fr.nav.search, icon: SearchIcon },
  { to: '/bibliotheque', label: fr.nav.library, icon: LibraryIcon },
  { to: '/telechargements', label: fr.nav.downloads, icon: DownloadIcon },
  { to: '/historique', label: fr.nav.history, icon: HistoryIcon },
  { to: '/parametres', label: fr.nav.settings, icon: SettingsIcon },
];

export function MainTabs() {
  const navigate = useNavigate();  // Deep-link : une notification (correspondance incertaine)
  // ouvre l'écran du morceau concerné.
  useEffect(() => {
    AmsNative.getPendingRoute()
      .then(({ route }) => {
        if (route) navigate(route, { replace: true });
      })
      .catch(() => {
        // navigateur de développement : sans objet.
      });
  }, [navigate]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__logo">
          <MusicIcon size={20} />
        </span>
        <div className="app-header__titles">
          <span className="app-header__name">{fr.app.name}</span>
          <span className="app-header__fullname">{fr.app.fullName}</span>
        </div>
        <span className="app-header__badge">{fr.app.stepBadge}</span>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <MiniPlayer />

      <nav className="bottom-nav" aria-label="Navigation principale">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
            }
          >
            <Icon size={22} />
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
