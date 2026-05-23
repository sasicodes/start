import { useEffect, useState } from 'preact/hooks';

export const useAppFocusState = (enabled = true) => {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFocused(false);
      return;
    }

    let mounted = true;

    void window.pi.app.focusState().then((state) => {
      if (mounted) setFocused(state.focused);
    });

    const offFocusStateChanged = window.pi.app.onFocusStateChanged((state) => {
      setFocused(state.focused);
    });

    return () => {
      mounted = false;
      offFocusStateChanged();
    };
  }, [enabled]);

  return focused;
};
