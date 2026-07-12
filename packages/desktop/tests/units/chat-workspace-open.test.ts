import { syncOpenedWorkspace } from '@renderer/shared/chat/open-workspace';
import { describe, expect, it, vi } from 'vitest';

describe('opened workspace chat state', () => {
  it('restores an externally opened session snapshot', async () => {
    const clearSession = vi.fn();
    const onOpenSession = vi.fn(async () => true);
    const syncStatus = vi.fn(async () => {});

    await syncOpenedWorkspace('session-a', { clearSession, onOpenSession, syncStatus });

    expect(onOpenSession).toHaveBeenCalledWith('session-a');
    expect(clearSession).not.toHaveBeenCalled();
    expect(syncStatus).not.toHaveBeenCalled();
  });

  it('clears state when an external workspace has no session', async () => {
    const clearSession = vi.fn();
    const onOpenSession = vi.fn(async () => true);
    const syncStatus = vi.fn(async () => {});

    await syncOpenedWorkspace('', { clearSession, onOpenSession, syncStatus });

    expect(clearSession).toHaveBeenCalledOnce();
    expect(syncStatus).toHaveBeenCalledOnce();
    expect(onOpenSession).not.toHaveBeenCalled();
  });

  it('clears stale state when an external session cannot be restored', async () => {
    const clearSession = vi.fn();
    const onOpenSession = vi.fn(async () => false);
    const syncStatus = vi.fn(async () => {});

    await syncOpenedWorkspace('missing-session', { clearSession, onOpenSession, syncStatus });

    expect(onOpenSession).toHaveBeenCalledWith('missing-session');
    expect(clearSession).toHaveBeenCalledOnce();
    expect(syncStatus).toHaveBeenCalledOnce();
  });
});
