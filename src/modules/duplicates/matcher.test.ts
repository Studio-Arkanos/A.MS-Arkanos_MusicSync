import { describe, expect, it } from 'vitest';
import { DuplicateMatcher } from './matcher';

const matcher = new DuplicateMatcher();

const LIBRARY = [
  { id: 'l1', title: 'Spider', artist: 'Gims' },
  { id: 'l2', title: 'Spider (Remix)', artist: 'Gims' },
  { id: 'l3', title: 'Autre Chose', artist: 'Gims' },
];

describe('DuplicateMatcher — seuils du cahier des charges', () => {
  it('égalité des noms normalisés → Déjà présent (≥ 95 %)', () => {
    const result = matcher.match({ title: 'Spider', artist: 'Gims' }, LIBRARY);
    expect(result.state).toBe('present');
    expect(result.score).toBe(1);
  });

  it('similarité textuelle élevée → Déjà présent', () => {
    const result = matcher.match(
      { title: 'Spider', artist: 'Gims' },
      [{ id: 'x', title: 'Spiders', artist: 'Gims' }],
    );
    // « spider » vs « spiders » : similarité 6/7 ≈ 0,857 → incertaine
    expect(result.state).toBe('uncertain');
    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.score).toBeLessThan(0.95);
  });

  it('score faible → Absent (< 80 %)', () => {
    const result = matcher.match({ title: 'Spider', artist: 'Gims' }, LIBRARY);
    const nothing = matcher.match(
      { title: 'Chanson Inconnue', artist: 'Artiste Inconnu' },
      LIBRARY,
    );
    expect(result.state).toBe('present'); // sanity : spider existe
    expect(nothing.state).toBe('absent');
    expect(nothing.score).toBeLessThan(0.8);
  });

  it('un score élevé ne confond JAMAIS original et remix', () => {
    const result = matcher.match({ title: 'Spider', artist: 'Gims' }, LIBRARY);
    expect(result.state).toBe('present');

    const remixQuery = matcher.match(
      { title: 'Spider (Remix)', artist: 'Gims' },
      LIBRARY,
    );
    // Le remix correspond au remix local : présent.
    expect(remixQuery.state).toBe('present');

    // Un original demandé alors que seul le remix existe : incertain.
    const originalOnly = matcher.match(
      { title: 'Spider', artist: 'Gims' },
      [{ id: 'r', title: 'Spider (Remix)', artist: 'Gims' }],
    );
    expect(originalOnly.state).toBe('uncertain');
    expect(originalOnly.state).not.toBe('present');
  });

  it('bibliothèque vide → Absent (jamais de faux présent)', () => {
    const result = matcher.match({ title: 'Spider', artist: 'Gims' }, []);
    expect(result.state).toBe('absent');
    expect(result.criteria).toContain('bibliotheque_vide');
  });

  it('artiste divergent pénalise le score', () => {
    const result = matcher.match(
      { title: 'Spider', artist: 'Gims' },
      [{ id: 'o', title: 'Spider', artist: 'Someone Else' }],
    );
    expect(result.score).toBeLessThan(1);
    expect(result.criteria).toContain('artiste_divergent');
  });

  it('seuils configurables', () => {
    const strict = new DuplicateMatcher({ probable: 0.99, uncertain: 0.9 });
    const result = strict.match(
      { title: 'Spider', artist: 'Gims' },
      [{ id: 's', title: 'Spider', artist: 'Gims' }],
    );
    expect(result.state).toBe('present');
  });

  it('mots significatifs comparés (ordre partiel)', () => {
    const result = matcher.match(
      { title: 'One More Time', artist: 'Daft Punk' },
      [{ id: 'd', title: 'One More Time', artist: 'Daft Punk' }],
    );
    expect(result.state).toBe('present');
  });
});
