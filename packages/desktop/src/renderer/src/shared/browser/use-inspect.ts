import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseBrowserInspectOptions {
  onText: (text: string) => void;
}

export const useBrowserInspect = ({ onText }: UseBrowserInspectOptions) => {
  const [inspecting, setInspecting] = useState(false);

  useEffect(() => window.pi.app.onBrowserInspectSent(onText), [onText]);
  useEffect(() => window.pi.app.onBrowserInspectState(setInspecting), []);
  useEffect(
    () => () => {
      window.pi.app.browserInspectStop().catch(() => {});
    },
    []
  );

  const toggle = useCallback(() => {
    if (inspecting) {
      setInspecting(false);
      window.pi.app.browserInspectStop().catch(() => {});
      return;
    }
    setInspecting(true);
    window.pi.app
      .browserInspectStart()
      .then((result) => {
        if (!result.ok) setInspecting(false);
      })
      .catch(() => setInspecting(false));
  }, [inspecting]);

  return { inspecting, toggle };
};
