import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../app/storage';
import { PersistedDecisionStore } from '../decisions/decisions';
import { PersistedExclusionStore } from '../exclusions/exclusions';
import { DuplicateMatcher } from '../duplicates/matcher';
import { SyncPlanner } from './planner';

const SOURCE = 'PL-Res9ahnuezOhvq6KlPTL4s61BKdr-Ub';

function makePlanner(
  storage = new MemoryStorage(),
  decisions = new PersistedDecisionStore(storage),
) {
  const exclusions = new PersistedExclusionStore(storage);
  return {
    exclusions,
    planner: new SyncPlanner(
      new DuplicateMatcher(),
      exclusions,
      (sourceId, trackRef) => decisions.resolutionFor(sourceId, trackRef),
    ),
  };
}

const LIBRARY_EMPTY: Array<{ id: string; title: string; artist: string }> = [];

const LIBRARY_FULL = [
  { id: 'l1', title: 'Spider', artist: 'Gims' },
  { id: 'l2', title: 'Autre Chose', artist: 'Gims' },
];

const PLAYLIST = [
  {
    ref: 'vid-1',
    title: 'GIMS - Spider (Official Music Video)',
    artist: '',
    availability: 'available' as const,
    source: 'youtube',
  },
  {
    ref: 'vid-2',
    title: 'GIMS - Spider (Remix)',
    artist: '',
    availability: 'available' as const,
    source: 'youtube',
  },
  {
    ref: 'vid-3',
    title: 'Autre Chose',
    artist: '',
    availability: 'available' as const,
    source: 'youtube',
  },
  {
    ref: 'vid-4',
    title: 'Vidéo supprimée',
    artist: '',
    availability: 'unavailable' as const,
    source: 'youtube',
  },
];

describe('SyncPlanner — règles de synchronisation', () => {
  it('bibliothèque vide : tout morceau admissible est candidat sauf exclusions', () => {
    const { planner } = makePlanner();
    const { plans, summary } = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    expect(summary.candidates).toBe(3); // vid-1, vid-2, vid-3
    expect(summary.unavailable).toBe(1); // vid-4
    expect(plans[0]!.candidate).toBe(true);
    expect(plans[3]!.candidate).toBe(false);
    expect(plans[3]!.matchState).toBe('unavailable');
  });

  it('bibliothèque remplie sans correspondance : candidats inchangés', () => {
    const { planner } = makePlanner();
    const autreBiblio = [
      { id: 'z1', title: 'Rien À Voir', artist: 'Personne' },
    ];
    const { summary } = planner.plan(PLAYLIST, autreBiblio, SOURCE);
    expect(summary.candidates).toBe(3);
    expect(summary.present).toBe(0);
  });

  it('synchronisation partielle : seuls les morceaux manquants sont candidats', () => {
    const { planner } = makePlanner();
    const { plans, summary } = planner.plan(PLAYLIST, LIBRARY_FULL, SOURCE);
    // vid-1 (Spider) → présent ; vid-3 (Autre Chose) → présent
    expect(summary.present).toBe(2);
    // vid-2 (Spider Remix) → incertain (version divergente)
    expect(summary.uncertain).toBe(1);
    expect(plans[0]!.candidate).toBe(false); // déjà présent
    expect(plans[1]!.candidate).toBe(false); // incertain → décision requise
    expect(plans[1]!.matchState).toBe('uncertain');
    expect(plans[2]!.candidate).toBe(false); // déjà présent
  });

  it('bibliothèque synchronisée : aucun candidat (rien de téléchargé inutilement)', () => {
    const { planner } = makePlanner();
    const synced = [
      { id: 'l1', title: 'Spider', artist: 'Gims' },
      { id: 'l2', title: 'Spider Remix', artist: 'Gims' },
      { id: 'l3', title: 'Autre Chose', artist: 'Gims' },
    ];
    const { summary, plans } = planner.plan(PLAYLIST, synced, SOURCE);
    expect(summary.candidates).toBe(0);
    expect(plans.every((plan) => !plan.candidate)).toBe(true);
  });

  it('une exclusion prime sur l’automatisme : le morceau n’est jamais candidat', () => {
    const { planner, exclusions } = makePlanner();
    exclusions.exclude(SOURCE, 'vid-1', { title: 'Spider', artist: 'Gims' });
    const { plans, summary } = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    expect(plans[0]!.candidate).toBe(false);
    expect(plans[0]!.excluded).toBe(true);
    expect(plans[0]!.matchState).toBe('absent'); // absent MAIS exclu
    expect(summary.excluded).toBe(1);
    expect(summary.candidates).toBe(2);
  });

  it('une exclusion survit à une nouvelle analyse de playlist', () => {
    const backend = new MemoryStorage();
    const { exclusions, planner } = makePlanner(backend);
    exclusions.exclude(SOURCE, 'vid-1', { title: 'Spider', artist: 'Gims' });

    const premier = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    // « Nouvelle analyse » : même playlist réanalysée.
    const second = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    expect(second.plans[0]!.excluded).toBe(true);
    expect(premier.summary.excluded).toBe(1);
  });

  it('correspondance incertaine → jamais candidat automatique (décision requise)', () => {
    const { planner } = makePlanner();
    const { plans } = planner.plan(PLAYLIST, LIBRARY_FULL, SOURCE);
    const remix = plans.find((plan) => plan.track.ref === 'vid-2')!;
    expect(remix.matchState).toBe('uncertain');
    expect(remix.candidate).toBe(false);
  });

  it('une décision « Déjà présent » lève l’incertitude', () => {
    const storage = new MemoryStorage();
    const decisions = new PersistedDecisionStore(storage);
    decisions.create({
      sourceId: SOURCE,
      trackRef: 'vid-2',
      title: 'Spider (Remix)',
      artist: 'Gims',
      kind: 'uncertain_match',
    });
    // L’utilisateur confirme : c’est le même morceau déjà présent.
    const pending = decisions.listPending();
    decisions.resolve(pending[0]!.id, 'present');

    const { planner } = makePlanner(storage, decisions);
    const { plans } = planner.plan(PLAYLIST, LIBRARY_FULL, SOURCE);
    const remix = plans.find((plan) => plan.track.ref === 'vid-2')!;
    expect(remix.matchState).toBe('present');
    expect(remix.candidate).toBe(false);
  });

  it('une décision « Ignorer » retire le morceau des candidats', () => {
    const storage = new MemoryStorage();
    const decisions = new PersistedDecisionStore(storage);
    const decision = decisions.create({
      sourceId: SOURCE,
      trackRef: 'vid-1',
      title: 'Spider', artist: 'Gims', kind: 'uncertain_match',
    });
    decisions.resolve(decision.id, 'ignore');

    const { planner } = makePlanner(storage, decisions);
    const { plans } = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    expect(plans[0]!.candidate).toBe(false);
    expect(plans[0]!.reason).toContain('ignoré');
  });

  it('résumé complet avant toute opération', () => {
    const { planner } = makePlanner();
    const { summary } = planner.plan(PLAYLIST, LIBRARY_EMPTY, SOURCE);
    expect(summary).toEqual({
      found: 3,
      present: 0,
      absent: 3,
      uncertain: 0,
      excluded: 0,
      unavailable: 1,
      candidates: 3,
    });
  });
});
