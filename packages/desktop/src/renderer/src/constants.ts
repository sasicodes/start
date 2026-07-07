export const isDevelopment = import.meta.env.DEV;

export const appIconHref = isDevelopment ? '/icon-dev.png' : '/icon.png';

export const releaseNotesUrl = 'https://github.com/sasicodes/start/releases';

export const relaySetupUrl = 'https://github.com/sasicodes/start/tree/main/packages/relay';
