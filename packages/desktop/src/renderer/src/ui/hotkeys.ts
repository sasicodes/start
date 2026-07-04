import { isEditableTarget } from '@renderer/utils/dom';
import { createHotkeyHandler, getHotkeyManager, type HotkeyCallbackContext, type Hotkey } from '@tanstack/hotkeys';
import { useEffect, useRef } from 'preact/hooks';

interface AppHotkey {
  name: string;
  shortcuts: readonly Hotkey[];
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
  model: {
    name: 'Model Picker',
    shortcuts: ['M']
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

export const useAppHotkey = (hotkey: AppHotkey, callback: AppHotkeyCallback, { capture = false } = {}) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const invoke: AppHotkeyCallback = (event, context) => callbackRef.current(event, context);

    if (capture) {
      const handlers = hotkey.shortcuts.map((shortcut) =>
        createHotkeyHandler(shortcut, invoke, { preventDefault: true, stopPropagation: true })
      );

      const onKeyDown = (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return;
        for (const handler of handlers) handler(event);
      };

      document.addEventListener('keydown', onKeyDown, true);
      return () => document.removeEventListener('keydown', onKeyDown, true);
    }

    const handles = hotkey.shortcuts.map((shortcut) =>
      getHotkeyManager().register(shortcut, invoke, {
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
  }, [hotkey, capture]);
};
