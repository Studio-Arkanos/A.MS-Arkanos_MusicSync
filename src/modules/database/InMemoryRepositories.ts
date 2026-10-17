import type { OperationRecord, Track } from '../../domain/models';

/**
 * Accès données côté web.
 *
 * Module PRÉPARÉ à l'étape 1 : la persistance réelle sera Room
 * (SQLite) côté Android, exposée via le plugin AmsNative à l'étape 2.
 * Les implémentations en mémoire ci-dessous sont RÉELLES mais vides :
 * elles ne contiennent aucune donnée de démonstration.
 */

export interface TrackRepository {
  list(): Promise<Track[]>;
  count(): Promise<number>;
  insert(tracks: Track[]): Promise<void>;
}

export class InMemoryTrackRepository implements TrackRepository {
  private tracks: Track[] = [];

  async list(): Promise<Track[]> {
    return [...this.tracks];
  }

  async count(): Promise<number> {
    return this.tracks.length;
  }

  async insert(tracks: Track[]): Promise<void> {
    this.tracks.push(...tracks);
  }
}

export interface HistoryRepository {
  append(record: OperationRecord): Promise<void>;
  list(): Promise<OperationRecord[]>;
  clear(): Promise<void>;
}

export class InMemoryHistoryRepository implements HistoryRepository {
  private records: OperationRecord[] = [];

  async append(record: OperationRecord): Promise<void> {
    this.records.push(record);
  }

  async list(): Promise<OperationRecord[]> {
    return [...this.records].reverse(); // plus récent d'abord
  }

  async clear(): Promise<void> {
    this.records = [];
  }
}
