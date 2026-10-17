import { describe, expect, it } from 'vitest';
import { ExclusionEngine } from './exclusions';
import type { ExclusionRule } from '../../domain/models';

describe('ExclusionEngine', () => {
  it('exclut par titre (insensible à la casse)', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'title', value: 'karaoke', enabled: true },
    ]);
    expect(engine.isExcluded({ title: 'Karaoke Night', artist: 'X' })).toBe(true);
    expect(engine.isExcluded({ title: 'Nightcall', artist: 'X' })).toBe(false);
  });

  it('exclut par artiste', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'artist', value: 'Daft Punk', enabled: true },
    ]);
    expect(engine.isExcluded({ title: 'One More Time', artist: 'daft punk' })).toBe(true);
  });

  it('exclut par dossier (préfixe insensible à la casse)', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'folder', value: '/podcasts', enabled: true },
    ]);
    expect(
      engine.isExcluded({ title: 'Épisode 1', artist: 'Podcast', folder: '/Podcasts/2026' }),
    ).toBe(true);
    expect(engine.isExcluded({ title: 'Song', artist: 'A', folder: '/Music' })).toBe(false);
    expect(engine.isExcluded({ title: 'Song', artist: 'A' })).toBe(false);
  });

  it('supporte les motifs regex', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'pattern', value: '^intro', enabled: true },
    ]);
    expect(engine.isExcluded({ title: 'Intro 2026', artist: 'X' })).toBe(true);
    expect(engine.isExcluded({ title: 'Outro', artist: 'X' })).toBe(false);
  });

  it('ignore les règles désactivées ou vides', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'artist', value: 'Adele', enabled: false },
      { id: 'r2', type: 'artist', value: '   ', enabled: true },
    ]);
    expect(engine.isExcluded({ title: 'Hello', artist: 'Adele' })).toBe(false);
  });

  it('une regex invalide n’exclut rien', () => {
    const engine = new ExclusionEngine([
      { id: 'r1', type: 'pattern', value: '([unclosed', enabled: true },
    ]);
    expect(engine.isExcluded({ title: 'Whatever', artist: 'X' })).toBe(false);
  });

  it('ajout / retrait de règles', () => {
    const engine = new ExclusionEngine();
    const rule: ExclusionRule = { id: 'r1', type: 'title', value: 'démo', enabled: true };
    engine.addRule(rule);
    expect(engine.getRules()).toHaveLength(1);
    engine.removeRule('r1');
    expect(engine.getRules()).toHaveLength(0);
  });
});
