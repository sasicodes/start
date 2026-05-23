import type { AgentTab } from '@preload/index';
import { tw } from '@renderer/utils/tw';
import { useState, useEffect, useCallback } from 'preact/hooks';

const tabLabel = (tab: AgentTab) => tab.workspacePath.split('/').filter(Boolean).at(-1) ?? tab.workspacePath;

const statusLabel = (status: AgentTab['status']) => {
  if (status === 'failed') return 'failed';
  if (status === 'completed') return 'done';
  if (status === 'generating') return 'running';
  return 'idle';
};

const sameTabs = (first: AgentTab[], second: AgentTab[]) =>
  first.length === second.length &&
  first.every((tab, index) => {
    const next = second[index];
    return (
      next &&
      tab.id === next.id &&
      tab.status === next.status &&
      tab.sessionId === next.sessionId &&
      tab.workspacePath === next.workspacePath
    );
  });

interface AgentTabsProps {
  activeSessionId: string;
  onActivate: (id: string) => Promise<boolean>;
}

export const AgentTabs = ({ activeSessionId, onActivate }: AgentTabsProps) => {
  const [tabs, setTabs] = useState<AgentTab[]>([]);

  const loadTabs = useCallback(async () => {
    try {
      const nextTabs = await window.pi.chat.tabs();
      setTabs((currentTabs) => (sameTabs(currentTabs, nextTabs) ? currentTabs : nextTabs));
    } catch {
      setTabs((currentTabs) => (currentTabs.length > 0 ? [] : currentTabs));
    }
  }, []);

  useEffect(() => {
    void loadTabs();
  }, [loadTabs, activeSessionId]);

  useEffect(() => {
    const offNotice = window.pi.chat.onNotice(() => void loadTabs());
    const offSessions = window.pi.chat.onRecentSessionsChanged(() => void loadTabs());
    return () => {
      offNotice();
      offSessions();
    };
  }, [loadTabs]);

  if (tabs.length <= 1) return null;

  return (
    <div class="absolute top-8 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full bg-composer p-1 shadow-shell [-webkit-app-region:no-drag] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.sessionId === activeSessionId || tab.id === activeSessionId;
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={`${tab.workspacePath}, ${statusLabel(tab.status)}`}
            onClick={() => void onActivate(tab.id)}
            className={tw(
              'flex max-w-44 shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs leading-4 text-soft outline-0 transition-colors hover:bg-control focus-visible:bg-control',
              active && 'bg-control text-ink'
            )}
          >
            <span class="truncate">{tabLabel(tab)}</span>
            <span
              aria-hidden="true"
              class={tw(
                'size-1.5 rounded-full',
                tab.status === 'idle' && 'bg-soft',
                tab.status === 'failed' && 'bg-red-500',
                tab.status === 'completed' && 'bg-emerald-500',
                tab.status === 'generating' && 'bg-blue-500'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
