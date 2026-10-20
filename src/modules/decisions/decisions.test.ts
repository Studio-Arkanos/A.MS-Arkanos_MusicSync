import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedDecisionStore } from './decisions';

const SOURCE = 'PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub';

describe('PersistedDecisionStore', () => {
  it('crée une décision en attente pour une correspondance incertaine', () => {
    const store = new PersistedDecisionStore(new MemoryStorage());
    const decision = store.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider',
      artist: 'Gims',
      kind: 'uncertain_match',
      matchedLocalId: 'l1',
      score: 0.9,
    });
    expect(decision.resolved).toBe(false);
    expect(store.listPending()).toHaveLength(1);
  });

  it('les trois résolutions possibles sont mémorisées', () => {
    for (const resolution of ['present', 'download', 'ignore'] as const) {
      const store = new PersistedDecisionStore(new MemoryStorage());
      const decision = store.create({
        sourceId: SOURCE,
        trackRef: 'vid-1',
        title: 'Spider',
        artist: 'Gims',
        kind: 'uncertain_match',
      });
      expect(store.resolve(decision.id, resolution)).toBe(true);
      expect(store.resolutionFor(SOURCE, 'vid-1')).toBe(resolution);
      expect(store.listPending()).toHaveLength(0);
    }
  });

  it('une seule décision en attente par morceau', () => {
    const store = new PersistedDecisionStore(new MemoryStorage());
    const first = store.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider',
      artist: 'Gims',
      kind: 'uncertain_match',
    });
    const second = store.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider',
      artist: 'Gims',
      kind: 'uncertain_match',
    });
    expect(second.id).toBe(first.id);
  });

  it('une décision résolue est retrouvable dans l’historique', () => {
    const store = new PersistedDecisionStore(new MemoryStorage());
    const decision = store.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider',
      artist: 'Gims',
      kind: 'uncertain_match',
    });
    store.resolve(decision.id, 'download');
    const all = store.listAll();
    expect(all[0]!.resolution).toBe('download');
    expect(all[0]!.resolved).toBe(true);
  });

  it('persiste entre deux instances (redémarrage)', () => {
    const backend = new MemoryStorage();
    const premier = new PersistedDecisionStore(backend);
    const decision = premier.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider',
      artist: 'Gims',
      kind: 'uncertain_match',
    });
    const second = new PersistedDecisionStore(backend);
    expect(second.listPending()).toHaveLength(1);
    expect(second.resolve(decision.id, 'present')).toBe(true);
  });
});
