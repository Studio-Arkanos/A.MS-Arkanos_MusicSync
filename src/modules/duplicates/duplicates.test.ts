import { describe, expect, it } from 'vitest';
import { DuplicateDetector } from './duplicates';

const detector = new DuplicateDetector();

describe('DuplicateDetector.findExact', () => {
  it('détecte les doublons exacts insensibles à la casse', () => {
    const groups = detector.findExact([
      { id: '1', title: 'Shape of You', artist: 'Ed Sheeran' },
      { id: '2', title: 'SHAPE OF YOU', artist: 'ed sheeran' },
      { id: '3', title: 'Photograph', artist: 'Ed Sheeran' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((i) => i.id).sort()).toEqual(['1', '2']);
  });

  it('ignore la ponctuation et les accents', () => {
    const groups = detector.findExact([
      { id: '1', title: 'La Vie en Rose', artist: 'Édith Piaf' },
      { id: '2', title: 'la vie en rose !', artist: 'edith piaf' },
    ]);
    expect(groups).toHaveLength(1);
  });

  it('ne confond pas deux artistes pour un même titre', () => {
    const groups = detector.findExact([
      { id: '1', title: 'Hello', artist: 'Adele' },
      { id: '2', title: 'Hello', artist: 'Aria' },
    ]);
    expect(groups).toHaveLength(0);
  });

  it('liste vide → aucun doublon', () => {
    expect(detector.findExact([])).toEqual([]);
  });
});

describe('DuplicateDetector.findSimilar', () => {
  it('rapproche les titres proches d’un même artiste', () => {
    const groups = detector.findSimilar([
      { id: '1', title: 'Lose Yourself', artist: 'Eminem' },
      { id: '2', title: 'Lose Yourselfs', artist: 'Eminem' },
      { id: '3', title: 'Without Me', artist: 'Eminem' },
      { id: '4', title: 'Lose Yourself', artist: 'Someone Else' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((i) => i.id).sort()).toEqual(['1', '2']);
  });

  it('ne fusionne pas des titres éloignés', () => {
    const groups = detector.findSimilar([
      { id: '1', title: 'Chat', artist: 'Dupont' },
      { id: '2', title: 'Chanson', artist: 'Dupont' },
    ]);
    expect(groups).toHaveLength(0);
  });
});
