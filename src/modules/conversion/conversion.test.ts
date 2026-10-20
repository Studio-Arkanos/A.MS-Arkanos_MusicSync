import { describe, expect, it } from 'vitest';
import { ConversionManagerStub, formatFromName } from './conversion';

describe('ConversionManagerStub (étape 3)', () => {
  it('n’est disponible que si une solution est vérifiée — ce n’est pas le cas', () => {
    const manager = new ConversionManagerStub();
    expect(manager.available).toBe(false);
    expect(manager.reason).toContain('CONVERSION_NOT_INTEGRATED');
  });

  it('ne simule JAMAIS une conversion', async () => {
    const manager = new ConversionManagerStub();
    const result = await manager.convert({
      localUri: 'content://a.ogg',
      sourceFormat: 'ogg',
      targetFormat: 'mp3',
    });
    expect(result.converted).toBe(false);
    expect(result.reason).toContain('CONVERSION_NOT_INTEGRATED');
  });

  it('mp3 → mp3 : aucune conversion inutile', () => {
    const manager = new ConversionManagerStub();
    expect(manager.isConversionNeeded('mp3', 'mp3')).toBe(false);
    expect(manager.isConversionNeeded('ogg', 'mp3')).toBe(true);
  });

  it('format déduit du nom de fichier', () => {
    expect(formatFromName('morceau.mp3')).toBe('mp3');
    expect(formatFromName('morceau.OGG')).toBe('ogg');
    expect(formatFromName('morceau.flac')).toBe('flac');
    expect(formatFromName('morceau.m4a')).toBe('m4a');
    expect(formatFromName('inconnu')).toBe('mp3');
  });
});
