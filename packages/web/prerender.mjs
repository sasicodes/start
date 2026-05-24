import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8');
const { render } = await import(resolve(distDir, 'server', 'entry-server.js'));

const routes = ['/', '/privacy', '/terms'];

for (const route of routes) {
  const html = template.replace('<!--ssr-outlet-->', render(route));

  if (route === '/') {
    writeFileSync(resolve(distDir, 'index.html'), html);
  } else {
    const dir = resolve(distDir, route.slice(1));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), html);
  }
}
