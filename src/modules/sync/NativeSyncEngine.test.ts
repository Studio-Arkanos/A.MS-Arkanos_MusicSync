import { describe, expect, it, vi } from 'vitest';
import { NativeSyncEngine } from './NativeSyncEngine';
import { SyncPlanner } from './planner';
import { DuplicateMatcher } from '../duplicates/matcher';
import { PersistedExclusionStore } from '../exclusions/exclusions';
import { MemoryStorage } from '../../app/storage';
import { SyncEngineError } from './SyncEngine';
import type { PlaylistAnalysis } from '../playlist/playlist';
import type { PlaylistAssociation } from '../association/association';
import type { AuthorizedDownloadProvider, SearchResultItem } from '../providers/types';
import type { DownloadTask, NewDownloadTask } from '../download/DownloadEngine';
import type { MatchCandidate } from '../duplicates/matcher';

/** Analyse de playlist de référence. */
const analysis: PlaylistAnalysis = {
  status: 'ok',
  playlistId: 'pl-zenith',
  analyzedAt: new Date().toISOString(),
  errors: [],
  tracks: [
    { ref: 'v1', title: 'Spider', artist: 'Gims', availability: 'available', source: 'youtube' },
    { ref: 'v2', title: 'Déjà là', artist: 'Gims', availability: 'available', source: 'youtube' },
    { ref: 'v3', title: 'Exclu', artist: 'Artiste', availability: 'available', source: 'youtube' },
    { ref: 'v4', title: 'Incertain', artist: 'Artiste', availability: 'available', source: 'youtube' },
    { ref: 'v5', title: 'Aucun fournisseur', artist: 'Artiste', availability: 'available', source: 'youtube' },
  ],
};

/** Bibliothèque locale : « Déjà là » présent, « Incertaint »
 *  (faute de frappe réelle) en correspondance INCERTRAINE. */
const library: MatchCandidate[] = [
  { id: 'content://deja-la.mp3', title: 'Déjà là', artist: 'Gims' },
  { id: 'content://presque.mp3', title: 'Incertaint', artist: 'Artiste' },
];

const jamendoItem = (ref: string, title: string): SearchResultItem => ({
  ref,
  providerId: 'jamendo',
  title,
  artist: 'Gims',
  type: 'track',
  downloadable: true,
  sourceUrl: `https://www.jamendo.com/track/${ref}`,
  downloadUrl: `https://api.jamendo.com/download/${ref}.mp3`,
  license: 'CC-BY',
});

function fakeAssociation(
  versionsByTitle: Map<string, SearchResultItem | null>,
): PlaylistAssociation {
  return {
    findDownloadableVersions: vi.fn(async (track: { title: string }) => {
      const item = versionsByTitle.get(track.title) ?? null;
      return item
        ? [
            {
              item,
              matchState: 'absent' as const,
              score: 0.99,
              excluded: false,
              eligible: true,
              reason: 'version autorisée candidate',
            },
          ]
        : [];
    }),
  } as unknown as PlaylistAssociation;
}

const jamendoProvider: AuthorizedDownloadProvider = {
  id: 'jamendo',
  label: 'Jamendo',
  capabilities: { search: true, metadata: true, download: true, playlist: false, local: false },
  isConfigured: () => true,
  canDownload: (item: SearchResultItem) => item.downloadable,
  getDownloadRequest: async (item: SearchResultItem) => ({
    url: item.downloadUrl ?? '',
    displayName: `${item.title}.mp3`,
    license: item.license,
  }),
};

function makeEngine(
  association: PlaylistAssociation,
  enqueue = vi.fn(async (): Promise<DownloadTask> => ({
    id: 'dl-1',
    providerId: 'jamendo',
    trackRef: 'j1',
    title: 'Spider',
    artist: 'Gims',
    sourceUrl: '',
    fileUrl: '',
    displayName: 'Gims - Spider.mp3',
    status: 'queued',
    progressPercent: 0,
    bytesReceived: 0,
    totalBytes: 0,
    queuedAt: new Date().toISOString(),
  })),
) {
  const exclusionStore = new PersistedExclusionStore(new MemoryStorage());
  exclusionStore.exclude('pl-zenith', 'v3', { title: 'Exclu', artist: 'Artiste' });
  const planner = new SyncPlanner(
    new DuplicateMatcher(),
    exclusionStore,
    () => null,
  );
  return {
    engine: new NativeSyncEngine({
      planner,
      association,
      downloadProviderFor: () => jamendoProvider,
      enqueueDownload: enqueue as unknown as (
        task: NewDownloadTask,
        folderUri?: string,
      ) => Promise<DownloadTask>,
      loadAnalysis: () => analysis,
      loadLibrary: () => library,
      downloadFolderUri: () => 'content://downloads',
      isNative: true,
    }),
    enqueue,
  };
}

