import { CHATS } from '../data';
import { EmptyState } from './empty-state';
import { ChatMessages } from './messages';
import { PromptArea } from './prompt-area';
import { TabBar } from './tab-bar';

interface CenterPaneProps {
  activeChatId: string | null;
}

export const CenterPane = ({ activeChatId }: CenterPaneProps) => {
  const chat = CHATS.find((c) => c.id === activeChatId);

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-200 font-sans">
      <TabBar />
      <div className="flex flex-1 flex-col overflow-hidden">{chat ? <ChatMessages chat={chat} /> : <EmptyState />}</div>
      <PromptArea />
    </div>
  );
};
