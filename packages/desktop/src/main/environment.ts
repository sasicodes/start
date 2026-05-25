import { join } from 'node:path';
import { baseDir } from '@main/application';

process.env.PI_OAUTH_CALLBACK_HOST ??= 'localhost';
process.env.PI_CODING_AGENT_DIR ??= join(baseDir, 'agent');
process.env.PI_OFFLINE ??= '1';
process.env.PI_SKIP_VERSION_CHECK ??= '1';
process.env.PI_TELEMETRY ??= '0';

const readEnvironmentValue = (name: string) => process.env[name]?.trim() || undefined;

export const environment = {
  rendererUrl: readEnvironmentValue('ELECTRON_RENDERER_URL')
} as const;
