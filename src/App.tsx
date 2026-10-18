import { Navigate, Route, Routes } from 'react-router-dom';
import { MainTabs } from './navigation/MainTabs';
import { DownloadsScreen } from './screens/DownloadsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { PlaylistScreen } from './screens/PlaylistScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TrackScreen } from './screens/TrackScreen';

export default function App() {
  return (
    <Routes>
      <Route element={<MainTabs />}>
        <Route path="/" element={<Navigate to="/accueil" replace />} />
        <Route path="/accueil" element={<HomeScreen />} />
        <Route path="/playlist" element={<PlaylistScreen />} />
        <Route path="/recherche" element={<SearchScreen />} />
        <Route path="/bibliotheque" element={<LibraryScreen />} />
        <Route path="/telechargements" element={<DownloadsScreen />} />
        <Route path="/historique" element={<HistoryScreen />} />
        <Route path="/parametres" element={<SettingsScreen />} />
        <Route path="/track/:ref" element={<TrackScreen />} />
        <Route path="*" element={<Navigate to="/accueil" replace />} />
      </Route>
    </Routes>
  );
}
