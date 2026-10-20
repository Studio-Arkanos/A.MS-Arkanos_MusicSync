import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerBridge } from './bridge';
import {
  NativePlayerService,
  formatDuration,
  playableFromDownloads,
  playableFromLibrary,
  resolvePlayableTracks,
} from './player';

/** Pont natif simulé — état contrôlé par le test. */
class FakePlayerBridge implements PlayerBridge {
  playing = false;
  positionMs = 0;
  durationMs = 200_000;
  playedUris: string[] = [];
  failNextPlay = false;

  async play(options: { uri: string }) {
    if (this.failNextPlay) {
      this.failNextPlay = false;
      throw new Error('MEDIA_ERROR');
    }
    this.playedUris.push(options.uri);
    this.playing = true;
    this.positionMs = 0;
    return { playing: true, durationMs: this.durationMs };
  }

  async pause() {
    this.playing = false;
    return { paused: true };
  }

  async stop() {
    this.playing = false;
    this.playedUris = [];
    return { stopped: true };
  }

  async seekTo(options: { positionMs: number }) {
    this.positionMs = options.positionMs;
    return { seeked: true };
  }

  async getStatus() {
    return {
      playing: this.playing,
      positionMs: this.positionMs,
      durationMs: this.durationMs,
      uri: '',
    };
  }
}

const track = (id: string): ReturnType<typeof playableFromLibrary>[number] => ({
  id,
  uri: id,
  title: `Titre ${id}`,
  artist: 'Artiste',
  source: 'local',
});

describe('NativePlayerService', () => {
  let bridge: FakePlayerBridge;
  let player: NativePlayerService;

  beforeEach(() => {
    bridge = new FakePlayerBridge();
    player = new NativePlayerService(bridge, true);
  });

  afterEach(() => {
    player.dispose();
  });

  it('playQueue lit le premier morceau de la file', async () => {
    await player.playQueue([track('a'), track('b')]);
    expect(player.state).toBe('playing');
    expect(player.current?.id).toBe('a');
    expect(bridge.playedUris).toEqual(['a']);
  });

  it('playQueue avec startIndex lit le morceau demandé', async () => {
    await player.playQueue([track('a'), track('b'), track('c')], 1);
    expect(player.current?.id).toBe('b');
  });

  it('playQueue ignore une file vide', async () => {
    await player.playQueue([]);
    expect(player.current).toBeNull();
    expect(player.state).toBe('idle');
  });

  it('next et previous bouclent sur la file', async () => {
    await player.playQueue([track('a'), track('b'), track('c')]);
    await player.next();
    expect(player.current?.id).toBe('b');
    await player.next();
    expect(player.current?.id).toBe('c');
    await player.next();
    expect(player.current?.id).toBe('a');
    await player.previous();
    expect(player.current?.id).toBe('c');
  });

  it('toggle met en pause puis reprend', async () => {
    await player.playQueue([track('a')]);
    await player.toggle();
    expect(player.state).toBe('paused');
    expect(bridge.playing).toBe(false);
    await player.toggle();
    expect(player.state).toBe('playing');
    expect(bridge.playing).toBe(true);
  });

  it('play ajoute un morceau isolé à la file', async () => {
    await player.play(track('x'));
    expect(player.current?.id).toBe('x');
    expect(player.queue).toHaveLength(1);
  });

  it('play d’un morceau déjà en file le relance sans dupliquer', async () => {
    await player.playQueue([track('a'), track('b')]);
    await player.play(track('a'));
    expect(player.queue).toHaveLength(2);
    expect(player.current?.id).toBe('a');
    expect(bridge.playedUris).toEqual(['a', 'a']);
  });

  it('seekTo met à jour la position', async () => {
    await player.playQueue([track('a')]);
    await player.seekTo(60_000);
    expect(player.positionMs).toBe(60_000);
    expect(bridge.positionMs).toBe(60_000);
  });

  it('stop vide la file et relâche le lecteur', async () => {
    await player.playQueue([track('a')]);
    await player.stop();
    expect(player.state).toBe('idle');
    expect(player.current).toBeNull();
    expect(player.queue).toHaveLength(0);
  });

  it('refresh détecte la fin et passe au morceau suivant', async () => {
    await player.playQueue([track('a'), track('b')]);
    bridge.positionMs = bridge.durationMs - 100;
    await player.refresh();
    expect(player.current?.id).toBe('b');
    expect(bridge.playedUris).toEqual(['a', 'b']);
  });

  it('refresh signale une erreur honnête si la lecture échoue', async () => {
    bridge.failNextPlay = true;
    await player.playQueue([track('a')]);
    expect(player.state).toBe('error');
    expect(bridge.playedUris).toEqual([]);
  });

  it('signale son indisponibilité hors application Android', async () => {
    const webPlayer = new NativePlayerService(bridge, false);
    await webPlayer.playQueue([track('a')]);
    expect(webPlayer.state).toBe('error');
    expect(webPlayer.available).toBe(false);
    webPlayer.dispose();
  });
});

describe('helpers de file de lecture', () => {
  it('playableFromLibrary construit des morceaux jouables', () => {
    const playable = playableFromLibrary([
      { id: 'content://x', title: 'Spider', artist: 'Gims' },
    ]);
    expect(playable).toHaveLength(1);
    expect(playable[0]!.source).toBe('local');
    expect(playable[0]!.uri).toBe('content://x');
  });

  it('playableFromDownloads ne garde que les téléchargements terminés', () => {
    const playable = playableFromDownloads([
      { title: 'A', artist: 'X', localUri: 'file:///a.mp3', status: 'done' },
      { title: 'B', artist: 'X', status: 'downloading' },
      { title: 'C', artist: 'X', status: 'done' },
    ]);
    expect(playable).toHaveLength(1);
    expect(playable[0]!.source).toBe('downloaded');
  });

  it('resolvePlayableTracks résout bibliothèque + téléchargements', () => {
    const resolved = resolvePlayableTracks(
      ['content://local', 'file:///dl.mp3', 'inconnu'],
      [{ id: 'content://local', title: 'Local', artist: 'A' }],
      [
        {
          title: 'DL',
          artist: 'B',
          localUri: 'file:///dl.mp3',
          status: 'done',
        },
      ],
    );
    expect(resolved.map((t) => t.id)).toEqual([
      'content://local',
      'file:///dl.mp3',
    ]);
  });

  it('formatDuration formate mm:ss et h:mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(61_000)).toBe('1:01');
    expect(formatDuration(3_661_000)).toBe('1:01:01');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });

  it('ne boucle pas indéfiniment sur refresh quand le lecteur est relâché', async () => {
    const failingBridge: PlayerBridge = {
      play: vi.fn().mockResolvedValue({ playing: true, durationMs: 1000 }),
      pause: vi.fn().mockResolvedValue({ paused: true }),
      stop: vi.fn().mockResolvedValue({ stopped: true }),
      seekTo: vi.fn().mockResolvedValue({ seeked: true }),
      getStatus: vi.fn().mockRejectedValue(new Error('released')),
    };
    const service = new NativePlayerService(failingBridge, true);
    await service.playQueue([track('a')]);
    await service.refresh();
    expect(service.state).toBe('idle');
    service.dispose();
  });
});
