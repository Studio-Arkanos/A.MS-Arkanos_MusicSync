import type { OperationRecord, OperationType } from '../../domain/models';
import type { HistoryRepository } from '../database/InMemoryRepositories';

/**
 * Historique des opérations.
 *
 * Module OPÉRATIONNEL dès l'étape 1 : enregistre les événements
 * RÉELS de l'application (démarrage, tentatives, erreurs).
 */

export class HistoryService {
  constructor(private readonly repository: HistoryRepository) {}

  async record(type: OperationType, label: string, detail?: string): Promise<OperationRecord> {
    const record: OperationRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      type,
      label,
      detail,
    };
    await this.repository.append(record);
    return record;
  }

  async list(): Promise<OperationRecord[]> {
    return this.repository.list();
  }

  async clear(): Promise<void> {
    await this.repository.clear();
  }
}
