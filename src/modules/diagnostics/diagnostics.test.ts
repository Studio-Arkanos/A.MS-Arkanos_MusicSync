import { describe, expect, it } from 'vitest';
import {
  buildDiagnosticReport,
  formatDiagnosticReport,
  type DiagnosticContext,
} from './diagnostics';

function context(
  overrides: Partial<DiagnosticContext> = {},
): DiagnosticContext {
  return {
    isNative: false,
    appVersion: '0.1.0',
    libraryFolder: '',
    libraryScanned: false,
    libraryTrackCount: 0,
    downloadFolderUri: '',
    jamendoConfigured: false,
    youtubeConfigured: false,
    downloadEngineAvailable: false,
    roomBridgeConnected: false,
    backgroundScheduled: false,
    online: true,
    storageWritable: true,
    ...overrides,
  };
}

describe('buildDiagnosticReport', () => {
  it('ne déclare jamais tout opérationnel (contexte web nu)', () => {
    const entries = buildDiagnosticReport(context());
    const byComponent = new Map(entries.map((e) => [e.component, e]));
    // Aucun composant critique n'est « opérationnel » sans preuve :
    // (connectivité + version d'application sont les seules légitimes).
    expect(byComponent.get('database')!.state).toBe('limited');
    expect(byComponent.get('permissions')!.state).toBe('untested');
    expect(byComponent.get('storage')!.state).toBe('permission_required');
    expect(byComponent.get('localLibrary')!.state).toBe('untested');
    expect(byComponent.get('providerJamendo')!.state).toBe('limited');
    expect(byComponent.get('providerYoutube')!.state).toBe('limited');
    expect(byComponent.get('downloadEngine')!.state).toBe('unavailable');
    expect(byComponent.get('conversion')!.state).toBe('unavailable');
    expect(byComponent.get('notifications')!.state).toBe('untested');
    expect(byComponent.get('background')!.state).toBe('unavailable');
    expect(byComponent.get('androidVersion')!.state).toBe('untested');
  });

  it('contexte Android complet : états réels distingués', () => {
    const entries = buildDiagnosticReport(
      context({
        isNative: true,
        androidVersion: '14',
        sdkInt: 34,
        notificationPermissionGranted: true,
        libraryFolder: 'content://music',
        libraryScanned: true,
        libraryTrackCount: 42,
        jamendoConfigured: true,
        youtubeConfigured: true,
        downloadEngineAvailable: true,
        backgroundScheduled: true,
      }),
    );
    const byComponent = new Map(entries.map((e) => [e.component, e]));
    expect(byComponent.get('database')!.state).toBe('limited'); // pont Room non connecté
    expect(byComponent.get('permissions')!.state).toBe('operational');
    expect(byComponent.get('storage')!.state).toBe('operational');
    expect(byComponent.get('localLibrary')!.state).toBe('operational');
    expect(byComponent.get('connectivity')!.state).toBe('operational');
    expect(byComponent.get('providerJamendo')!.state).toBe('operational');
    expect(byComponent.get('providerYoutube')!.state).toBe('operational');
    expect(byComponent.get('downloadEngine')!.state).toBe('operational');
    expect(byComponent.get('conversion')!.state).toBe('unavailable'); // jamais opérationnel
    expect(byComponent.get('notifications')!.state).toBe('operational');
    expect(byComponent.get('background')!.state).toBe('operational');
    expect(byComponent.get('androidVersion')!.state).toBe('operational');
    expect(byComponent.get('appVersion')!.state).toBe('operational');
  });

  it('hors ligne : connectivité en erreur, consultation locale possible', () => {
    const entries = buildDiagnosticReport(context({ online: false }));
    const connectivity = entries.find((e) => e.component === 'connectivity')!;
    expect(connectivity.state).toBe('error');
    expect(connectivity.detail).toContain('consultation locale');
  });

  it('permission refusée : état explicite, jamais masqué', () => {
    const entries = buildDiagnosticReport(
      context({ isNative: true, notificationPermissionGranted: false }),
    );
    const permissions = entries.find((e) => e.component === 'permissions')!;
    expect(permissions.state).toBe('permission_required');
    const notifications = entries.find((e) => e.component === 'notifications')!;
    expect(notifications.state).toBe('permission_required');
  });

  it('bibliothèque scannée mais vide : limité, pas une erreur', () => {
    const entries = buildDiagnosticReport(
      context({ libraryScanned: true, libraryTrackCount: 0 }),
    );
    const localLibrary = entries.find((e) => e.component === 'localLibrary')!;
    expect(localLibrary.state).toBe('limited');
  });
});

describe('formatDiagnosticReport', () => {
  it('export JSON valide, sans données de morceaux', () => {
    const entries = buildDiagnosticReport(context());
    const json = formatDiagnosticReport(entries, '2026-10-19T00:00:00.000Z');
    const parsed = JSON.parse(json) as {
      application: string;
      entries: Array<{ component: string; state: string }>;
    };
    expect(parsed.application).toContain('A.MS');
    expect(parsed.entries.length).toBe(entries.length);
    expect(json).not.toContain('Spider'); // aucun titre utilisateur
  });
});
