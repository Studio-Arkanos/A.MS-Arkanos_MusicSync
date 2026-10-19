import AmsPlayer from '../../plugins/amsPlayer';

/**
 * Pont natif du lecteur (injectable pour les tests).
 * Le pont réel est le plugin Capacitor AmsPlayer
 * (MediaPlayer Android) — fichiers locaux uniquement.
 */

export interface PlayerBridge {
  play(options: { uri: string }): Promise<{ playing: boolean; durationMs: number }>;
  pause(): Promise<{ paused: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  seekTo(options: { positionMs: number }): Promise<{ seeked: boolean }>;
  getStatus(): Promise<{
    playing: boolean;
    positionMs: number;
    durationMs: number;
    uri: string;
  }>;
}

/** Pont réel : plugin natif AmsPlayer. */
export const nativePlayerBridge: PlayerBridge = AmsPlayer;
