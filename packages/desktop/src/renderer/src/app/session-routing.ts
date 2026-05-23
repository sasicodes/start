import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import { currentRoute, sameRoute, type AppRoute } from '@renderer/utils/route';
import { useCallback, useEffect, useRef } from 'preact/hooks';

interface SessionRoutingOptions {
  route: AppRoute;
  surface: AppSurface;
  activeSessionId: string;
  loadedSessionId: string;
  clearSidePanels: () => void;
  navigate: (route: AppRoute, replace?: boolean) => void;
  openSession: (path: string) => Promise<boolean>;
  openSessionId: (sessionId: string) => Promise<boolean>;
}

export const useSessionRouting = ({
  route,
  surface,
  navigate,
  openSession,
  openSessionId,
  activeSessionId,
  loadedSessionId,
  clearSidePanels
}: SessionRoutingOptions) => {
  const selectingSessionRef = useRef(false);
  const openingRouteSessionRef = useRef('');

  useEffect(() => {
    if (surface === 'composer') return;
    if (route.name !== 'chat' || !activeSessionId) return;
    navigate({ name: 'session', sessionId: activeSessionId }, true);
  }, [activeSessionId, navigate, route.name, surface]);

  useEffect(() => {
    if (surface === 'composer') return;
    if (route.name !== 'session') return;
    if (selectingSessionRef.current) return;
    if (route.sessionId === loadedSessionId) return;
    if (openingRouteSessionRef.current === route.sessionId) return;

    let active = true;
    const sessionId = route.sessionId;
    openingRouteSessionRef.current = sessionId;

    void openSessionId(sessionId)
      .then((opened) => {
        if (!active) return;

        openingRouteSessionRef.current = '';
        if (opened) {
          clearSidePanels();
          return;
        }
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
  }, [clearSidePanels, loadedSessionId, navigate, openSessionId, route, surface]);

  return useCallback(
    async (session: RecentSession) => {
      selectingSessionRef.current = true;
      try {
        const opened = await openSession(session.path);
        if (opened) {
          clearSidePanels();
          navigate({ name: 'session', sessionId: session.id }, true);
        }
        return opened;
      } finally {
        selectingSessionRef.current = false;
      }
    },
    [clearSidePanels, navigate, openSession]
  );
};
