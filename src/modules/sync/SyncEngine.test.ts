import { describe, expect, it } from 'vitest';
import { SyncEngineError, SyncEngineStub } from './SyncEngine';

describe('SyncEngineStub (étape 1)', () => {
  it('n’est pas prêt : le bouton de synchronisation doit rester désactivé', () => {
    expect(new SyncEngineStub().ready).toBe(false);
  });

  it('refuse de synchroniser au lieu de simuler', async () => {
    const engine = new SyncEngineStub();
    await expect(engine.sync()).rejects.toBeInstanceOf(SyncEngineError);
    await expect(engine.sync()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('se désabonne proprement', () => {
    const engine = new SyncEngineStub();
    const unsubscribe = engine.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});
