import { describe, expect, it } from 'vitest';
import {
  buildFingerprint,
  foldAccents,
  levenshtein,
  normalizeArtist,
  normalizeTitle,
} from './normalization';

describe('normalizeTitle', () => {
  it('minuscule, supprime la ponctuation et rabat les accents', () => {
    expect(normalizeTitle('  Shape OF You (Remix) ')).toBe('shape of you remix');
    expect(normalizeTitle('La Vie en Rose')).toBe('la vie en rose');
    expect(normalizeArtist('Édith Piaf')).toBe('edith piaf');
    expect(normalizeTitle('Cœur de Pirate')).toBe('coeur de pirate');
  });

  it('replie les ligatures', () => {
    expect(normalizeTitle('Œuvre')).toBe('oeuvre');
  });

  it('chaîne vide ou blanche', () => {
    expect(normalizeTitle('   ')).toBe('');
    expect(normalizeTitle('')).toBe('');
  });
});

describe('foldAccents', () => {
  it('rabat les accents sans toucher au reste', () => {
    expect(foldAccents('ÀÉÎÕÜ')).toBe('AEIOU');
    expect(foldAccents('Déjà')).toBe('Deja');
  });
});

describe('buildFingerprint', () => {
  it('est stable quelle que soit la casse ou la ponctuation', () => {
    expect(buildFingerprint('Shape OF You', 'Ed Sheeran')).toBe(
      buildFingerprint('shape of you', 'ed sheeran'),
    );
  });

  it('distingue artiste et titre', () => {
    expect(buildFingerprint('Hello', 'Adele')).not.toBe(buildFingerprint('Hello', 'Aria'));
  });
});

describe('levenshtein', () => {
  it('calcule les distances connues', () => {
    expect(levenshtein('', '')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('chat', 'chats')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('lose yourself', 'lose yourselfs')).toBe(1);
  });
});
