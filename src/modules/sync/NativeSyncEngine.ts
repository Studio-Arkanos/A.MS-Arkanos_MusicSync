import type { AuthorizedDownloadProvider } from '../providers/types';
import type { DownloadTask, NewDownloadTask } from '../download/DownloadEngine';
import type { MatchCandidate } from '../duplicates/matcher';
import type { PlaylistAssociation } from '../association/association';
import { SyncPlanner } from './planner';
import { SyncEngineError, type SyncEngine, type SyncProgress, type SyncReport } from './SyncEngine';
import type { PlaylistAnalysis } from '../playlist/playlist';

/**
 * Moteur de synchronisation RÉEL (étape 4).
 *
 * Orchestration : analyse de playlist persistée
 * → planification (exclusions et décisions
 *   premières, jamais contournées) → association
 *   fournisseurs autorisés → file de téléchargement
 *   native (DownloadManager).
 *
 * Règles d'or :
 *  - jamais de téléchargement pour un morceau
 *    exclu, déjà présent ou en correspondance
 *    incertaine (décision requise) ;
 *  - fournisseurs SACHANT télécharger uniquement ;
 *  - aucune écriture directe : DownloadManager
 *    vérifie et nomme sans écraser ;
 *  - erreurs par morceau collectées, jamais
 *    masquées ;
 *  - progression réelle publiée par abonnement.
 */

export interface SyncEngineDeps {
  planner: SyncPlanner;
  association: PlaylistAssociation;
  /** Fournisseur de téléchargement autorisé par id. */
  downloadProviderFor: (providerId: string) => AuthorizedDownloadProvider | undefined;
  /** Enfilement natif (DownloadManager). */
  enqueueDownload: (task: NewDownloadTask, folderUri?: string) => Promise<DownloadTask>;
  loadAnalysis: () => PlaylistAnalysis | null;
  loadLibrary: () => MatchCandidate[];
  downloadFolderUri: () => string | undefined;
  isNative: boolean;
}

/** Caractères interdits dans un nom de fichier Android. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function sanitizeFilename(part: string): string {
  return part.replace(UNSAFE_FILENAME_CHARS, '-').trim();
}

function extensionFromUrl(url: string | undefined): string {
  const match = url ? /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url) : null;
  return match ? `.${match[1]!.toLowerCase()}` : '.mp3';
}

export class NativeSyncEngine implements SyncEngine {
  /** Moteur réel — mais l'exécution requiert Android. */
  readonly ready = true;

  private statusValue: 'idle' | 'running' | 'error' = 'idle';
  private progress: SyncProgress = {
    phase: 'idle',
    percent: 0,
    message: '',
  };
  private listeners = new Set<(progress: SyncProgress) => void>();

  constructor(private readonly deps: SyncEngineDeps) {}

  get status(): 'idle' | 'running' | 'error' {
    return this.statusValue;
  }

  subscribe(listener: (progress: SyncProgress) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sync(): Promise<SyncReport> {
    if (!this.deps.isNative) {
      throw new SyncEngineError(
        'NOT_NATIVE',
        'SYNC_NOT_NATIVE : l’exécution des téléchargements requiert l’application Android.',
      );
    }
    const analysis = this.deps.loadAnalysis();
    if (!analysis || analysis.status !== 'ok') {
      throw new SyncEngineError(
        'NOT_CONFIGURED',
        'SYNC_NOT_CONFIGURED : aucune analyse de playlist réussie. Analysez d’abord une playlist.',
      );
    }

    this.statusValue = 'running';
    const startedAt = new Date().toISOString();
    const report: SyncReport = {
      startedAt,
      finishedAt: '',
      analyzed: 0,
      alreadyPresent: 0,
      toDownload: 0,
      excluded: 0,
      pendingDecisions: 0,
      downloaded: 0,
      errors: [],
    };

    try {
      const sourceId = analysis.playlistId ?? '';
      const library = this.deps.loadLibrary();

      this.publish({ phase: 'analyzing', percent: 5, message: 'Planification…' });
      const { plans } = this.deps.planner.plan(
        analysis.tracks,
        library,
        sourceId,
      );
      report.analyzed = plans.length;

      // Comptage honnête du plan (aucun téléchargement ici).
      for (const plan of plans) {
        if (plan.matchState === 'present') report.alreadyPresent++;
        if (plan.excluded) report.excluded++;
        if (plan.matchState === 'uncertain') report.pendingDecisions++;
      }

      const candidates = plans.filter((plan) => plan.candidate);
      report.toDownload = candidates.length;

      let processed = 0;
      for (const plan of candidates) {
        this.publish({
          phase: 'downloading',
          percent: 10 + Math.floor((80 * processed) / Math.max(1, candidates.length)),
          message: plan.track.title,
        });
        processed++;
        try {
          const enqueued = await this.downloadCandidate(plan, library, sourceId);
          if (enqueued) report.downloaded++;
          else {
            report.errors.push(
              `Aucune version téléchargeable autorisée : ${plan.track.title}`,
            );
          }
        } catch (error) {
          report.errors.push(
            `${plan.track.title} : ${(error as Error).message}`,
          );
        }
      }

      this.publish({ phase: 'done', percent: 100, message: 'Terminé' });
      return report;
    } catch (error) {
      this.statusValue = 'error';
      this.publish({ phase: 'error', percent: 0, message: 'Échec' });
      throw error;
    } finally {
      report.finishedAt = new Date().toISOString();
      if (this.statusValue === 'running') this.statusValue = 'idle';
      this.publish({ ...this.progress });
    }
  }

  /**
   * Association → fournisseur autorisé → file native.
   * Vrai si un téléchargement a été enfilé.
   */
  private async downloadCandidate(
    plan: { track: { title: string; artist: string; ref: string } },
    library: MatchCandidate[],
    sourceId: string,
  ): Promise<boolean> {
    const versions = await this.deps.association.findDownloadableVersions(
      { title: plan.track.title, artist: plan.track.artist },
      library,
      sourceId,
      plan.track.ref ?? '',
    );

    // Meilleur candidat éligible (score décroissant,
    // exclusions déjà appliquées par l'association).
    const best = versions.find(
      (candidate) =>
        candidate.eligible &&
        candidate.item.downloadable &&
        candidate.item.downloadUrl,
    );
    if (!best) return false;

    const provider = this.deps.downloadProviderFor(best.item.providerId);
    if (!provider || !provider.canDownload(best.item)) return false;

    const request = await provider.getDownloadRequest(best.item);
    const artist = sanitizeFilename(plan.track.artist || 'inconnu');
    const title = sanitizeFilename(plan.track.title || 'morceau');
    const task: NewDownloadTask = {
      providerId: best.item.providerId,
      trackRef: best.item.ref,
      title: plan.track.title,
      artist: plan.track.artist,
      sourceUrl: request.url || best.item.sourceUrl,
      fileUrl: request.url,
      displayName: `${artist} - ${title}${extensionFromUrl(request.url)}`,
      license: request.license ?? best.item.license,
    };
    await this.deps.enqueueDownload(task, this.deps.downloadFolderUri());
    return true;
  }

  private publish(progress: SyncProgress): void {
    this.progress = progress;
    this.listeners.forEach((listener) => listener(progress));
  }
}
