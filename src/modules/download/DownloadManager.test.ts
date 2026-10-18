import { describe, expect, it } from 'vitest';
import { DownloadManagerStub } from './DownloadManager';

const SOURCE: Parameters<DownloadManagerStub['queue']>[0] = {
  providerId: 'test',
  title: 'Spider',
  artist: 'Gims',
};

describe('DownloadManagerStub — garanties de l’étape 2', () => {
  it('n’écrase JAMAIS un fichier préexistant', async () => {
    const manager = new DownloadManagerStub(
      new Set(['content://musics/gims-spider.mp3']),
    );
    await expect(
      manager.queue(SOURCE, 'content://musics/gims-spider.mp3'),
    ).rejects.toThrow('DOWNLOAD_TARGET_EXISTS');
  });

  it('signale honnêtement que le moteur de téléchargement n’est pas implémenté', async () => {
    const manager = new DownloadManagerStub();
    expect(manager.operational).toBe(false);
    await expect(
      manager.queue(SOURCE, 'content://musics/nouveau.mp3'),
    ).rejects.toThrow('DOWNLOAD_NOT_IMPLEMENTED');
  });

  it('exist() reflète la réalité du système de fichiers', () => {
    const manager = new DownloadManagerStub(new Set(['content://a.mp3']));
    expect(manager.exists('content://a.mp3')).toBe(true);
    expect(manager.exists('content://b.mp3')).toBe(false);
  });
});
