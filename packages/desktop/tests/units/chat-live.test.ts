import { appendLiveAssistantTurn } from '@main/chat/live';
import type { HistoryTurn } from '@main/types';

const liveTurn: HistoryTurn = {
  id: 'live',
  role: 'assistant',
  text: 'answer',
  createdAt: 2000,
  streaming: true
};

describe('appendLiveAssistantTurn', () => {
  it('replaces trailing work-only history with the live assistant turn', () => {
    const turns: HistoryTurn[] = [
      { id: 'user', role: 'user', text: 'what is this codebase', createdAt: 1000 },
      { id: 'work', role: 'event', text: '', createdAt: 1100, thinking: 'inspecting files' }
    ];

    expect(appendLiveAssistantTurn(turns, liveTurn).map((turn) => turn.id)).toEqual(['user', 'live']);
  });

  it('keeps normal completed turns before the live assistant turn', () => {
    const turns: HistoryTurn[] = [
      { id: 'user', role: 'user', text: 'what is this codebase', createdAt: 1000 },
      { id: 'assistant', role: 'assistant', text: 'previous answer', createdAt: 1100 }
    ];

    expect(appendLiveAssistantTurn(turns, liveTurn).map((turn) => turn.id)).toEqual(['user', 'assistant', 'live']);
  });
});
