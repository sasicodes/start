export const settingsTabs = [
  { value: 'personalization', label: 'Personalization' },
  { value: 'providers', label: 'Providers' },
  { value: 'remote', label: 'Remote' },
  { value: 'shortcuts', label: 'Shortcuts' }
] as const;

export type SettingsTab = (typeof settingsTabs)[number]['value'];

export const providerSettingsTab = 'providers' satisfies SettingsTab;

export interface TabReveal {
  left: number;
  right: number;
}

export const computeTabReveal = (listWidth: number, left: number, width: number): TabReveal => ({
  left,
  right: listWidth - (left + width)
});
