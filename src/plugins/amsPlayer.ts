import { registerPlugin } from '@capacitor/core';

/**
 * Pont vers le lecteur natif AmsPlayer (MediaPlayer Android).
 * Lecture de fichiers LOCAUX uniquement — jamais de flux
 * distant (pas d'extraction YouTube).
 */

export interface PlayerStatus {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  uri: string;
}

export interface AmsPlayerPlugin {
  play(options: { uri: string }): Promise<{ playing: boolean; durationMs: number }>;
  pause(): Promise<{ paused: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  seekTo(options: { positionMs: number }): Promise<{ seeked: boolean }>;
  getStatus(): Promise<PlayerStatus>;
}

const AmsPlayer = registerPlugin<AmsPlayerPlugin>('AmsPlayer');

export default AmsPlayer;
