const displayUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'file:') return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const formatBrowserAddress = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return displayUrl(trimmed) ?? trimmed;
};
