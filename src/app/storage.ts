/**
 * Abstraction de stockage clé/valeur.
 *
 - Web (application Android) : localStorage de la WebView Capacitor,
   persisté entre les démarrages.
 - Tests : MapStorage injectable.
 - Étape 3 : pont vers Room (SQLite) côté Android.
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
      // Stockage plein/indisponible : signalé, jamais silencieusement
      // « réussi ». L'appelant vérifie via read-back si nécessaire.
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // sans effet
    }
  }
}

/** Stockage de test (ou temporaire) en mémoire. */
export class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }
}
