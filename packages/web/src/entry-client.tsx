import '@/styles/app.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './app';

const root = document.getElementById('root') as HTMLElement;
const hasSSR = root.childNodes.length > 0 && root.innerHTML.trim() !== '';

if (hasSSR) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
