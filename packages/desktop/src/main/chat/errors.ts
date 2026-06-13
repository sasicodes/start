interface LiveAssistantOutput {
  text: string;
  thinking: string;
  details?: readonly unknown[];
}

const providerConnectionErrorFragments = [
  'websocket',
  'econnreset',
  'econnrefused',
  'socket hang up',
  'transport failure',
  'connection refused',
  'delayed connect error',
  'upstream connect error',
  'remote connection failure',
  'response headers timed out',
  'disconnect/reset before headers'
] as const;

const hasLiveAssistantOutput = (turn: LiveAssistantOutput | null) =>
  Boolean(turn && (turn.text.trim() || turn.thinking.trim() || (turn.details?.length ?? 0) > 0));

const isProviderConnectionError = (message: string) => {
  const lowerMessage = message.toLowerCase();
  return providerConnectionErrorFragments.some((fragment) => lowerMessage.includes(fragment));
};

export const shouldCompleteAfterStreamError = (turn: LiveAssistantOutput | null, message: string) =>
  hasLiveAssistantOutput(turn) && isProviderConnectionError(message);
