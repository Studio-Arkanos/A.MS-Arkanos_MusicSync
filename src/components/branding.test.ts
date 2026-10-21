import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

function getPngDimensions(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;
  if (!isPng) {
    throw new Error(`Fichier non PNG : ${filePath}`);
  }
  // IHDR width is at offset 16, height at 20 (big-endian 32-bit uint)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('Ressources graphiques & Branding A.MS', () => {
  it('préserve le fichier ams-logo.png original sans corruption dans public/branding', () => {
    const rootPath = resolve('ams-logo.png');
    const brandingPath = resolve('public/branding/ams-logo.png');

    expect(existsSync(rootPath)).toBe(true);
    expect(existsSync(brandingPath)).toBe(true);

    const rootBuf = readFileSync(rootPath);
    const brandingBuf = readFileSync(brandingPath);

    const rootHash = createHash('sha256').update(rootBuf).digest('hex');
    const brandingHash = createHash('sha256').update(brandingBuf).digest('hex');

    expect(brandingHash).toBe(rootHash);
    expect(rootHash).toBe('e8624519a2442a80fb669f3a4cfa4494c884b1370691f7fcc43a3695cdf19706');

    const dims = getPngDimensions(brandingPath);
    expect(dims.width).toBe(1254);
    expect(dims.height).toBe(1254);
  });

  it('génère le symbole transparent et les déclinaisons web', () => {
    const symbolPath = resolve('public/branding/ams-symbol.png');
    const badgePath = resolve('public/branding/ams-badge.png');
    const favPath = resolve('public/branding/favicon.png');

    expect(existsSync(symbolPath)).toBe(true);
    expect(existsSync(badgePath)).toBe(true);
    expect(existsSync(favPath)).toBe(true);

    expect(getPnPn(symbolPath)).toEqual({ width: 1024, height: 1024 });
    expect(getPnPn(badgePath)).toEqual({ width: 1254, height: 1254 });
    expect(getPnPn(favPath)).toEqual({ width: 64, height: 64 });

    for (const sz of [64, 128, 192, 512]) {
      const p = resolve(`public/branding/ams-symbol-${sz}.png`);
      expect(existsSync(p)).toBe(true);
      expect(getPnPn(p)).toEqual({ width: sz, height: sz });
    }
  });

  it('génère toutes les icônes Android adaptatives (ic_launcher_foreground) aux ratios exacts', () => {
    const expectedSizes: Record<string, number> = {
      mdpi: 108,
      hdpi: 162,
      xhdpi: 216,
      xxhdpi: 324,
      xxxhdpi: 432,
    };

    for (const [density, size] of Object.entries(expectedSizes)) {
      const path = resolve(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`);
      expect(existsSync(path)).toBe(true);
      const dims = getPngDimensions(path);
      expect(dims.width).toBe(size);
      expect(dims.height).toBe(size);
    }
  });

  it('génère toutes les icônes Android legacy (ic_launcher et ic_launcher_round)', () => {
    const expectedSizes: Record<string, number> = {
      mdpi: 48,
      hdpi: 72,
      xhdpi: 96,
      xxhdpi: 144,
      xxxhdpi: 192,
    };

    for (const [density, size] of Object.entries(expectedSizes)) {
      const sqPath = resolve(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
      const roundPath = resolve(`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`);

      expect(existsSync(sqPath)).toBe(true);
      expect(existsSync(roundPath)).toBe(true);

      expect(getPnPn(sqPath)).toEqual({ width: size, height: size });
      expect(getPnPn(roundPath)).toEqual({ width: size, height: size });
    }
  });

  it('vérifie la couleur de fond officielle #0B1220 pour l’icône adaptative', () => {
    const valuesPath = resolve('android/app/src/main/res/values/ic_launcher_background.xml');
    expect(existsSync(valuesPath)).toBe(true);
    const content = readFileSync(valuesPath, 'utf-8');
    expect(content).toContain('#0B1220');
    expect(content).not.toContain('#FFFFFF');
  });

  it('génère les écrans de démarrage (splash) Android en thème sombre Arkanos', () => {
    const splashTargets = [
      { path: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320 },
      { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480 },
      { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
      { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 },
    ];

    for (const { path, w, h } of splashTargets) {
      const fullPath = resolve(path);
      expect(existsSync(fullPath)).toBe(true);
      expect(getPnPn(fullPath)).toEqual({ width: w, height: h });
    }
  });
});

function getPnPn(p: string) {
  return getPngDimensions(p);
}
