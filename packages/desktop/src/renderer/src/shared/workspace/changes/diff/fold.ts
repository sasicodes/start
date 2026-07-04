import { signal } from '@preact/signals';

export type DiffFold = 'collapsed' | 'expanded';

export const diffFold = signal<DiffFold | null>(null);

export const setDiffFold = (fold: DiffFold | null) => {
  diffFold.value = fold;
};

export const nextDiffFold = (current: DiffFold | null): DiffFold =>
  current === 'collapsed' ? 'expanded' : 'collapsed';

export const foldOpenDefault = (fold: DiffFold | null, byDefault: boolean) =>
  fold === null ? byDefault : fold === 'expanded';
