import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { ANALYTICS_STORAGE_NAME, DESKTOP_ID_STORAGE_NAME } from '@main/constants';
import { readLocalStateValue, writeLocalStateValue } from '@main/local-state';

const desktopNameMaxLength = 80;

export const loadDesktopId = () => {
  const current = readLocalStateValue(DESKTOP_ID_STORAGE_NAME);
  if (current) return current;

  const analyticsId = readLocalStateValue(ANALYTICS_STORAGE_NAME);
  const id = analyticsId || randomUUID();
  writeLocalStateValue(DESKTOP_ID_STORAGE_NAME, id);
  return id;
};

export const loadDesktopName = (desktopId = loadDesktopId()) => {
  const name = hostname().trim();
  if (name) return name.slice(0, desktopNameMaxLength);
  return `Desktop ${desktopId.slice(0, 8)}`;
};
