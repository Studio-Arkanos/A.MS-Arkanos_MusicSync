import { describe, expect, it } from 'vitest';
import { HistoryService } from './HistoryService';
import { InMemoryHistoryRepository } from '../database/InMemoryRepositories';

describe('HistoryService', () => {
  it('enregistre et liste les opérations réelles (plus récente d’abord)', async () => {
    const service = new HistoryService(new InMemoryHistoryRepository());
    await service.record('app_start', 'Application démarrée');
    await service.record('sync_attempt', 'Tentative de synchronisation', 'refusée : moteur non configuré');

    const records = await service.list();
    expect(records).toHaveLength(2);
    expect(records[0]!.type).toBe('sync_attempt');
    expect(records[0]!.detail).toContain('refusée');
    expect(records[1]!.type).toBe('app_start');
  });

  it('efface l’historique', async () => {
    const service = new HistoryService(new InMemoryHistoryRepository());
    await service.record('app_start', 'Application démarrée');
    await service.clear();
    expect(await service.list()).toEqual([]);
  });
});
