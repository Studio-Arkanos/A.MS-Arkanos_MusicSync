/**
 * Décisions en attente (correspondances incertaines).
 *
 * Une correspondance incertaine est soumise à l'utilisateur
 * avant toute exclusion automatique. Les décisions sont
 * persistées et retrouvables — y compris après redémarrage.
 */

import type { KeyValueStorage } from '../../app/storage';

export type DecisionKind = 'uncertain_match';

export type DecisionResolution = 'present' | 'download' | 'ignore';

export interface PendingDecision {
  id: string;
  sourceId: string;
  trackRef: string;
  title: string;
  artist: string;
  kind: DecisionKind;
  /** Morceau local candidat à la correspondance. */
  matchedLocalId?: string;
  score?: number;
  createdAt: string;
  resolved: boolean;
  resolution?: DecisionResolution;
  resolvedAt?: string;
}

export interface DecisionStore {
  create(input: {
    sourceId: string;
    trackRef: string;
    title: string;
    artist: string;
    kind: DecisionKind;
    matchedLocalId?: string;
    score?: number;
  }): PendingDecision;
  resolve(id: string, resolution: DecisionResolution): boolean;
  /** Décisions non tranchées. */
  listPending(): PendingDecision[];
  listAll(): PendingDecision[];
  /** Résolution connue pour un morceau d'une source. */
  resolutionFor(sourceId: string, trackRef: string): DecisionResolution | null;
}

const STORAGE_KEY = 'ams.decisions.v1';

export class PersistedDecisionStore implements DecisionStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  private load(): PendingDecision[] {
    try {
      const raw = this.storage.get(this.key);
      return raw ? (JSON.parse(raw) as PendingDecision[]) : [];
    } catch {
      return [];
    }
  }

  private save(decisions: PendingDecision[]): void {
    this.storage.set(this.key, JSON.stringify(decisions));
  }

  create(input: {
    sourceId: string;
    trackRef: string;
    title: string;
    artist: string;
    kind: DecisionKind;
    matchedLocalId?: string;
    score?: number;
  }): PendingDecision {
    const decisions = this.load();
    const existing = decisions.find(
      (decision) =>
        decision.sourceId === input.sourceId &&
        decision.trackRef === input.trackRef &&
        !decision.resolved,
    );
    if (existing) return existing; // une seule décision en attente à la fois

    const decision: PendingDecision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceId: input.sourceId,
      trackRef: input.trackRef,
      title: input.title,
      artist: input.artist,
      kind: input.kind,
      matchedLocalId: input.matchedLocalId,
      score: input.score,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    decisions.push(decision);
    this.save(decisions);
    return decision;
  }

  resolve(id: string, resolution: DecisionResolution): boolean {
    const decisions = this.load();
    const target = decisions.find((decision) => decision.id === id);
    if (!target || target.resolved) return false;
    target.resolved = true;
    target.resolution = resolution;
    target.resolvedAt = new Date().toISOString();
    this.save(decisions);
    return true;
  }

  listPending(): PendingDecision[] {
    return this.load().filter((decision) => !decision.resolved);
  }

  listAll(): PendingDecision[] {
    return [...this.load()].reverse();
  }

  resolutionFor(sourceId: string, trackRef: string): DecisionResolution | null {
    // La résolution la plus récente pour ce couple source/morceau.
    const decisions = this
      .load()
      .filter(
        (decision) =>
          decision.sourceId === sourceId &&
          decision.trackRef === trackRef &&
          decision.resolved,
      )
      .sort((a, b) => (a.resolvedAt! < b.resolvedAt! ? 1 : -1));
    return decisions[0]?.resolution ?? null;
  }
}
