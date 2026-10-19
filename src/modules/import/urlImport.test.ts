import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { JamendoProvider } from '../providers/jamendo';
import { NativeDownloadEngine, type DownloadBridge } from '../download/DownloadEngine';
import { UrlImportService, type ImportBridge } from './urlImport';

afterEach(() => {
  vi.unstubAllGlobals();
});

const BRIDGE: DownloadBridge = {
  enqueueDownload: vi.fn().mockResolvedValue({ nativeId: 7 }),
  getDownloadStatus: vi.fn().mockResolvedValue({
    status: 'queued',
    progressPercent: 0,
    bytesReceived: 0,
    totalBytes: 0,
    localUri: '',
    mediaType: '',
    reason: '',
  }),
  cancelDownload: vi.fn().mockResolvedValue({ cancelled: true }),
  fileExists: vi.fn().mockResolvedValue({ exists: false }),
};

function makeService(jamendo: JamendoProvider, probeImpl?: ImportBridge['probeUrl']) {
  const engine = new NativeDownloadEngine(
    new MemoryStorage(),
    true,
    BRIDGE,
  );
  const bridge = {
    probeUrl: probeImpl ?? (async () => ({ statusCode: 200, contentType: 'audio/mpeg', contentLength: 1000 })),
  };
  return { service: new UrlImportService(jamendo, engine, bridge), engine };
}

const jamendo = new JamendoProvider(() => 'client-id');

const JAMENDO_TRACK = {
  headers: { status: 'success' },
  results: [
    {
      id: 555,
      name: 'Song',
      artist_name: 'Artist',
      audiodownload_allowed: true,
      audiodownload: 'https://api.jamendo.com/download/555.mp3',
      licensing: [{ name: 'CC BY 3.0' }],
    },
  ],
};

describe('UrlImportService', () => {
  it('URL Jamendo autorisée → téléchargement en file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => JAMENDO_TRACK,
      } as Response),
    );
    const { service, engine } = makeService(jamendo);
    try {
      const outcome = await service.importUrl(
        'https://www.jamendo.com/track/555',
        'content://folder',
      );
      expect(outcome.status).toBe('queued');
      if (outcome.status === 'queued') {
        expect(outcome.task.title).toBe('Song');
        expect(outcome.task.providerId).toBe('jamendo');
      }
    } finally {
      engine.dispose();
    }
  });

  it('URL Jamendo sans téléchargement autorisé → ouverture uniquement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: 'success' },
          results: [
            {
              id: 555,
              name: 'Song',
              artist_name: 'Artist',
              audiodownload_allowed: false,
              audiodownload: '',
            },
          ],
        }),
      } as Response),
    );
    const { service, engine } = makeService(jamendo);
    try {
      const outcome = await service.importUrl(
        'https://www.jamendo.com/track/555',
      );
      expect(outcome.status).toBe('open_only');
    } finally {
      engine.dispose();
    }
  });

  it('URL YouTube → jamais d’extraction, ouverture uniquement', async () => {
    const { service, engine } = makeService(jamendo);
    try {
      const outcome = await service.importUrl(
        'https://www.youtube.com/watch?v=abc',
      );
      expect(outcome.status).toBe('open_only');
      if (outcome.status === 'open_only') {
        expect(outcome.reason).toContain('YOUTUBE_NO_EXTRACTION');
      }
    } finally {
      engine.dispose();
    }
  });

  it('URL invalide → refus', async () => {
    const { service, engine } = makeService(jamendo);
    try {
      const outcome = await service.importUrl('pas-une-url');
      expect(outcome.status).toBe('refused');
    } finally {
      engine.dispose();
    }
  });

  it('page web non-audio → refus (aucune intégration officielle)', async () => {
    const { service, engine } = makeService(
      jamendo,
      async () => ({ statusCode: 200, contentType: 'text/html', contentLength: 1234 }),
    );
    try {
      const outcome = await service.importUrl('https://example.com/page');
      expect(outcome.status).toBe('refused');
      if (outcome.status === 'refused') {
        expect(outcome.reason).toContain('NOT_AN_AUDIO_RESOURCE');
      }
    } finally {
      engine.dispose();
    }
  });

  it('ressource audio directe vérifiée → téléchargement autorisé', async () => {
    const { service, engine } = makeService(jamendo);
    try {
      const outcome = await service.importUrl(
        'https://files.example.com/morceau.mp3',
      );
      expect(outcome.status).toBe('queued');
    } finally {
      engine.dispose();
    }
  });

  it('sonde échouée → erreur honnête', async () => {
    const { service, engine } = makeService(
      jamendo,
      async () => {
        throw new Error('timeout');
      },
    );
    try {
      const outcome = await service.importUrl('https://files.example.com/a.mp3');
      expect(outcome.status).toBe('error');
    } finally {
      engine.dispose();
    }
  });
});
