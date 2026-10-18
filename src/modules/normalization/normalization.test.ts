import { describe, expect, it } from 'vitest';
import {
  buildFingerprint,
  foldAccents,
  levenshtein,
  normalizeArtist,
  normalizeTitle,
  parseTrackName,
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

/* ---------------------------------------------------------------- */
/* Exemples obligatoires du cahier des charges (étape 2)            */
/* ---------------------------------------------------------------- */

describe('parseTrackName — exemples du cahier des charges', () => {
  it('reconnait les quatre variantes comme « gims spider »', () => {
    const cases = [
      'Gims - Spider (Clip Officiel).mp3',
      'Gims - Spider 128K.mp3',
      'GIMS - Spider (Official Music Video).mp3',
      'GIMS - Spider [Visualizer].mp3',
    ];
    for (const filename of cases) {
      const parsed = parseTrackName(filename);
      expect(parsed.key, filename).toBe('gims spider');
      expect(parsed.artist, filename).toBe('gims');
      expect(parsed.title, filename).toBe('spider');
    }
  });

  it('supprime les indications de qualité (128K, 320K, 720P, 1080P, 4K)', () => {
    expect(parseTrackName('Titre 320K.mp3').key).toBe('titre');
    expect(parseTrackName('Titre 128 kbps.mp3').key).toBe('titre');
    expect(parseTrackName('Artiste - Chanson 720p.mp3').key).toBe('artiste chanson');
    expect(parseTrackName('Artiste - Chanson 1080P.mp3').key).toBe('artiste chanson');
    expect(parseTrackName('Artiste - Chanson 4K.mp3').key).toBe('artiste chanson');
  });

  it('supprime les marqueurs promotionnels', () => {
    expect(parseTrackName('A - B (Official Audio).mp3').key).toBe('a b');
    expect(parseTrackName('A - B (Lyrics).mp3').key).toBe('a b');
    expect(parseTrackName('A - B [Visualizer].mp3').key).toBe('a b');
    expect(parseTrackName('A - B (Clip Officiel).mp3').key).toBe('a b');
    expect(parseTrackName('A - B (Official).mp3').key).toBe('a b');
  });

  it('conserve les marqueurs de version musicale', () => {
    expect(parseTrackName('A - B (Remix).mp3').versionMarkers).toContain('remix');
    expect(parseTrackName('A - B (Live).mp3').key).toBe('a b live');
    expect(parseTrackName('A - B (Acoustic).mp3').key).toBe('a b acoustic');
    expect(parseTrackName('A - B (Instrumental).mp3').key).toBe('a b instrumental');
    expect(parseTrackName('A - B (Sped Up).mp3').key).toBe('a b sped up');
    expect(parseTrackName('A - B (Slowed).mp3').key).toBe('a b slowed');
    expect(parseTrackName('A - B (Reverb).mp3').key).toBe('a b reverb');
    expect(parseTrackName('A - B (Radio Edit).mp3').key).toBe('a b radio edit');
  });

  it('un remix et un original restent distincts', () => {
    const original = parseTrackName('Gims - Spider.mp3');
    const remix = parseTrackName('Gims - Spider (Remix).mp3');
    expect(original.key).not.toBe(remix.key);
    expect(remix.versionMarkers).toContain('remix');
  });

  it('sépare artiste et titre sur « - »', () => {
    const parsed = parseTrackName('Daft Punk - One More Time.mp3');
    expect(parsed.artist).toBe('daft punk');
    expect(parsed.title).toBe('one more time');
  });

  it('fichier sans séparateur : titre seul, artiste inconnu', () => {
    const parsed = parseTrackName('morceau_sans_meta.mp3');
    expect(parsed.artist).toBe('');
    expect(parsed.title).toBe('morceau sans meta');
  });

  it('minuscules, accents, ponctuation et séparateurs', () => {
    const parsed = parseTrackName('Édith_Piaf - La Vie en Rose.mp3');
    expect(parsed.artist).toBe('edith piaf');
    expect(parsed.title).toBe('la vie en rose');
  });
});
