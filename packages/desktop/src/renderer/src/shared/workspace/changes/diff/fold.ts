import { signal } from '@preact/signals';

export type DiffFoldAction = 'collapse' | 'expand';

export interface DiffFoldCommand {
  nonce: number;
  action: DiffFoldAction;
}

export const diffFoldCommand = signal<DiffFoldCommand | null>(null);

export const requestDiffFold = (action: DiffFoldAction) => {
  diffFoldCommand.value = { action, nonce: (diffFoldCommand.value?.nonce ?? 0) + 1 };
};
