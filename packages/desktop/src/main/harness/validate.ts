import { defaultHarnessName } from '@main/harness/default';

const harnessNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const isReservedHarnessName = (name: string) => name.trim().toLowerCase() === defaultHarnessName;

export const isValidHarnessName = (name: string) => harnessNamePattern.test(name) && !isReservedHarnessName(name);

export const harnessNameError = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'Harness name is required.';
  if (isReservedHarnessName(trimmed))
    return `"${defaultHarnessName}" is reserved and cannot be created or overwritten.`;
  if (!harnessNamePattern.test(trimmed))
    return 'Harness name must be kebab-case (lowercase letters, digits, single hyphens).';
  return '';
};
