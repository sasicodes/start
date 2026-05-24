import type { ChatItem } from '../data';

interface ChatRowProps {
  chat: ChatItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export const ChatRow = ({ chat, isActive, onSelect }: ChatRowProps) => {
  const handleClick = () => onSelect(chat.id);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center rounded-[2px] px-[4px] py-[2px] text-left transition-colors ${
        isActive ? 'bg-zinc-200/80 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
      }`}
    >
      <span className="truncate font-sans text-[6px] leading-tight">{chat.title}</span>
    </button>
  );
};
