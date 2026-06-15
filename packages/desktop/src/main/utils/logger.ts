import { recordError } from '@main/utils/sink';

const formatError = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error));

export const logger = {
  error: (scope: string, error: unknown) => {
    const line = `${new Date().toISOString()} [start] ${scope}: ${formatError(error)}`;
    process.stderr.write(`${line}\n`);
    recordError(line);
  }
};
