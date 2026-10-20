import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { APP } from './config/app.config';
import { services } from './app/services';
import './styles/global.css';

// Événement RÉEL consigné à chaque démarrage (historique authentique).
services.history
  .record('app_start', 'Application démarrée', `A.MS ${APP.version} — étape 1/4`)
  .catch(() => {});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
