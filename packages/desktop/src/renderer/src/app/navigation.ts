import type { AppSurface } from '@renderer/app/types';
import { routeUrl, sameRoute, currentRoute, type AppRoute } from '@renderer/utils/route';
import type { RefObject } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

const initialSurface = (): AppSurface =>
  new URLSearchParams(window.location.search).get('surface') === 'composer' ? 'composer' : 'main';

export const routeForSession = (sessionId: string): AppRoute =>
  sessionId ? { name: 'session', sessionId } : { name: 'chat' };

export const useAppNavigation = (textareaRef: RefObject<HTMLTextAreaElement>) => {
  const [route, setRoute] = useState<AppRoute>(currentRoute);
  const [surface, setSurface] = useState<AppSurface>(initialSurface);

  const navigate = useCallback(
    (nextRoute: AppRoute, replace = false) => {
      if (surface === 'composer') return;

      const nextUrl = routeUrl(nextRoute);
      if (sameRoute(currentRoute(), nextRoute)) {
        if (window.location.href !== nextUrl) window.history.replaceState(nextRoute, '', nextUrl);
        setRoute(nextRoute);
        return;
      }

      if (replace) {
        window.history.replaceState(nextRoute, '', nextUrl);
      } else {
        window.history.pushState(nextRoute, '', nextUrl);
      }
      setRoute(nextRoute);
    },
    [surface]
  );

  const showChat = useCallback(() => {
    setSurface('main');
    navigate({ name: 'chat' });
    textareaRef.current?.focus();
  }, [navigate, textareaRef]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [route.name, surface, textareaRef]);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  return {
    route,
    surface,
    setSurface,
    navigate,
    showChat
  };
};
