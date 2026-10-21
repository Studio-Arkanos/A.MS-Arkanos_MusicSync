/**
 * Abstraction de stockage clé/valeur.
 * - Application Android : localStorage de la WebView Capacitor,
 *   persistant entre les démarrages tant que les données de l'app restent.
 * - Tests : stockage Map injectable.
 */

export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Stockage réel de l'application (WebView Android). */
export class WebStorage implements KeyValueStorage {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Stockage plein/indisponible : le prochain read ne confirme pas l'écriture.
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Stockage indisponible.
    }
  }
}

/** Stockage isolé en mémoire pour tests / environnements sans fenêtre. */
export class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}
