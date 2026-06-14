interface LiveAssistantOutput {
  text: string;
  thinking: string;
  details?: readonly unknown[];
}

const providerConnectionErrorPattern =
  /upstream connect error|disconnect\/reset before headers|remote connection failure|transport failure|delayed connect error|connection refused|response headers timed out|websocket|socket hang up|econnreset|econnrefused/i;

const hasLiveAssistantOutput = (turn: LiveAssistantOutput | null) =>
  Boolean(turn && (turn.text.trim() || turn.thinking.trim() || (turn.details?.length ?? 0) > 0));

export const shouldCompleteAfterStreamError = (turn: LiveAssistantOutput | null, message: string) =>
  hasLiveAssistantOutput(turn) && providerConnectionErrorPattern.test(message);
