export interface ParsedSkillBlock {
  name: string;
  content: string;
  location: string;
  userMessage?: string;
}

const skillBlockPattern = /^<skill name="([^"]+)" location="([^"]+)">\n([\s\S]*?)\n<\/skill>(?:\n\n([\s\S]+))?$/;

export const parseSkillBlock = (text: string): ParsedSkillBlock | null => {
  const match = text.match(skillBlockPattern);
  if (!match) return null;

  const [, name = '', location = '', content = '', userMessage] = match;
  const trimmedUserMessage = userMessage?.trim();
  return {
    name,
    content,
    location,
    ...(trimmedUserMessage ? { userMessage: trimmedUserMessage } : {})
  };
};
