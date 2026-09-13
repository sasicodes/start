export const toolResult = <T>(text: string, details: T) => ({
  details,
  content: [{ text, type: 'text' as const }]
});

export const toolImageResult = (text: string, image: string, mimeType = 'image/png') => ({
  details: null,
  content: [
    { text, type: 'text' as const },
    { mimeType, data: image, type: 'image' as const }
  ]
});
