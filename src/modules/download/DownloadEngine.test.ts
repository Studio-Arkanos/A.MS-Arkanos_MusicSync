import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import {
  NativeDownloadEngine,
  suffixedName,
  verifyDownloadResult,
  type DownloadBridge,
} from './DownloadEngine';

const BRIDGE_OK: DownloadBridge = {
  enqueueDownload: vi.fn().mockResolvedValue({ nativeId: 42 }),
  getDownloadStatus: vi
    .fn()
    .mockResolvedValue({
      status: 'running',
      progressPercent: 50,
      bytesReceived: 500,
      totalBytes: 1000,
      localUri: '',
      mediaType: 'audio/mpeg',
      reason: '',
    }),
  cancelDownload: vi.fn().mockResolvedValue({ cancelled: true }),
  fileExists: vi.fn().mockResolvedValue({ exists: false }),
};

afterEach(() => {
  vi.clearAllMocks();
});

function newEngine(bridge = BRIDGE_OK) {
  return new NativeDownloadEngine(new MemoryStorage(), true, bridge);
}

const BASE_TASK = {
  providerId: 'jamendo',
  trackRef: '123',
  title: 'Spider',
  artist: 'Gims',
  sourceUrl: 'https://www.jamendo.com/track/123',
  fileUrl: 'https://api.jamendo.com/download/123.mp3',
  displayName: 'Gims - Spider.mp3',
};

