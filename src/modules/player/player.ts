import type { PlayerBridge } from './bridge';

/**
 * Lecteur audio (étape pré-4).
 *
 * Moteur RÉEL : MediaPlayer Android via le plugin
 * AmsPlayer. Sources lisibles :
 *  - morceaux de la bibliothèque locale scannée ;
 *  - morceaux téléchargés depuis des sources autorisées.
 *
 * Les morceaux YouTube ne sont JAMAIS lus dans
 * l'application (aucune extraction) — « Ouvrir la
 * source » uniquement.
 *
 * Garanties : file d'attente, lecture/pause/stop,
 * avance rapide, morceau suivant/précédent,
 * lecture automatique en fin de morceau, état réel
 * du lecteur (jamais simulé).
 */

export type PlayerState = 'idle' | 'playing' | 'paused' | 'error';

export interface PlayableTrack {
  /** Identité stable : URI locale du fichier. */
  id: string;
  title: string;
  artist: string;
  /** URI local (content:// SAF ou fichier téléchargé). */
  uri: string;
  source: 'local' | 'downloaded';
  durationMs?: number;
  thumbnailUrl?: string;
}

export interface PlayerService {
  readonly state: PlayerState;
  readonly current: PlayableTrack | null;
  readonly queue: PlayableTrack[];
  readonly positionMs: number;
  readonly durationMs: number;
  readonly available: boolean;
  playQueue(tracks: PlayableTrack[], startIndex?: number): Promise<void>;
  play(track: PlayableTrack): Promise<void>;
  toggle(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
}

export class NativePlayerService implements PlayerService {
  #queue: PlayableTrack[] = [];
  #index = -1;
  #state: PlayerState = 'idle';
  #positionMs = 0;
  #durationMs = 0;
  #listeners = new Set<() => void>();
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly bridge: PlayerBridge,
    private readonly isNative: boolean,
  ) {}

  get state(): PlayerState {
    return this.#state;
  }

  get current(): PlayableTrack | null {
    return this.#index >= 0 ? this.#queue[this.#index] ?? null : null;
  }

