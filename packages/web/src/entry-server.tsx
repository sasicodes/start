import { renderToString } from 'react-dom/server';
import { App } from './app';

export const render = (path = '/') => {
  return renderToString(<App path={path} />);
};
