/** Filtres de la liste de playlist. */
export type FilterKey =
  | 'all'
  | 'present'
  | 'absent'
  | 'uncertain'
  | 'excluded'
  | 'unavailable';

export type Filter = FilterKey;
