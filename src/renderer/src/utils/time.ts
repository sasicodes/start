const messageTimeFormatter = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit'
});

export const formatMessageTime = (timestamp: number) => messageTimeFormatter.format(new Date(timestamp));

export const formatRelativeTime = (timestamp: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
};
