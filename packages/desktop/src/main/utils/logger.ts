const formatError = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error));

export const logger = {
  error: (scope: string, error: unknown) => {
    process.stderr.write(`[start] ${scope}: ${formatError(error)}\n`);
  }
};
