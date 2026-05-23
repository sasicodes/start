import { execFile } from 'node:child_process';
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

export default async function sanitizeMacInfo(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const plistPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents',
    'Info.plist'
  );

  for (const key of unwantedUsageDescriptionKeys) {
    await deleteInfoKey(plistPath, `:${key}`);
  }

  await deleteInfoKey(plistPath, ':NSAppTransportSecurity');
}
