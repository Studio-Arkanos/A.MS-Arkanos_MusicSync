/** Chaînes de l'interface — langue initiale : français. */
export const fr = {
  app: {
    name: 'A.MS',
    fullName: 'Arkanos Music Sync',
    stepBadge: 'Étape 1/4',
  },
  nav: {
    home: 'Accueil',
    playlist: 'Playlist',
    search: 'Recherche',
    library: 'Bibliothèque',
    downloads: 'Téléchargements',
    history: 'Historique',
    settings: 'Paramètres',
  },
  status: {
    operational: 'Opérationnel',
    stub: 'Préparé — non branché',
    planned: 'Prévu étape suivante',
    notOperational: 'Non opérationnel',
  },
  home: {
    title: 'Tableau de bord',
    activePlaylist: 'Playlist active',
    analyzed: 'Morceaux analysés',
    present: 'Déjà présents',
    toDownload: 'À télécharger',
    excluded: 'Exclus',
    pending: 'Décisions en attente',
    syncProgress: 'Progression de la synchronisation',
    lastOperation: 'Dernière opération',
    none: 'Aucune',
    syncNow: 'Synchroniser maintenant',
    engineNotReady:
      'Moteur non opérationnel : aucun fournisseur n’est encore configuré. Le bouton reste désactivé tant que l’étape 2 ne sera pas livrée.',
    upcoming: 'Prévu aux étapes suivantes',
    idle: 'Aucune synchronisation en cours',
    demoNotice:
      'Aucune donnée de démonstration n’est affichée : les compteurs reflètent l’état réel (vide) de l’application.',
  },
  playlist: {
    title: 'Playlist',
    empty: 'Aucune playlist pour le moment.',
    upcoming: 'La gestion des playlists sera implémentée à l’étape 2.',
  },
  search: {
    title: 'Recherche',
    placeholder: 'Rechercher un morceau, un artiste…',
    launch: 'Rechercher',
    noProvider:
      'Aucun fournisseur de recherche n’est configuré à cette étape. Aucun résultat n’est fabriqué.',
    results: 'Résultats',
    upcoming: 'Les fournisseurs de recherche arrivent à l’étape 2.',
  },
  library: {
    title: 'Bibliothèque',
    scan: 'Analyser la bibliothèque locale',
    scanUnavailable:
      'Le scan natif de la bibliothèque locale sera branché à l’étape 2 (plugin Capacitor personnalisé).',
    analyzed: 'Morceaux trouvés',
  },
  downloads: {
    title: 'Téléchargements',
    empty: 'Aucun téléchargement.',
    upcoming:
      'Le gestionnaire de téléchargements et la liste blanche des fournisseurs autorisés arrivent aux étapes 2 et 3.',
  },
  history: {
    title: 'Historique',
    empty: 'Aucune opération enregistrée.',
    clear: 'Effacer l’historique',
    cleared: 'Historique effacé.',
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue',
    languageValue: 'Français (verrouillée à cette étape)',
    theme: 'Thème',
    themeValue: 'Sombre (seul thème disponible)',
    appId: 'Identifiant Android',
    version: 'Version',
    providers: 'Fournisseurs',
    providersNote: 'Configuration des fournisseurs : étape 2.',
    sync: 'Synchronisation',
    syncNote: 'Planification et options de synchronisation : étape 3.',
    disabled: 'Désactivé à cette étape',
  },
  common: {
    disabled: 'Désactivé',
    count: '{n}',
  },
} as const;

export type Strings = typeof fr;
