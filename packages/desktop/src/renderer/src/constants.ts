export const isDevelopment = import.meta.env.DEV;

export const appIconHref = isDevelopment ? '/icon-dev.png' : '/icon.png';

export const RELEASE_NOTES_URL = 'https://github.com/sasicodes/start/releases';

export const RELAY_SETUP_URL = 'https://github.com/sasicodes/start/tree/main/packages/relay';

export const RELAY_FEEDBACK_URL =
  'https://github.com/sasicodes/start/issues/new?title=Remote%20access%3A%20hosted%20or%20self-hosted%20relay%3F&body=Would%20you%20use%20a%20hosted%20relay%2C%20or%20would%20you%20rather%20host%20it%20yourself%3F%20Tell%20us%20why.';
