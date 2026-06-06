import { computeTabReveal, type SettingsTab, type TabReveal } from '@renderer/shared/settings/tab';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export type { SettingsTab };

interface SettingsTabsProps {
  value: SettingsTab;
  onChange: (value: SettingsTab) => void;
}

const settingsTabs = [
  { value: 'personalization', label: 'Personalization' },
  { value: 'providers', label: 'Providers' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'shortcuts', label: 'Shortcuts' }
] as const;

export const SettingsTabs = ({ value, onChange }: SettingsTabsProps) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [reveal, setReveal] = useState<TabReveal>({ left: 0, right: 0 });

  useLayoutEffect(() => {
    const updateReveal = () => {
      const list = listRef.current;
      const index = settingsTabs.findIndex((tab) => tab.value === value);
      const button = tabRefs.current[index] ?? null;
      if (!list || !button) return;

      setReveal(computeTabReveal(list.offsetWidth, button.offsetLeft, button.offsetWidth));
    };

    updateReveal();
    const observer = new ResizeObserver(updateReveal);
    if (listRef.current) observer.observe(listRef.current);
    for (const button of tabRefs.current) {
      if (button) observer.observe(button);
    }
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={listRef} role="tablist" aria-label="Settings" class="relative flex min-w-0 items-center gap-5">
      {settingsTabs.map((tab, index) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          class="h-6 flex-none border-0 bg-transparent p-0 text-sm leading-6 font-medium text-[oklch(20%_0.01_255/0.42)] outline-0 transition-colors duration-150 ease-out hover:text-soft focus-visible:text-soft dark:text-[oklch(100%_0_0/0.4)]"
        >
          {tab.label}
        </button>
      ))}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 flex items-center gap-5 text-ink transition-[clip-path] duration-300 ease-out"
        style={{ clipPath: `inset(0 ${reveal.right}px 0 ${reveal.left}px)` }}
      >
        {settingsTabs.map((tab) => (
          <span key={tab.value} class="h-6 flex-none text-sm leading-6 font-medium">
            {tab.label}
          </span>
        ))}
      </div>
    </div>
  );
};
