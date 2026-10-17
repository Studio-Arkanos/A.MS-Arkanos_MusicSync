import { describe, expect, it } from 'vitest';
import { LocalScannerStub } from './scanner';

describe('LocalScannerStub (étape 1)', () => {
  it('n’est pas opérationnel et ne fabrique aucune donnée', async () => {
    const scanner = new LocalScannerStub();
    expect(scanner.operational).toBe(false);

    const result = await scanner.scan();
    expect(result.status).toBe('not_operational');
    expect(result.tracks).toEqual([]); // jamais de faux morceaux
    expect(result.reason).toContain('SCAN_NOT_IMPLEMENTED');
  });
});
