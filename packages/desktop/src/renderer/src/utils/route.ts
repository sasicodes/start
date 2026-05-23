export type AppRoute =
  | {
      name: 'chat';
    }
  | {
      name: 'session';
      sessionId: string;
    };

const cleanPath = (path: string) => path.replace(/\/+/gu, '/').replace(/\/$/u, '') || '/';

const routeFromPath = (path: string): AppRoute => {
  const clean = cleanPath(path);
  const sessionMatch = /^\/sessions\/([^/]+)$/u.exec(clean);
  if (sessionMatch?.[1]) {
    try {
      return { name: 'session', sessionId: decodeURIComponent(sessionMatch[1]) };
    } catch {
      return { name: 'chat' };
    }
  }

  return { name: 'chat' };
};

const hashPath = () => {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) return;
  return hash.slice(1);
};

export const currentRoute = (): AppRoute => {
  const hash = hashPath();
  if (hash) return routeFromPath(hash);

  const route = routeFromPath(window.location.pathname);
  if (route.name !== 'chat') return route;

  const sessionId = new URLSearchParams(window.location.search).get('session');
  return sessionId ? { name: 'session', sessionId } : route;
};

export const routeUrl = (route: AppRoute) => {
  const path = route.name === 'session' ? `/sessions/${encodeURIComponent(route.sessionId)}` : '/';
  const url = new URL(window.location.href);

  if (url.protocol !== 'file:') url.pathname = '/';
  url.hash = path === '/' ? '' : path;
  url.searchParams.delete('session');
  return url.toString();
};

export const sameRoute = (first: AppRoute, second: AppRoute) => {
  if (first.name !== second.name) return false;
  return first.name !== 'session' || second.name !== 'session' || first.sessionId === second.sessionId;
};
