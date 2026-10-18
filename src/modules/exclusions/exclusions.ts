/**
 * Exclusions — étape 2.
 *
 * Deux moteurs distincts :
 *  - ExclusionEngine : règles automatiques (titre/artiste/dossier/regex) ;
 *  - ExclusionStore : exclusions MANUELLES de l'utilisateur, persistées
 *    avec une identité stable (source + morceau).
 *
 * Règles d'or :
 *  - une exclusion NE SUPPRIME JAMAIS la chanson de la playlist source ;
 *  - elle survit à la fermeture, au redémarrage et à une nouvelle analyse ;
 *  - elle prime sur l'automatisme de téléchargement ;
 *  - une commande explicite permet de réintégrer un morceau.
 */

import type { KeyValueStorage } from '../../app/storage';
import type { ExclusionRule } from '../../domain/models';

/* ----------------- Règles automatiques (étape 1, conservées) ----------------- */

export interface ExcludableTrack {
  title: string;
  artist: string;
  folder?: string;
}

function includesCi(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export class ExclusionEngine {
  private rules: ExclusionRule[];

  constructor(rules: ExclusionRule[] = []) {
    this.rules = [...rules];
  }

  setRules(rules: ExclusionRule[]): void {
    this.rules = [...rules];
  }

  getRules(): ExclusionRule[] {
    return [...this.rules];
  }

  addRule(rule: ExclusionRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((rule) => rule.id !== id);
  }

  matches(rule: ExclusionRule, track: ExcludableTrack): boolean {
    if (!rule.enabled) return false;
    const value = rule.value.trim();
    if (value.length === 0) return false;

    switch (rule.type) {
      case 'title':
        return includesCi(track.title, value);
      case 'artist':
        return includesCi(track.artist, value);
      case 'folder':
        return track.folder ? includesCi(track.folder, value) : false;
      case 'pattern': {
        try {
          return new RegExp(value, 'i').test(`${track.title} ${track.artist}`);
        } catch {
          return false;
        }
      }
    }
  }

  isExcluded(track: ExcludableTrack): boolean {
    return this.rules.some((rule) => this.matches(rule, track));
  }
}

/* ----------------- Exclusions manuelles persistantes ----------------- */

export interface ExclusionRecord {
  /** Identité stable : identifiant de la source (playlist). */
  sourceId: string;
  /** Identité stable : référence du morceau dans la source (id vidéo). */
  trackRef: string;
  title: string;
  artist: string;
  excludedAt: string;
}

export interface ExclusionStore {
  isExcluded(sourceId: string, trackRef: string): boolean;
  exclude(sourceId: string, trackRef: string, meta: { title: string; artist: string }): void;
  excludeMany(sourceId: string, refs: Array<{ ref: string; title: string; artist: string }>): number;
  /** Commande explicite de réintégration. */
  include(sourceId: string, trackRef: string): boolean;
  includeMany(sourceId: string, refs: string[]): number;
  listFor(sourceId: string): ExclusionRecord[];
  listAll(): ExclusionRecord[];
  /** Réinitialisation volontaire (après confirmation côté UI). */
  clearAll(sourceId?: string): number;
}

const STORAGE_KEY = 'ams.exclusions.v1';

export class PersistedExclusionStore implements ExclusionStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  private load(): ExclusionRecord[] {
    try {
      const raw = this.storage.get(this.key);
      return raw ? (JSON.parse(raw) as ExclusionRecord[]) : [];
    } catch {
      return [];
    }
  }

  private save(records: ExclusionRecord[]): void {
    this.storage.set(this.key, JSON.stringify(records));
  }

  isExcluded(sourceId: string, trackRef: string): boolean {
    return this.load().some(
      (record) => record.sourceId === sourceId && record.trackRef === trackRef,
    );
  }

  exclude(
    sourceId: string,
    trackRef: string,
    meta: { title: string; artist: string },
  ): void {
    const records = this.load();
    if (records.some((r) => r.sourceId === sourceId && r.trackRef === trackRef)) {
      return; // déjà exclu : idempotent
    }
    records.push({
      sourceId,
      trackRef,
      title: meta.title,
      artist: meta.artist,
      excludedAt: new Date().toISOString(),
    });
    this.save(records);
  }

  excludeMany(
    sourceId: string,
    refs: Array<{ ref: string; title: string; artist: string }>,
  ): number {
    const records = this.load();
    let added = 0;
    for (const { ref, title, artist } of refs) {
      if (records.some((r) => r.sourceId === sourceId && r.trackRef === ref)) {
        continue;
      }
      records.push({ sourceId, trackRef: ref, title, artist, excludedAt: new Date().toISOString() });
      added++;
    }
    if (added > 0) this.save(records);
    return added;
  }

  include(sourceId: string, trackRef: string): boolean {
    const before = this.load();
    const after = before.filter(
      (record) => !(record.sourceId === sourceId && record.trackRef === trackRef),
    );
    if (after.length === before.length) return false;
    this.save(after);
    return true;
  }

  includeMany(sourceId: string, refs: string[]): number {
    const before = this.load();
    const after = before.filter(
      (record) =>
        !(record.sourceId === sourceId && refs.includes(record.trackRef)),
    );
    const removed = before.length - after.length;
    if (removed > 0) this.save(after);
    return removed;
  }

  listFor(sourceId: string): ExclusionRecord[] {
    return this.load().filter((record) => record.sourceId === sourceId);
  }

  listAll(): ExclusionRecord[] {
    return this.load();
  }

  clearAll(sourceId?: string): number {
    const records = this.load();
    const kept =
      sourceId === undefined
        ? []
        : records.filter((record) => record.sourceId !== sourceId);
    const removed = records.length - kept.length;
    this.save(kept);
    return removed;
  }
}
