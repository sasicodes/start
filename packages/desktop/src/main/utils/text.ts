export const truncate = (text: string, max: number, ellipsis = '…') =>
  text.length > max ? `${text.slice(0, max)}${ellipsis}` : text;
