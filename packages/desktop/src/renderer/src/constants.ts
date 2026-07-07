export const isDevelopment = import.meta.env.DEV;

export const appIconHref = isDevelopment ? '/icon-dev.png' : '/icon.png';

export const RELEASE_NOTES_URL = 'https://github.com/sasicodes/start/releases';

export const RELAY_SETUP_URL = 'https://github.com/sasicodes/start/tree/main/packages/relay';