describe('NativeSyncEngine (orchestration réelle)', () => {
  it('refuse honnêtement hors application Android', async () => {
    const webEngine = new NativeSyncEngine({
      planner: new SyncPlanner(new DuplicateMatcher(), new PersistedExclusionStore(new MemoryStorage())),
      association: fakeAssociation(new Map()),
      downloadProviderFor: () => jamendoProvider,
      enqueueDownload: vi.fn(),
      loadAnalysis: () => analysis,
      loadLibrary: () => library,
      downloadFolderUri: () => undefined,
      isNative: false,
    });
    await expect(webEngine.sync()).rejects.toThrow(SyncEngineError);
    await expect(webEngine.sync()).rejects.toThrow('SYNC_NOT_NATIVE');
  });

  it('n’écrase jamais : un seul enfilement par candidat éligible', async () => {
    const versions = new Map<string, SearchResultItem | null>([
      ['Spider', jamendoItem('j1', 'Spider')],
      ['Déjà là', null],
      ['Exclu', null],
      ['Incertain', null],
      ['Aucun fournisseur', null],
    ]);
    const { engine, enqueue } = makeEngine(fakeAssociation(versions));
    const report = await engine.sync();
    expect(report.analyzed).toBe(5);
    expect(report.alreadyPresent).toBe(1);
    expect(report.excluded).toBe(1);
    expect(report.pendingDecisions).toBe(1);
    expect(report.toDownload).toBe(2); // Spider + Aucun fournisseur
    expect(enqueue).toHaveBeenCalledTimes(1); // seul Spider a une version
    expect(report.downloaded).toBe(1);
    expect(report.errors).toHaveLength(1); // aucune version pour le 5e
    expect(report.errors[0]).toContain('Aucun fournisseur');
  });

  it('l’exclusion prime : jamais d’enfilement pour un morceau exclu', async () => {
    const versions = new Map<string, SearchResultItem | null>([
      ['Spider', null],
      ['Déjà là', null],
      ['Exclu', jamendoItem('j3', 'Exclu')], // exclu : jamais téléchargé
      ['Incertain', null],
      ['Aucun fournisseur', null],
    ]);
    const { engine, enqueue } = makeEngine(fakeAssociation(versions));
    const report = await engine.sync();
    expect(enqueue).not.toHaveBeenCalled();
    expect(report.excluded).toBe(1);
    expect(report.downloaded).toBe(0);
  });

  it('correspondance incertaine : décision en attente, jamais téléchargée', async () => {
    const versions = new Map<string, SearchResultItem | null>([
      ['Spider', null],
      ['Déjà là', null],
      ['Exclu', null],
      ['Incertain', jamendoItem('j4', 'Incertain')],
      ['Aucun fournisseur', null],
    ]);
    const { engine, enqueue } = makeEngine(fakeAssociation(versions));
    const report = await engine.sync();
    expect(enqueue).not.toHaveBeenCalled();
    expect(report.pendingDecisions).toBe(1);
  });

  it('progression réelle publiée par abonnement', async () => {
    const seen: string[] = [];
    const versions = new Map<string, SearchResultItem | null>([
      ['Spider', jamendoItem('j1', 'Spider')],
      ['Déjà là', null],
      ['Exclu', null],
      ['Incertain', null],
      ['Aucun fournisseur', null],
    ]);
    const { engine } = makeEngine(fakeAssociation(versions));
    const unsubscribe = engine.subscribe((progress) => {
      seen.push(progress.phase);
    });
    await engine.sync();
    unsubscribe();
    expect(seen).toContain('analyzing');
    expect(seen).toContain('downloading');
    expect(seen[seen.length - 1]).toBe('done');
  });

  it('échec d’enfilement collecté, jamais masqué', async () => {
    const versions = new Map<string, SearchResultItem | null>([
      ['Spider', jamendoItem('j1', 'Spider')],
      ['Déjà là', null],
      ['Exclu', null],
      ['Incertain', null],
      ['Aucun fournisseur', null],
    ]);
    const failing = vi.fn(async (): Promise<DownloadTask> => {
      throw new Error('DOWNLOAD_TARGET_EXISTS');
    });
    const { engine } = makeEngine(fakeAssociation(versions), failing);
    const report = await engine.sync();
    expect(report.downloaded).toBe(0);
    expect(report.errors[0]).toContain('DOWNLOAD_TARGET_EXISTS');
  });

  it('sans analyse réussie : erreur explicite, rien téléchargé', async () => {
    const exclusionStore = new PersistedExclusionStore(new MemoryStorage());
    const planner = new SyncPlanner(new DuplicateMatcher(), exclusionStore);
    const engine = new NativeSyncEngine({
      planner,
      association: fakeAssociation(new Map()),
      downloadProviderFor: () => jamendoProvider,
      enqueueDownload: vi.fn(),
      loadAnalysis: () => null,
      loadLibrary: () => library,
      downloadFolderUri: () => undefined,
      isNative: true,
    });
    await expect(engine.sync()).rejects.toThrow('SYNC_NOT_CONFIGURED');
  });
});
