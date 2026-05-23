const { notarize } = require('@electron/notarize');

exports.default = async function notarizeMac(context) {
  if (process.platform !== 'darwin') return;

  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName !== 'darwin') return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) return;

  await notarize({
    appBundleId: packager.appInfo.id,
    appPath: `${appOutDir}/${packager.appInfo.productFilename}.app`,
    appleId,
    appleIdPassword,
    teamId
  });
};
