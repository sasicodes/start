import { randomUUID } from 'node:crypto';
import { ANALYTICS_STORAGE_NAME, DESKTOP_ID_STORAGE_NAME } from '@main/constants';
import { readLocalStateValue, writeLocalStateValue } from '@main/local-state';

export const loadDesktopId = () => {
  const current = readLocalStateValue(DESKTOP_ID_STORAGE_NAME);
  if (current) return current;

  const analyticsId = readLocalStateValue(ANALYTICS_STORAGE_NAME);
  const id = analyticsId || randomUUID();
  writeLocalStateValue(DESKTOP_ID_STORAGE_NAME, id);
  return id;
};