describe('NativeDownloadEngine', () => {
  it('enfile un téléchargement autorisé via le pont natif', async () => {
    const engine = newEngine();
    try {
      const task = await engine.enqueue(BASE_TASK, 'content://folder');
      expect(task.status).toBe('queued');
      expect(task.nativeId).toBe(42);
      expect(task.displayName).toBe('Gims - Spider.mp3');
      expect(engine.list()).toHaveLength(1);
    } finally {
      engine.dispose();
    }
  });

  it('préserve les fichiers existants : nom suffixé, jamais d’écrasement', async () => {
    const bridge: DownloadBridge = {
      ...BRIDGE_OK,
      // Premier nom occupé, second libre — scénario réel.
      fileExists: vi
        .fn()
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValue({ exists: false }),
    };
    const engine = newEngine(bridge);
    try {
      const task = await engine.enqueue(BASE_TASK, 'content://folder');
      expect(task.displayName).toBe('Gims - Spider (2).mp3');
    } finally {
      engine.dispose();
    }
  });

  it('pont défectueux (toujours existant) : fallback borné, aucune boucle infinie', async () => {
    const bridge: DownloadBridge = {
      ...BRIDGE_OK,
      fileExists: vi.fn().mockResolvedValue({ exists: true }),
    };
    const engine = newEngine(bridge);
    try {
      const task = await engine.enqueue(BASE_TASK, 'content://folder');
      // Nom distinct du fichier cible — jamais d'écrasement.
      expect(task.displayName).not.toBe(BASE_TASK.displayName);
      expect(task.displayName.startsWith(BASE_TASK.displayName)).toBe(true);
    } finally {
      engine.dispose();
    }
  });

  it('suffixedName incrémente correctement', () => {
    expect(suffixedName('a.mp3', 2)).toBe('a (2).mp3');
    expect(suffixedName('sans-ext', 3)).toBe('sans-ext (3)');
  });

  it('progression réelle propagée depuis le système', async () => {
    const engine = newEngine();
    try {
      const task = await engine.enqueue(BASE_TASK, 'content://folder');
      await engine.refresh();
      const updated = engine.list().find((t) => t.id === task.id)!;
      expect(updated.status).toBe('downloading');
      expect(updated.progressPercent).toBe(50);
      expect(updated.bytesReceived).toBe(500);
    } finally {
      engine.dispose();
    }
  });

  it('téléchargement terminé ET valide (audio, taille > 0)', async () => {
    const bridge: DownloadBridge = {
      ...BRIDGE_OK,
      getDownloadStatus: vi.fn().mockResolvedValue({
        status: 'successful',
        progressPercent: 100,
        bytesReceived: 1000,
        totalBytes: 1000,
        localUri: 'content://downloads/1.mp3',
        mediaType: 'audio/mpeg',
        reason: '',
      }),
    };
    const engine = newEngine(bridge);
    try {
      const task = await engine.enqueue(BASE_TASK);
      await engine.refresh();
      const updated = engine.list().find((t) => t.id === task.id)!;
      expect(updated.status).toBe('done');
      expect(updated.localUri).toBe('content://downloads/1.mp3');
    } finally {
      engine.dispose();
    }
  });

  it('fichier reçu invalide → échec explicite (jamais un faux succès)', async () => {
    const bridge: DownloadBridge = {
      ...BRIDGE_OK,
      getDownloadStatus: vi.fn().mockResolvedValue({
        status: 'successful',
        progressPercent: 100,
        bytesReceived: 1000,
        totalBytes: 1000,
        localUri: 'content://downloads/1.html',
        mediaType: 'text/html',
        reason: '',
      }),
    };
    const engine = newEngine(bridge);
    try {
      const task = await engine.enqueue(
        { ...BASE_TASK, displayName: 'page.html' },
      );
      await engine.refresh();
      const updated = engine.list().find((t) => t.id === task.id)!;
      expect(updated.status).toBe('failed');
      expect(updated.error).toBe('DOWNLOAD_CONTENT_INVALID');
    } finally {
      engine.dispose();
    }
  });

  it('annulation d’une tâche active', async () => {
    const engine = newEngine();
    try {
      const task = await engine.enqueue(BASE_TASK);
      const cancelled = await engine.cancel(task.id);
      expect(cancelled).toBe(true);
      expect(engine.list().find((t) => t.id === task.id)!.status).toBe(
        'cancelled',
      );
    } finally {
      engine.dispose();
    }
  });

  it('hors application Android : refus honnête', async () => {
    const engine = new NativeDownloadEngine(new MemoryStorage(), false);
    await expect(engine.enqueue(BASE_TASK)).rejects.toThrow(
      'DOWNLOAD_NOT_NATIVE',
    );
  });

  it('persiste les tâches (file consultable après redémarrage)', async () => {
    const storage = new MemoryStorage();
    const engine = new NativeDownloadEngine(storage, true, BRIDGE_OK);
    try {
      await engine.enqueue(BASE_TASK);
    } finally {
      engine.dispose();
    }
    // « Redémarrage » : nouvelle instance, même stockage.
    const restarted = new NativeDownloadEngine(storage, true, BRIDGE_OK);
    try {
      expect(restarted.list()).toHaveLength(1);
      expect(restarted.list()[0]!.title).toBe('Spider');
    } finally {
      restarted.dispose();
    }
  });
});

describe('verifyDownloadResult', () => {
  it('audio valide', () => {
    expect(
      verifyDownloadResult({
        mediaType: 'audio/mpeg',
        bytesReceived: 100,
        displayName: 'a.mp3',
      }),
    ).toEqual({ valid: true });
  });

  it('extension audio reconnue même sans type MIME', () => {
    expect(
      verifyDownloadResult({
        mediaType: '',
        bytesReceived: 100,
        displayName: 'a.flac',
      }),
    ).toEqual({ valid: true });
  });

  it('fichier vide → invalide', () => {
    expect(
      verifyDownloadResult({
        mediaType: 'audio/mpeg',
        bytesReceived: 0,
        displayName: 'a.mp3',
      }).valid,
    ).toBe(false);
  });

  it('page HTML → invalide', () => {
    expect(
      verifyDownloadResult({
        mediaType: 'text/html',
        bytesReceived: 500,
        displayName: 'a.html',
      }).valid,
    ).toBe(false);
  });
});
