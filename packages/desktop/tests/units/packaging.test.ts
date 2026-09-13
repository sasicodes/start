import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptUrl = new URL('../../scripts/sanitize-mac-info.js', import.meta.url).href;

const sanitize = (appOutDir: string, electronPlatformName: string) =>
  execFileAsync(process.execPath, [
    '--input-type=module',
    '-e',
    `import sanitize from ${JSON.stringify(scriptUrl)};
    await sanitize(${JSON.stringify({ appOutDir, electronPlatformName, packager: { appInfo: { productFilename: 'Start' } } })});`
  ]);

describe('macOS packaging metadata', () => {
  it('skips non-macOS packages without reading app bundles', async () => {
    await expect(sanitize('/nonexistent/start-package', 'win32')).resolves.toMatchObject({ stderr: '' });
  });

  it.skipIf(process.platform !== 'darwin')(
    'renames every helper while preserving its identity and sanitizing the main app',
    async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'start-packaging-'));
      try {
        const contents = path.join(directory, 'Start.app', 'Contents');
        const frameworks = path.join(contents, 'Frameworks');
        await mkdir(frameworks, { recursive: true });
        const mainPlist = path.join(contents, 'Info.plist');
        await writeFile(
          mainPlist,
          `<?xml version="1.0"?><plist version="1.0"><dict>
        <key>CFBundleName</key><string>Start</string>
        <key>NSCameraUsageDescription</key><string>unused</string>
        <key>NSAppTransportSecurity</key><dict/>
      </dict></plist>`
        );
        const frameworkFile = path.join(frameworks, 'Electron Framework');
        await writeFile(frameworkFile, 'unchanged');
        const unrelated = path.join(frameworks, 'Other.app', 'Contents');
        await mkdir(unrelated, { recursive: true });
        const unrelatedPlist =
          '<plist version="1.0"><dict><key>CFBundleName</key><string>Other</string></dict></plist>';
        await writeFile(path.join(unrelated, 'Info.plist'), unrelatedPlist);
        const helpers = ['Start Helper', 'Start Helper (GPU)', 'Start Helper (Plugin)', 'Start Helper (Renderer)'];
        for (const name of helpers) {
          const helperContents = path.join(frameworks, `${name}.app`, 'Contents');
          await mkdir(helperContents, { recursive: true });
          await writeFile(
            path.join(helperContents, 'Info.plist'),
            `<?xml version="1.0"?><plist version="1.0"><dict>
          <key>CFBundleName</key><string>${name.replace('Start', 'Electron')}</string>
          <key>CFBundleDisplayName</key><string>${name}</string>
          <key>CFBundleExecutable</key><string>${name}</string>
          <key>CFBundleIdentifier</key><string>one.intelligence.start.helper</string>
        </dict></plist>`
          );
        }

        await sanitize(directory, 'darwin');
        await sanitize(directory, 'darwin');

        for (const name of helpers) {
          const plist = path.join(frameworks, `${name}.app`, 'Contents', 'Info.plist');
          for (const key of ['CFBundleName', 'CFBundleDisplayName', 'CFBundleExecutable']) {
            const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist]);
            expect(stdout.trim()).toBe(name);
          }
          const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', plist]);
          expect(stdout.trim()).toBe('one.intelligence.start.helper');
        }
        const main = await readFile(mainPlist, 'utf8');
        expect(main).toContain('<string>Start</string>');
        expect(main).not.toContain('NSCameraUsageDescription');
        expect(main).not.toContain('NSAppTransportSecurity');
        expect(await readFile(frameworkFile, 'utf8')).toBe('unchanged');
        expect(await readFile(path.join(unrelated, 'Info.plist'), 'utf8')).toBe(unrelatedPlist);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  );
});
