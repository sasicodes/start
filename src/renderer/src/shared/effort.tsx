import type { EffortLevel } from '@preload/index';
import { cn } from '@renderer/utils/cn';

export const effortLevels = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' }
] as const;

export const EffortSignal = ({ className, level }: { className?: string; level: EffortLevel }) => {
  const activeCount = effortLevels.findIndex((effortLevel) => effortLevel.id === level) + 1;

  return (
    <span aria-hidden="true" class={cn('inline-flex translate-y-[0.5px] flex-none items-center gap-0.5', className)}>
      {effortLevels.map((effortLevel, index) => (
        <span
          key={effortLevel.id}
          class={cn(
            'block h-2.5 w-0.5 shrink-0 rounded-full bg-current opacity-25',
            index < activeCount && 'opacity-80'
          )}
        />
      ))}
    </span>
  );
};
