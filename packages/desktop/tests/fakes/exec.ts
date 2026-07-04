import { vi } from 'vitest';

export const createExecFileMock = () => {
  const execFile = vi.fn();
  Object.defineProperty(execFile, Symbol.for('nodejs.util.promisify.custom'), {
    value: (command: string, args: string[], options: object) =>
      new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        execFile(command, args, options, (error: Error | null, stdout: string, stderr: string) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      })
  });
  return execFile;
};
