export const toolResult = <T>(text: string, details: T) => ({
  details,
  content: [{ text, type: 'text' as const }]
});
