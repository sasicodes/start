import { signal } from '@preact/signals';

export type DiffFold = 'collapsed' | 'expanded';

export interface DiffFoldState {
  mode: DiffFold;
}

export const diffFold = signal<DiffFoldState>({ mode: 'collapsed' });

export const setDiffFold = (fold: DiffFold) => {
  diffFold.value = { mode: fold };
};

export const nextDiffFold = (current: DiffFold): DiffFold => (current === 'collapsed' ? 'expanded' : 'collapsed');
