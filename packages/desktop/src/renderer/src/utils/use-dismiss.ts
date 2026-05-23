import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

type DismissRef = RefObject<HTMLElement>;

type UseDismissOptions = {
  refs: DismissRef[];
  enabled?: boolean;
  onDismiss: () => void;
};

const containsTarget = (refs: DismissRef[], target: Node) => refs.some((ref) => ref.current?.contains(target));

export const useDismiss = ({ enabled = true, onDismiss, refs }: UseDismissOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containsTarget(refs, target)) onDismiss();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [enabled, onDismiss, refs]);
};
