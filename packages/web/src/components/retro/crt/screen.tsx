import { useState } from 'react';
import { CenterPane } from './center';
import { CHATS } from './data';
import { LeftSidebar } from './left';
import { RightSidebar } from './right';

export const CrtScreen = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(CHATS[0]?.id ?? null);

  return (
    <div
      className="flex h-[200px] w-[260px] items-center justify-center rounded-2xl bg-retro-bezel"
      style={{
        boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.2), inset -2px -2px 8px rgba(255,255,255,0.5)'
      }}
    >
      <div
        className="crt-scanlines relative h-[182px] w-[242px] overflow-hidden bg-white"
        style={{
          borderRadius: '40% 40% 40% 40% / 10% 10% 10% 10%',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)'
        }}
      >
        <div className="absolute inset-0 z-[2] flex">
          <LeftSidebar activeChatId={activeChatId} onSelectChat={setActiveChatId} />
          <CenterPane activeChatId={activeChatId} />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};
