const boldTitlePattern = /^\*\*([^*\n]+)\*\*$/;

export const thinkingMarkdown = (thinking: string) =>
  thinking
    .split('\n')
    .map((line) => {
      const title = boldTitlePattern.exec(line.trim())?.[1];
      return title ? `### ${title}` : line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
