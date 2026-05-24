export const INNER_RAIL = 860;
export const OUTER_RAIL = 1480;

const desktopVersion = import.meta.env.START_DESKTOP_VERSION;
const githubReleaseUrl = `https://github.com/sasicodes/start/releases/download/v${desktopVersion}`;

export const MAC_DOWNLOADS = {
  appleSilicon: `${githubReleaseUrl}/Start-${desktopVersion}-arm64.dmg`,
  intel: `${githubReleaseUrl}/Start-${desktopVersion}-x64.dmg`
};
