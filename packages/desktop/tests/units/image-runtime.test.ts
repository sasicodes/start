import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PhotonImage } from '@silvia-odwyer/photon-node';

const desktopRoot = path.resolve(import.meta.dirname, '../..');
const bundleRequire = createRequire(path.join(desktopRoot, 'out', 'main', 'index.cjs'));

const packageJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string>>;

describe('image runtime', () => {
  it('ships photon where the bundled main process resolves it', () => {
    const desktop = packageJson(path.join(desktopRoot, 'package.json'));
    const agent = packageJson(path.join(desktopRoot, 'node_modules/@earendil-works/pi-coding-agent/package.json'));

    expect(bundleRequire.resolve('@silvia-odwyer/photon-node')).toContain('photon-node');
    expect(desktop.dependencies?.['@silvia-odwyer/photon-node']).toBe(
      agent.dependencies?.['@silvia-odwyer/photon-node']
    );
  });

  it('shrinks oversized images instead of omitting them', async () => {
    const width = 3200;
    const height = 1800;
    const pixels = new Uint8Array(width * height * 4).map((_, index) => (index * 37) % 251);
    const image = new PhotonImage(pixels, width, height);
    const png = image.get_bytes();
    image.free();

    const { resizeImage } = await vi.importActual<typeof import('@earendil-works/pi-coding-agent')>(
      '@earendil-works/pi-coding-agent'
    );
    const resized = await resizeImage(png, 'image/png');

    expect(resized).toMatchObject({ wasResized: true, originalWidth: width });
    expect(Math.max(resized?.width ?? 0, resized?.height ?? 0)).toBeLessThanOrEqual(2000);
    expect(resized?.data.length ?? Number.POSITIVE_INFINITY).toBeLessThan(4.5 * 1024 * 1024);
  });
});
