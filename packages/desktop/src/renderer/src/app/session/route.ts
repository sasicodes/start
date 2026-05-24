import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import { sameRoute, currentRoute, type AppRoute } from '@renderer/utils/route';
import { useRef, useEffect, useCallback } from 'preact/hooks';

interface SessionRouteOptions {
  route: AppRoute;
  disabled: boolean;
  surface: AppSurface;
  loadedSessionId: string;
  activeSessionId: string;
  closeSidePanel: () => void;
  navigate: (route: AppRoute, replace?: boolean) => void;
  openSessionId: (sessionId: string) => Promise<boolean>;
}

export const useSessionRoute = ({
  route,
  disabled,
  surface,
  navigate,
  openSessionId,
  closeSidePanel,
  loadedSessionId,
  activeSessionId
}: SessionRouteOptions) => {
  const selectingSessionRef = useRef(false);
  const openingRouteSessionRef = useRef('');

  useEffect(() => {
    if (disabled) return;
    if (surface === 'composer') return;
    if (route.name !== 'chat' || !activeSessionId) return;
    navigate({ name: 'session', sessionId: activeSessionId }, true);
  }, [activeSessionId, disabled, navigate, route.name, surface]);

  useEffect(() => {
    if (disabled) return;
    if (surface === 'composer') return;
    if (route.name !== 'session') return;
    if (selectingSessionRef.current) return;
    if (route.sessionId === loadedSessionId) return;
    if (openingRouteSessionRef.current === route.sessionId) return;

    let active = true;
    const sessionId = route.sessionId;
    openingRouteSessionRef.current = sessionId;
    closeSidePanel();

    void openSessionId(sessionId)
      .then((opened) => {
        if (!active) return;

        openingRouteSessionRef.current = '';
        if (opened) return;
        if (sameRoute(currentRoute(), route)) navigate({ name: 'chat' }, true);
      })
      .catch(() => {
        if (!active) return;
        openingRouteSessionRef.current = '';
        if (sameRoute(currentRoute(), route)) navigate({ name: 'chat' }, true);
      });

    return () => {
      active = false;
      if (openingRouteSessionRef.current === sessionId) openingRouteSessionRef.current = '';
    };
  }, [closeSidePanel, disabled, loadedSessionId, navigate, openSessionId, route, surface]);

  return useCallback(
    async (session: RecentSession) => {
      const nextRoute: AppRoute = { name: 'session', sessionId: session.id };
      selectingSessionRef.current = true;
      openingRouteSessionRef.current = session.id;
      closeSidePanel();
      navigate(nextRoute, true);

      try {
        const opened = await openSessionId(session.id);
        if (opened) return true;
        if (sameRoute(currentRoute(), nextRoute)) navigate({ name: 'chat' }, true);
        return false;
      } finally {
        if (openingRouteSessionRef.current === session.id) openingRouteSessionRef.current = '';
        selectingSessionRef.current = false;
      }
    },
    [closeSidePanel, navigate, openSessionId]
  );
};
