export type SettingsTab = 'personalization' | 'providers' | 'mobile' | 'shortcuts';

export const providerSettingsTab = 'providers' satisfies SettingsTab;

export interface TabReveal {
  left: number;
  right: number;
}

export const computeTabReveal = (listWidth: number, left: number, width: number): TabReveal => ({
  left,
  right: listWidth - (left + width)
});
