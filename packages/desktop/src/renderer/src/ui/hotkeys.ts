import { getHotkeyManager, type HotkeyCallbackContext, type RegisterableHotkey } from '@tanstack/hotkeys';
import { useEffect, useRef } from 'preact/hooks';

interface AppHotkey {
  name: string;
  shortcuts: readonly RegisterableHotkey[];
}

type AppHotkeyCallback = (event: KeyboardEvent, context: HotkeyCallbackContext) => void;

export const appHotkeys = {
  newChat: {
    name: 'New Session',
    shortcuts: ['Mod+N', 'Mod+T']
  },
  effort: {
    name: 'Effort Level',
    shortcuts: ['E']
  },
  recents: {
    name: 'Recent Sessions',
    shortcuts: ['R']
  },
  settings: {
    name: 'Settings',
    shortcuts: ['Mod+,']
  },
  workspace: {
    name: 'Workspace Folders',
    shortcuts: ['W']
  },
  shortcuts: {
    name: 'Keyboard Shortcuts',
    shortcuts: ['Mod+/']
  }
} satisfies Record<string, AppHotkey>;

export const useAppHotkey = (hotkey: AppHotkey, callback: AppHotkeyCallback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handles = hotkey.shortcuts.map((shortcut) =>
      getHotkeyManager().register(shortcut, (event, context) => callbackRef.current(event, context), {
        meta: {
          name: hotkey.name
        },
        preventDefault: true,
        stopPropagation: true
      })
    );

    return () => {
      for (const handle of handles) handle.unregister();
    };
  }, [hotkey]);
};
