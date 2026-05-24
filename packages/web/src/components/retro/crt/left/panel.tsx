import { CHATS } from '../data';
import { ChatRow } from './chat-row';
import { Header } from './header';
import { ProjectHeader } from './project-header';

interface LeftSidebarProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export const LeftSidebar = ({ activeChatId, onSelectChat }: LeftSidebarProps) => {
  return (
    <div className="flex h-full w-[62px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 font-sans">
      <Header />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProjectHeader />
        <div className="flex flex-1 flex-col gap-[1px] overflow-hidden px-[3px] py-[2px]">
          {CHATS.map((chat) => (
            <ChatRow key={chat.id} chat={chat} isActive={activeChatId === chat.id} onSelect={onSelectChat} />
          ))}
        </div>
      </div>
    </div>
  );
};
