import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import { type AppRoute, currentRoute, sameRoute } from '@renderer/utils/route';
import { useCallback, useEffect, useRef } from 'preact/hooks';

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

    const open = async () => {
      try {
        const opened = await openSessionId(sessionId);
        if (active && !opened && sameRoute(currentRoute(), route)) navigate({ name: 'chat' }, true);
      } catch {
        if (active && sameRoute(currentRoute(), route)) navigate({ name: 'chat' }, true);
      } finally {
        if (active) openingRouteSessionRef.current = '';
      }
    };
    open().catch(() => {});

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
