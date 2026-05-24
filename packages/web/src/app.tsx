import { Privacy } from '@/components/legal/privacy';
import { Terms } from '@/components/legal/terms';
import { Home } from '@/home';

interface AppProps {
  path?: string;
}

export const App = ({ path }: AppProps) => {
  const route = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

  if (route === '/privacy') return <Privacy />;
  if (route === '/terms') return <Terms />;
  return <Home />;
};
