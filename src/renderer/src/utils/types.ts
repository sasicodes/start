export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'event' | 'terminal';
  text: string;
  activity?: string;
  createdAt: number;
};
