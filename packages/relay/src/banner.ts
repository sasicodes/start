export const maskToken = (token: string) => {
  if (!token) return '-';
  const visible = token.slice(0, 4);
  return `${visible}${'*'.repeat(Math.min(Math.max(token.length - visible.length, 1), 12))}`;
};

export const relayBanner = (url: string, token: string) => {
  const rows: [string, string][] = [
    ['Relay URL', url],
    ['Relay token', maskToken(token)]
  ];
  const keyWidth = Math.max(...rows.map(([key]) => key.length));
  const valueWidth = Math.max(...rows.map(([, value]) => value.length));
  const border = (left: string, mid: string, right: string) =>
    `${left}${'─'.repeat(keyWidth + 2)}${mid}${'─'.repeat(valueWidth + 2)}${right}`;
  const line = ([key, value]: [string, string]) => `│ ${key.padEnd(keyWidth)} │ ${value.padEnd(valueWidth)} │`;
  return [border('┌', '┬', '┐'), ...rows.map(line), border('└', '┴', '┘')].join('\n');
};
