/**
 * Configuration Capacitor 8 d'A.MS.
 * L'application est 100 % autonome (offline-first) : aucun serveur distant
 * n'est requis pour son fonctionnement quotidien.
 */
const config = {
  appId: 'com.arkanos.ams',
  appName: 'A.MS',
  webDir: 'dist',
  backgroundColor: '#0b1220', // bleu nuit, en accord avec l'identité visuelle
  plugins: {
    AmsNative: {},
    AmsPlayer: {},
  },
};

export default config;
