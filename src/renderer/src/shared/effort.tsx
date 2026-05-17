import type { EffortLevel } from '@preload/index';
import { cn } from '@renderer/utils/cn';

export const effortLevels = [
  { id: 'low', label: 'Low' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' },
  { id: 'medium', label: 'Medium' }
] as const;

export const EffortSignal = ({ level }: { level: EffortLevel }) => {
  const activeCount = effortLevels.findIndex((effortLevel) => effortLevel.id === level) + 1;

  return (
    <span aria-hidden="true" class="inline-flex translate-y-[0.5px] flex-none items-center gap-0.5">
      {effortLevels.map((effortLevel, index) => (
        <span
          key={effortLevel.id}
          class={cn(
            'block h-2.5 w-0.5 min-w-0.5 max-w-0.5 rounded-full bg-current opacity-25',
            index < activeCount && 'opacity-80'
          )}
        />
      ))}
    </span>
  );
};
