export const API_KEY_MASK = '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';

export const apiKeyInputValue = (draftKey: string, storedApiKey: boolean, editing: boolean) =>
  draftKey || (storedApiKey && !editing ? API_KEY_MASK : '');
