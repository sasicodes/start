import type { AppSurface } from '@renderer/app/types';
import { browserLinkHrefFromClick } from '@renderer/shared/browser/link';
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
      const href = browserLinkHrefFromClick(event);
      if (!href) return;

      event.preventDefault();
      open(href);
    };

    document.addEventListener('click', openLinkInBrowser, true);
    return () => document.removeEventListener('click', openLinkInBrowser, true);
  }, [open]);

  return { clear, navigation };
};
