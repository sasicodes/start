import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const unwantedUsageDescriptionKeys = [
  'NSAudioCaptureUsageDescription',
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription'
];

const deleteInfoKey = async (plistPath, keyPath) => {
  await execFileAsync('/usr/libexec/PlistBuddy', ['-c', `Delete ${keyPath}`, plistPath]).catch(() => {});
};

const sanitizeMacInfo = async (context) => {
  if (context.electronPlatformName !== 'darwin') return;

  const { productFilename } = context.packager.appInfo;
  const contentsPath = path.join(context.appOutDir, `${productFilename}.app`, 'Contents');
  const plistPath = path.join(contentsPath, 'Info.plist');
  const frameworksPath = path.join(contentsPath, 'Frameworks');

  for (const entry of await readdir(frameworksPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${productFilename} Helper`) || !entry.name.endsWith('.app'))
      continue;
    const helperPlistPath = path.join(frameworksPath, entry.name, 'Contents', 'Info.plist');
    const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleDisplayName',
      helperPlistPath
    ]);
    await execFileAsync('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleName ${stdout.trim()}`, helperPlistPath]);
  }

  for (const key of unwantedUsageDescriptionKeys) {
    await deleteInfoKey(plistPath, `:${key}`);
  }

  await deleteInfoKey(plistPath, ':NSAppTransportSecurity');
};

export default sanitizeMacInfo;
