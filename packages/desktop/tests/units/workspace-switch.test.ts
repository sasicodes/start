import { useWorkspaceSwitch } from '@renderer/app/use-workspace-switch';
import { describe, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

const { setSwitching } = vi.hoisted(() => ({ setSwitching: vi.fn() }));

vi.mock('preact/hooks', () => ({
  useRef: <T>(current: T) => ({ current }),
  useCallback: <T>(callback: T) => callback,
  useState: <T>(initial: T) => [initial, setSwitching]
}));

const setup = () => {
  const navigate = vi.fn();
  const first = deferred<boolean>();
  const second = deferred<boolean>();
  const switchWorkspace = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const chooseWorkspaceDirectory = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const actions = useWorkspaceSwitch({
    navigate,
    surface: 'main',
    switchWorkspace,
    closeSidePanel: vi.fn(),
    chooseWorkspaceDirectory,
    workspacePath: '/tmp/workspace-a'
  });
  return { first, second, actions, navigate, switchWorkspace };
};

describe('workspace switch navigation', () => {
  it('shares an in-flight destination across dock and composer selections', async () => {
    const { first, actions, navigate, switchWorkspace } = setup();
    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    actions.selectWorkspaceFromComposer('/tmp/workspace-b');

    expect(switchWorkspace).toHaveBeenCalledExactlyOnceWith('/tmp/workspace-b');
    expect(navigate).toHaveBeenCalledOnce();
    expect(setSwitching.mock.calls).toEqual([[true]]);

    first.resolve(true);
    await first.promise;
    expect(setSwitching.mock.calls).toEqual([[true], [false]]);
  });

  it('does not let an older completion clear the latest pending destination', async () => {
    const { first, second, actions, switchWorkspace } = setup();
    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    actions.selectWorkspaceFromComposer('/tmp/workspace-c');

    first.resolve(false);
    await first.promise;
    actions.selectWorkspaceFromDock('/tmp/workspace-c');
    expect(switchWorkspace).toHaveBeenCalledTimes(2);
    expect(setSwitching.mock.calls).toEqual([[true], [true]]);

    second.resolve(true);
    await second.promise;
    expect(setSwitching.mock.calls).toEqual([[true], [true], [false]]);
  });

  it('allows selecting an earlier destination again after switching elsewhere', async () => {
    const { first, second, actions, switchWorkspace } = setup();
    const third = deferred<boolean>();
    switchWorkspace.mockReturnValueOnce(third.promise);
    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    actions.selectWorkspaceFromDock('/tmp/workspace-c');
    actions.selectWorkspaceFromDock('/tmp/workspace-b');

    first.resolve(false);
    second.resolve(false);
    await Promise.all([first.promise, second.promise]);
    expect(switchWorkspace).toHaveBeenCalledTimes(3);
    expect(setSwitching.mock.calls).toEqual([[true], [true], [true]]);

    third.resolve(true);
    await third.promise;
    expect(setSwitching.mock.calls).toEqual([[true], [true], [true], [false]]);
  });

  it('allows retrying the same destination after a failed switch', async () => {
    const { first, second, actions, switchWorkspace } = setup();
    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    first.resolve(false);
    await first.promise;

    actions.selectWorkspaceFromDock('/tmp/workspace-b');
    expect(switchWorkspace).toHaveBeenCalledTimes(2);
    expect(setSwitching.mock.calls).toEqual([[true], [false], [true]]);

    second.resolve(true);
    await second.promise;
    expect(setSwitching.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it('keeps route synchronization paused when an older switch finishes first', async () => {
    const { first, second, actions, navigate } = setup();
    const previous = actions.chooseWorkspaceFromDock();
    const latest = actions.chooseWorkspaceFromDock();

    expect(navigate).toHaveBeenLastCalledWith({ name: 'chat' }, true);
    expect(setSwitching.mock.calls).toEqual([[true], [true]]);
    first.resolve(false);
    await previous;
    expect(setSwitching.mock.calls).toEqual([[true], [true]]);

    second.resolve(true);
    await latest;
    expect(setSwitching.mock.calls).toEqual([[true], [true], [false]]);
  });

  it('resumes route synchronization when the latest switch finishes before an older one', async () => {
    const { first, second, actions } = setup();
    const previous = actions.chooseWorkspaceFromDock();
    const latest = actions.chooseWorkspaceFromDock();

    second.resolve(true);
    await latest;
    expect(setSwitching.mock.calls).toEqual([[true], [true], [false]]);

    first.resolve(false);
    await previous;
    expect(setSwitching.mock.calls).toEqual([[true], [true], [false]]);
  });

  it('resumes route synchronization when the latest selection is cancelled', async () => {
    const { first, actions } = setup();
    const pending = actions.chooseWorkspaceFromDock();

    first.resolve(false);
    await pending;

    expect(setSwitching.mock.calls).toEqual([[true], [false]]);
  });
});
