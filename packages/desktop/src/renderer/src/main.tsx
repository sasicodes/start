import { App } from '@renderer/app';
import { render } from 'preact';
import './styles.css';

const installRendererIcon = () => {
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) icon.href = import.meta.env.DEV ? '/icon-dev.png' : '/icon.png';
};

installRendererIcon();

const root = document.getElementById('root');

if (!(root instanceof HTMLElement)) {
  throw new Error('start root element was not found');
}

render(<App />, root);
