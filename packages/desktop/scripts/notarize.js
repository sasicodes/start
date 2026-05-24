import { notarize } from '@electron/notarize';

const notarizeMac = async (context) => {
  if (process.platform !== 'darwin') return;

  const { packager, appOutDir, electronPlatformName } = context;
  if (electronPlatformName !== 'darwin') return;

  const appleId = process.env.APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;

  if (!appleId || !appleIdPassword || !teamId) return;

  await notarize({
    teamId,
    appleId,
    appleIdPassword,
    appBundleId: packager.appInfo.id,
    appPath: `${appOutDir}/${packager.appInfo.productFilename}.app`
  });
};

export default notarizeMac;
