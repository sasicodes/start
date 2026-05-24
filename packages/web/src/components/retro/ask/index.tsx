import { ChatGPTIcon, ClaudeIcon, GrokIcon, PerplexityIcon } from './icons';

const LLMS_TXT_URL = 'https://start.intelligence.one/llms.txt';

const QUERY = encodeURIComponent(`Read ${LLMS_TXT_URL} and tell me about Start, your coding assistant.`);

const MODELS = [
  {
    name: 'ChatGPT',
    href: `https://chatgpt.com/?q=${QUERY}`,
    icon: ChatGPTIcon
  },
  {
    name: 'Claude',
    href: `https://claude.ai/new?q=${QUERY}`,
    icon: ClaudeIcon
  },
  {
    name: 'Perplexity',
    href: `https://www.perplexity.ai/search?q=${QUERY}`,
    icon: PerplexityIcon
  },
  {
    name: 'Grok',
    href: `https://grok.com/?q=${QUERY}`,
    icon: GrokIcon
  }
];

export const Ask = () => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 items-center justify-center">
      <span className="text-xs sm:text-sm font-medium text-black">Ask</span>
      <div className="flex gap-2 sm:gap-3 items-center justify-center">
        {MODELS.map((model) => (
          <a
            key={model.name}
            href={model.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask about Start on ${model.name}`}
            className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#e8e8e8] border-[1.5px] border-black text-zinc-500 hover:text-black hover:bg-zinc-200 cursor-pointer transition-colors duration-150 ease-out shadow-[1px_1px_0px_black]"
          >
            <model.icon />
          </a>
        ))}
      </div>
    </div>
  );
};
