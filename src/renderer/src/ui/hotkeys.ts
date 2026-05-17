import { getHotkeyManager, type HotkeyCallbackContext, type RegisterableHotkey } from '@tanstack/hotkeys';
import { useEffect, useRef } from 'preact/hooks';

type AppHotkey = {
  name: string;
  shortcut: RegisterableHotkey;
};

type AppHotkeyCallback = (event: KeyboardEvent, context: HotkeyCallbackContext) => void;

export const appHotkeys = {
  newChat: {
    name: 'New Chat',
    shortcut: 'Mod+N'
  },
  settings: {
    name: 'Settings',
    shortcut: 'Mod+,'
  }
} satisfies Record<string, AppHotkey>;

export const useAppHotkey = (hotkey: AppHotkey, callback: AppHotkeyCallback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handle = getHotkeyManager().register(
      hotkey.shortcut,
      (event, context) => callbackRef.current(event, context),
      {
        meta: {
          name: hotkey.name
        },
        preventDefault: true,
        stopPropagation: true
      }
    );

    return () => handle.unregister();
  }, [hotkey]);
};
