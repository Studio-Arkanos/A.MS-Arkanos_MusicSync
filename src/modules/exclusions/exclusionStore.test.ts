import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedExclusionStore } from './exclusions';

const SOURCE = 'PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub';
const AUTRE_SOURCE = 'PL-autre-playlist';

describe('PersistedExclusionStore — exclusions manuelles', () => {
  it('exclusion individuelle', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    expect(store.isExcluded(SOURCE, 'vid-1')).toBe(false);

    store.exclude(SOURCE, 'vid-1', { title: 'Spider', artist: 'Gims' });
    expect(store.isExcluded(SOURCE, 'vid-1')).toBe(true);
    expect(store.listFor(SOURCE)).toHaveLength(1);
  });

  it('exclusions groupées', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    const ajoutes = store.excludeMany(SOURCE, [
      { ref: 'vid-1', title: 'Spider', artist: 'Gims' },
      { ref: 'vid-2', title: 'Autre', artist: 'Gims' },
      { ref: 'vid-1', title: 'Spider', artist: 'Gims' }, // doublon
    ]);
    expect(ajoutes).toBe(2); // idempotent
    expect(store.listFor(SOURCE)).toHaveLength(2);
  });

  it('réintégration explicite d’un morceau exclu', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    store.exclude(SOURCE, 'vid-1', { title: 'Spider', artist: 'Gims' });
    expect(store.include(SOURCE, 'vid-1')).toBe(true);
    expect(store.isExcluded(SOURCE, 'vid-1')).toBe(false);
    // Réintégrer un morceau non exclu : sans effet.
    expect(store.include(SOURCE, 'vid-1')).toBe(false);
  });

  it('réintégration groupée', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    store.excludeMany(SOURCE, [
      { ref: 'vid-1', title: 'A', artist: 'B' },
      { ref: 'vid-2', title: 'C', artist: 'D' },
    ]);
    expect(store.includeMany(SOURCE, ['vid-1', 'vid-2'])).toBe(2);
    expect(store.listFor(SOURCE)).toHaveLength(0);
  });

  it('les exclusions survivent à un « redémarrage » (même stockage)', () => {
    const backend = new MemoryStorage();
    const premier = new PersistedExclusionStore(backend);
    premier.exclude(SOURCE, 'vid-1', { title: 'Spider', artist: 'Gims' });

    // Nouvelle instance (simule la réouverture de l’application)
    // ET une nouvelle analyse de la playlist.
    const apresRedemarrage = new PersistedExclusionStore(backend);
    expect(apresRedemarrage.isExcluded(SOURCE, 'vid-1')).toBe(true);
    // Identité stable : source + référence de morceau.
    expect(apresRedemarrage.listFor(SOURCE)[0]!.trackRef).toBe('vid-1');
  });

  it('une nouvelle instance sur stockage vide ne garde rien (contrôle)', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    expect(store.listAll()).toEqual([]);
  });

  it('réinitialisation volontaire (après confirmation) de la playlist', () => {
    const backend = new MemoryStorage();
    const store = new PersistedExclusionStore(backend);
    store.excludeMany(SOURCE, [
      { ref: 'vid-1', title: 'A', artist: 'B' },
      { ref: 'vid-2', title: 'C', artist: 'D' },
    ]);
    store.exclude(AUTRE_SOURCE, 'vid-9', { title: 'Z', artist: 'Y' });

    const supprimees = store.clearAll(SOURCE);
    expect(supprimees).toBe(2);
    expect(store.listFor(SOURCE)).toHaveLength(0);
    // Autre playlist intacte.
    expect(store.listFor(AUTRE_SOURCE)).toHaveLength(1);
  });

  it('réinitialisation globale', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    store.exclude(SOURCE, 'vid-1', { title: 'A', artist: 'B' });
    expect(store.clearAll()).toBe(1);
    expect(store.listAll()).toHaveLength(0);
  });

  it('exclusion d’une playlist ne contamine pas une autre', () => {
    const store = new PersistedExclusionStore(new MemoryStorage());
    store.exclude(SOURCE, 'vid-1', { title: 'A', artist: 'B' });
    expect(store.isExcluded(AUTRE_SOURCE, 'vid-1')).toBe(false);
  });
});
