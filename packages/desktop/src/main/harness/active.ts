import { readStartState, updateStartState } from '@main/storage';

export const readActiveHarness = (): string => readStartState().activeHarness ?? '';

export const writeActiveHarness = (name: string): void => {
  updateStartState({ activeHarness: name });
};
