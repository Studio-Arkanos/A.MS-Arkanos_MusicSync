import { describe, expect, it } from 'vitest';
import { fileToTrack, LocalLibraryScanner } from './scanner';
import type { ScannedFile } from './scanner';

/** Dossier par défaut du cahier des charges. */
const DEFAULT_FOLDER = '/storage/emulated/0/Music/Musics';

const AUDIO_FILES: ScannedFile[] = [
  { name: 'Gims - Spider (Clip Officiel).mp3', uri: 'content://a.mp3', sizeBytes: 8_000_000 },
  { name: 'Daft Punk - One More Time.flac', uri: 'content://b.flac', sizeBytes: 30_000_000 },
  { name: 'Song.m4a', uri: 'content://c.m4a', sizeBytes: 5_000_000 },
  { name: 'Song.aac', uri: 'content://d.aac', sizeBytes: 5_000_000 },
  { name: 'Song.ogg', uri: 'content://e.ogg', sizeBytes: 5_000_000 },
  { name: 'Song.wav', uri: 'content://f.wav', sizeBytes: 5_000_000 },
];

describe('LocalLibraryScanner', () => {
  it('détecte les formats MP3, M4A, AAC, FLAC, OGG et WAV', async () => {
    const scanner = new LocalLibraryScanner(async () => AUDIO_FILES, true);
    const result = await scanner.scan(DEFAULT_FOLDER);
    expect(result.status).toBe('ok');
    expect(result.tracks).toHaveLength(AUDIO_FILES.length);
  });

  it('ignore les fichiers non audio (images, vidéos, documents)', async () => {
    const scanner = new LocalLibraryScanner(
      async () => [
        ...AUDIO_FILES,
        { name: 'cover.jpg', uri: 'content://img', sizeBytes: 100_000 },
        { name: 'clip.mp4', uri: 'content://vid', sizeBytes: 10_000_000 },
        { name: 'notes.txt', uri: 'content://txt', sizeBytes: 1_000 },
      ],
      true,
    );
    const result = await scanner.scan(DEFAULT_FOLDER);
    expect(result.tracks).toHaveLength(AUDIO_FILES.length);
  });

  it('reconnait un fichier SANS métadonnée : le nom de fichier suffit', async () => {
    const scanner = new LocalLibraryScanner(async () => AUDIO_FILES, true);
    const result = await scanner.scan(DEFAULT_FOLDER);
    const first = result.tracks[0]!;
    expect(first.title).toBe('spider');
    expect(first.artist).toBe('gims');
    expect(first.source).toBe('local');
  });

  it('fichier sans séparateur artiste/titre : titre conservé, artiste « inconnu »', () => {
    const track = fileToTrack({ name: 'morceau_sans_meta.mp3', uri: 'content://y.mp3', sizeBytes: 1 });
    expect(track.title).toBe('morceau sans meta');
    expect(track.artist).toBe('Artiste inconnu');
  });

  it('dossier vide → scan réussi, zéro fichier (≠ erreur)', async () => {
    const scanner = new LocalLibraryScanner(async () => [], true);
    const result = await scanner.scan(DEFAULT_FOLDER);
    expect(result.status).toBe('ok');
    expect(result.files).toEqual([]);
    expect(result.tracks).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.scannedAt).toBeDefined();
  });

  it('dossier inaccessible → statut « error » explicite', async () => {
    const scanner = new LocalLibraryScanner(
      async () => {
        throw new Error('SAF permission revoked');
      },
      true,
    );
    const result = await scanner.scan('content://refusé');
    expect(result.status).toBe('error');
    expect(result.errors[0]).toContain('dossier inaccessible');
  });

  it('hors application Android → « not_operational » honnête', async () => {
    const scanner = new LocalLibraryScanner(async () => AUDIO_FILES, false);
    const result = await scanner.scan(DEFAULT_FOLDER);
    expect(result.status).toBe('not_operational');
    expect(result.tracks).toEqual([]);
  });
});
