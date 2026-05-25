import type { AppSurface } from '@renderer/app/types';
import {
  clearBrowserNavigation,
  emptyBrowserNavigation,
  nextBrowserNavigation
} from '@renderer/shared/browser/navigation';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseBrowserPanelInput {
  openPanel: () => void;
  setSurface: (surface: AppSurface) => void;
}

export const useBrowserPanel = ({ openPanel, setSurface }: UseBrowserPanelInput) => {
  const [navigation, setNavigation] = useState(emptyBrowserNavigation);

  const open = useCallback(
    (nextUrl: string) => {
      setNavigation((current) => nextBrowserNavigation(current, nextUrl));
      setSurface('main');
      openPanel();
    },
    [openPanel, setSurface]
  );

  const clear = useCallback(() => {
    setNavigation(clearBrowserNavigation);
  }, []);

  useEffect(() => window.pi.app.onBrowserOpenRequest(open), [open]);

  useEffect(() => {
    const openLinkInBrowser = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.protocol !== 'http:' && anchor.protocol !== 'https:') return;

      event.preventDefault();
      open(anchor.href);
    };

    document.addEventListener('click', openLinkInBrowser);
    return () => document.removeEventListener('click', openLinkInBrowser);
  }, [open]);

  return { clear, navigation };
};
