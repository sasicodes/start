import { tw } from '@renderer/utils/tw';
import { useEffect, useRef, useState } from 'preact/hooks';

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

interface TabIndicator {
  left: number;
  width: number;
}

export const SettingsTabs = ({ value, onChange }: SettingsTabsProps) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<TabIndicator>({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const index = settingsTabs.findIndex((tab) => tab.value === value);
      const button = tabRefs.current[index] ?? null;
      if (!button) return;

      setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    for (const button of tabRefs.current) {
      if (button) observer.observe(button);
    }
    window.addEventListener('resize', updateIndicator);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [value]);

  return (
    <div role="tablist" aria-label="Settings" class="relative flex min-w-0 items-center gap-5">
      {settingsTabs.map((tab, index) => {
        const selected = value === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            class={tw(
              'h-6 flex-none border-0 bg-transparent p-0 text-sm leading-6 font-medium outline-0 transition-colors duration-150 ease-out',
              selected ? 'text-ink' : 'text-soft hover:text-hover focus-visible:text-hover'
            )}
          >
            {tab.label}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        class="pointer-events-none absolute bottom-0 left-0 h-[0.5px] bg-ink transition-all duration-200 ease-out"
        style={{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }}
      />
    </div>
  );
};
