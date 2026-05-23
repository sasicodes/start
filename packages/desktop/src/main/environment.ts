process.env.PI_OAUTH_CALLBACK_HOST ??= 'localhost';

const readEnvironmentValue = (name: string) => process.env[name]?.trim() || undefined;

export const environment = {
  rendererUrl: readEnvironmentValue('ELECTRON_RENDERER_URL')
} as const;
