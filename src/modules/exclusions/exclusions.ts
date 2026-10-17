import type { ExclusionRule } from '../../domain/models';

/**
 * Gestion des exclusions : règles déterministes qui retirent des
 * morceaux/artistes/dossiers de la synchronisation.
 *
 * Module OPÉRATIONNEL dès l'étape 1 : logique pure, entièrement testée.
 */

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

  /** Une règle désactivée ou vide ne peut exclure. */
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
          // Regex invalide : la règle n'exclut rien plutôt que de planter.
          return false;
        }
      }
    }
  }

  isExcluded(track: ExcludableTrack): boolean {
    return this.rules.some((rule) => this.matches(rule, track));
  }
}
