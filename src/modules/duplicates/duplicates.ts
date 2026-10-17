import { buildFingerprint, levenshtein, normalizeArtist, normalizeTitle } from '../normalization/normalization';

/**
 * Détection des doublons (exacts et quasi-doublons).
 *
 * Module OPÉRATIONNEL dès l'étape 1 : logique pure, entièrement testée.
 * Elle sera alimentée par le scan local (étape 2) et les catalogues
 * distants (étape 2) pour décider d'un morceau « déjà présent ».
 */

export interface DuplicateCandidate {
  id: string;
  title: string;
  artist: string;
}

export interface DuplicateGroup {
  fingerprint: string;
  items: DuplicateCandidate[];
}

export class DuplicateDetector {
  /** Doublons exacts : même titre ET même artiste normalisés. */
  findExact<T extends DuplicateCandidate>(items: T[]): DuplicateGroup[] {
    const byFingerprint = new Map<string, T[]>();
    for (const item of items) {
      const fingerprint = buildFingerprint(item.title, item.artist);
      const existing = byFingerprint.get(fingerprint);
      if (existing) existing.push(item);
      else byFingerprint.set(fingerprint, [item]);
    }
    return [...byFingerprint.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([fingerprint, itemsInGroup]) => ({ fingerprint, items: itemsInGroup }));
  }

  /**
   * Quasi-doublons : même artiste normalisé et titres à distance
   * de Levenshtein ≤ maxDistance (ex. « Lose Yourself » / « Lose Yourselfs »).
   */
  findSimilar<T extends DuplicateCandidate>(items: T[], maxDistance = 1): DuplicateGroup[] {
    const byArtist = new Map<string, T[]>();
    for (const item of items) {
      const artist = normalizeArtist(item.artist);
      const existing = byArtist.get(artist);
      if (existing) existing.push(item);
      else byArtist.set(artist, [item]);
    }

    const groups: DuplicateGroup[] = [];
    for (const [artist, artistItems] of byArtist) {
      // Union-find simplifié sur les indices.
      const parent = artistItems.map((_, index) => index);
      const find = (i: number): number => {
        while (parent[i] !== i) {
          parent[i] = parent[parent[i]];
          i = parent[i];
        }
        return i;
      };
      const union = (a: number, b: number) => {
        parent[find(a)] = find(b);
      };

      for (let i = 0; i < artistItems.length; i++) {
        for (let j = i + 1; j < artistItems.length; j++) {
          const distance = levenshtein(
            normalizeTitle(artistItems[i]!.title),
            normalizeTitle(artistItems[j]!.title),
          );
          if (distance <= maxDistance) union(i, j);
        }
      }

      const clusters = new Map<number, T[]>();
      artistItems.forEach((item, index) => {
        const root = find(index);
        const cluster = clusters.get(root);
        if (cluster) cluster.push(item);
        else clusters.set(root, [item]);
      });

      for (const clusterItems of clusters.values()) {
        if (clusterItems.length > 1) {
          groups.push({
            fingerprint: `similar||${artist}`,
            items: clusterItems,
          });
        }
      }
    }
    return groups;
  }
}