  get queue(): PlayableTrack[] {
    return [...this.#queue];
  }

  get positionMs(): number {
    return this.#positionMs;
  }

  get durationMs(): number {
    return this.#durationMs;
  }

  /** Disponibilité réelle : application Android uniquement. */
  get available(): boolean {
    return this.isNative;
  }

  async playQueue(tracks: PlayableTrack[], startIndex = 0): Promise<void> {
    if (tracks.length === 0) return;
    this.#queue = [...tracks];
    this.#index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    await this.#playCurrent();
  }

  async play(track: PlayableTrack): Promise<void> {
    const existing = this.#queue.findIndex((t) => t.id === track.id);
    if (existing >= 0) {
      this.#index = existing;
    } else {
      this.#queue = [...this.#queue, track];
      this.#index = this.#queue.length - 1;
    }
    await this.#playCurrent();
  }

  async toggle(): Promise<void> {
    if (!this.isNative || this.#index < 0) return;
    if (this.#state === 'playing') {
      await this.bridge.pause();
      this.#state = 'paused';
    } else {
      await this.#resumeCurrent();
    }
    this.#emit();
  }

  async stop(): Promise<void> {
    if (!this.isNative) return;
    try {
      await this.bridge.stop();
    } catch {
      // lecteur déjà relâché
    }
    this.#queue = [];
    this.#index = -1;
    this.#state = 'idle';
    this.#positionMs = 0;
    this.#durationMs = 0;
    this.#stopPolling();
    this.#emit();
  }

  async next(): Promise<void> {
    if (this.#queue.length === 0) return;
    this.#index = (this.#index + 1) % this.#queue.length;
    await this.#playCurrent();
  }

  async previous(): Promise<void> {
    if (this.#queue.length === 0) return;
    this.#index =
      (this.#index - 1 + this.#queue.length) % this.#queue.length;
    await this.#playCurrent();
  }

  async seekTo(positionMs: number): Promise<void> {
    if (!this.isNative) return;
    await this.bridge.seekTo({ positionMs: Math.max(0, positionMs) });
    this.#positionMs = positionMs;
    this.#emit();
  }

  /** Interrogation réelle de l'état du lecteur. */
  async refresh(): Promise<void> {
    if (!this.isNative || this.#index < 0) return;
    try {
      const status = await this.bridge.getStatus();
      const wasPlaying = this.#state === 'playing';
      this.#state = status.playing ? 'playing' : 'paused';
      this.#positionMs = status.positionMs;
      if (status.durationMs > 0) this.#durationMs = status.durationMs;
      // Fin de morceau : passage automatique au suivant.
      if (
        wasPlaying &&
        this.#durationMs > 0 &&
        status.positionMs >= this.#durationMs - 500
      ) {
        await this.next();
        return;
      }
      this.#emit();
    } catch {
      // lecteur relâché : état honnête
      this.#state = 'idle';
      this.#emit();
    }
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Arrête le polling (fin de vie / tests). */
  dispose(): void {
    this.#stopPolling();
    this.#listeners.clear();
  }

  async #playCurrent(): Promise<void> {
    const track = this.current;
    if (!track) return;
    if (!this.isNative) {
      this.#state = 'error';
      this.#emit();
      return;
    }
    try {
      const result = await this.bridge.play({ uri: track.uri });
      this.#state = result.playing ? 'playing' : 'paused';
      this.#durationMs = result.durationMs || track.durationMs || 0;
      this.#positionMs = 0;
      this.#startPolling();
    } catch {
      this.#state = 'error';
      this.#positionMs = 0;
    }
    this.#emit();
  }

  async #resumeCurrent(): Promise<void> {
    const track = this.current;
    if (!track) return;
    try {
      const result = await this.bridge.play({ uri: track.uri });
      this.#state = result.playing ? 'playing' : 'paused';
      this.#startPolling();
    } catch {
      this.#state = 'error';
    }
  }

  #startPolling(): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      void this.refresh();
    }, 500);
  }

  #stopPolling(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  #emit(): void {
    this.#listeners.forEach((listener) => listener());
  }
}

/** File de lecture depuis les morceaux locaux jouables. */
export function playableFromLibrary(
  tracks: Array<{ id: string; title: string; artist: string }>,
): PlayableTrack[] {
  return tracks.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    uri: track.id, // l'identifiant local est l'URI SAF
    source: 'local' as const,
  }));
}

/** File de lecture depuis les téléchargements terminés. */
export function playableFromDownloads(
  tasks: Array<{
    title: string;
    artist: string;
    localUri?: string;
    status: string;
  }>,
): PlayableTrack[] {
  return tasks
    .filter((task) => task.status === 'done' && task.localUri)
    .map((task) => ({
      id: task.localUri!,
      title: task.title,
      artist: task.artist,
      uri: task.localUri!,
      source: 'downloaded' as const,
    }));
}

/**
 * Résolution d'identifiants de playlist en morceaux
 * jouables (bibliothèque locale + téléchargements
 * terminés). Un identifiant non résolu est ignoré —
 * jamais remplacé par une fausse source.
 */
export function resolvePlayableTracks(
  trackIds: string[],
  library: Array<{ id: string; title: string; artist: string }>,
  downloads: Array<{
    title: string;
    artist: string;
    localUri?: string;
    status: string;
  }>,
): PlayableTrack[] {
  const byUri = new Map(library.map((track) => [track.id, track]));
  const downloaded = playableFromDownloads(downloads);
  const downloadByUri = new Map(downloaded.map((track) => [track.id, track]));
  const resolved: PlayableTrack[] = [];
  for (const id of trackIds) {
    const local = byUri.get(id);
    if (local) {
      resolved.push({
        id,
        title: local.title,
        artist: local.artist,
        uri: id,
        source: 'local',
      });
      continue;
    }
    const download = downloadByUri.get(id);
    if (download) resolved.push(download);
  }
  return resolved;
}

/** Formatage mm:ss (h:mm:ss au-delà d'une heure). */
export function formatDuration(totalMs: number): string {
  if (!Number.isFinite(totalMs) || totalMs < 0) return '0:00';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}
