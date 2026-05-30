import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface UseBrowserScreenshotOptions {
  onError: (message: string) => void;
}

export const useBrowserScreenshot = ({ onError }: UseBrowserScreenshotOptions) => {
  const timerRef = useRef<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    []
  );

  const capture = useCallback(() => {
    window.clearTimeout(timerRef.current);
    window.pi.app
      .browserScreenshot()
      .then((result) => {
        if (!result.ok) {
          onError(result.error ?? 'Could not capture the page.');
          return;
        }
        onError('');
        setCopied(true);
        timerRef.current = window.setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => onError('Could not capture the page.'));
  }, [onError]);

  return { copied, capture };
};
