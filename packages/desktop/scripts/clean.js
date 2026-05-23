import { rmSync } from 'node:fs';

for (const path of ['out', 'release']) {
  rmSync(path, { recursive: true, force: true });
}
