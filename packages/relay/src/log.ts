export const messageType = (payload: unknown): string => {
  if (typeof payload !== 'object' || payload === null || !('type' in payload)) return 'unknown';
  return typeof payload.type === 'string' ? payload.type : 'unknown';
};

const stamp = () => new Date().toISOString().slice(11, 23);

export const logIncoming = (payload: unknown) => process.stdout.write(`${stamp()}  in  ${messageType(payload)}\n`);

export const logOutgoing = (payload: unknown) => process.stdout.write(`${stamp()}  out ${messageType(payload)}\n`);

export const logError = (scope: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : 'unknown error';
  process.stderr.write(`${stamp()}  err ${scope}: ${detail}\n`);
};
