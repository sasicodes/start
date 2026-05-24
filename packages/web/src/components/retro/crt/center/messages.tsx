import type { ChatItem } from '../data';
import { AssistantMessage } from './assistant-message';
import { UserBubble } from './user-bubble';

interface ChatMessagesProps {
  chat: ChatItem;
}

export const ChatMessages = ({ chat }: ChatMessagesProps) => {
  return (
    <div className="flex flex-1 flex-col gap-[5px] overflow-hidden px-[8px] py-[6px]">
      {chat.messages.map((msg) =>
        msg.role === 'user' ? (
          <UserBubble key={`${chat.id}-${msg.role}`} text={msg.text} />
        ) : (
          <AssistantMessage key={`${chat.id}-${msg.role}`} text={msg.text} />
        )
      )}
    </div>
  );
};
