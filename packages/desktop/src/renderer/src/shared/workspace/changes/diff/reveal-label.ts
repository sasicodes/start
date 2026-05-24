export const revealLabel = (platform: NodeJS.Platform) => {
  if (platform === 'darwin') return 'Reveal in Finder';
  if (platform === 'win32') return 'Show in Explorer';
  return 'Show in Folder';
};
