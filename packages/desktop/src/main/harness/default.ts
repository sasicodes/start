export interface Harness {
  name: string;
  description: string;
  body: string;
  toolFiles?: string[];
}

export const maxHarnessTools = 16;
export const harnessToolExtensions = ['.mjs', '.js'];

export const defaultHarnessName = 'default';

export const defaultHarness: Harness = {
  name: defaultHarnessName,
  description: 'The shipped coding assistant. Reads files, runs commands, edits code, and writes new files.',
  body: 'You are an expert coding assistant. You help users by reading files, executing commands, editing code, and writing new files.'
};
