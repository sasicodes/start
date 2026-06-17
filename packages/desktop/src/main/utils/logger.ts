const formatError = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error));

const inUtilityProcess = () => Boolean(Reflect.get(process, 'parentPort'));

const recordErrorLine = (line: string) => {
  if (inUtilityProcess()) return;

  import('@main/utils/sink').then(({ recordError }) => recordError(line)).catch(() => {});
};

export const logger = {
  error: (scope: string, error: unknown) => {
    const line = `${new Date().toISOString()} [start] ${scope}: ${formatError(error)}`;
    process.stderr.write(`${line}\n`);
    recordErrorLine(line);
  }
};
