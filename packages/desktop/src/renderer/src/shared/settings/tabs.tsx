import { tw } from '@renderer/utils/tw';

export type SettingsTab = 'personalization' | 'providers' | 'shortcuts';

interface SettingsTabsProps {
  value: SettingsTab;
  onChange: (value: SettingsTab) => void;
}

const settingsTabs = [
  { value: 'personalization', label: 'Personalization' },
  { value: 'providers', label: 'Providers' },
  { value: 'shortcuts', label: 'Shortcuts' }
] as const;

const tabWidth = 8.75;

export const SettingsTabs = ({ value, onChange }: SettingsTabsProps) => {
  const activeIndex = settingsTabs.findIndex((tab) => tab.value === value);

  return (
    <div role="tablist" aria-label="Settings" class="rounded-full border border-line bg-composer p-1 shadow-nav">
      <div class="relative flex items-center">
        <div
          class="pointer-events-none absolute top-0 bottom-0 left-0 rounded-full bg-control shadow-shell transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(calc(${activeIndex} * ${tabWidth}rem))`,
            width: `${tabWidth}rem`
          }}
        />
        {settingsTabs.map((tab) => {
          const selected = value === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              style={{ width: `${tabWidth}rem` }}
              onClick={() => onChange(tab.value)}
              class={tw(
                'relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-full border-0 bg-transparent px-3 text-xs leading-none font-medium outline-0 transition-colors duration-150 ease-out',
                selected ? 'text-ink' : 'text-soft hover:text-hover focus-visible:text-hover'
              )}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
