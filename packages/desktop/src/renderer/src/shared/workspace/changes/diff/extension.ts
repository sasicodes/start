export const extensionOf = (filePath: string) => {
  const basename = filePath.split('/').pop() ?? '';
  const dot = basename.lastIndexOf('.');
  return dot === -1 ? '' : basename.slice(dot + 1).toLowerCase();
};
