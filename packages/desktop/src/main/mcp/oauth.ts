import { createServer } from 'node:http';
import { appVersion } from '@main/application';
import { expandServerVars, type RemoteServer } from '@main/mcp/config';
import { resolveServerVar } from '@main/mcp/secrets';
import { resolveSecretCodec } from '@main/providers/codec';
import { readStartState, updateStartState } from '@main/storage';
import { type OAuthClientProvider, UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import electron from 'electron';
import * as v from 'valibot';

const { shell } = electron;

const codec = resolveSecretCodec();
const callbackTimeoutMs = 5 * 60 * 1000;
const placeholderRedirectUrl = 'http://127.0.0.1/callback';

const storedAuthSchema = v.object({
  codeVerifier: v.optional(v.string()),
  tokens: v.optional(v.looseObject({ access_token: v.string(), token_type: v.string() })),
  clientInformation: v.optional(v.looseObject({ client_id: v.string() }))
});

interface StoredAuth {
  tokens?: OAuthTokens;
  codeVerifier?: string;
  clientInformation?: OAuthClientInformationMixed;
}

const readAuth = (server: string): StoredAuth => {
  const encrypted = readStartState().mcpAuth?.[server];
  if (!encrypted) return {};

  try {
    const parsed = v.safeParse(storedAuthSchema, JSON.parse(codec.decode(Buffer.from(encrypted, 'base64'))));
    return parsed.success ? (parsed.output as StoredAuth) : {};
  } catch {
    return {};
  }
};

const patchAuth = (server: string, patch: Partial<StoredAuth>) => {
  if (!codec.available()) return;

  const auth = { ...readStartState().mcpAuth };
  auth[server] = codec.encode(JSON.stringify({ ...readAuth(server), ...patch })).toString('base64');
  updateStartState({ mcpAuth: auth });
};

export const clearServerAuth = (server: string) => {
  const auth = { ...readStartState().mcpAuth };
  delete auth[server];
  updateStartState({ mcpAuth: auth });
};

export const serverHasAuth = (server: string) => Boolean(readAuth(server).tokens);

interface InteractiveAuth {
  redirectUrl: string;
  onAuthorize: (url: URL) => void;
}

export const mcpAuthProvider = (server: string, interactive?: InteractiveAuth): OAuthClientProvider => ({
  redirectUrl: interactive?.redirectUrl ?? placeholderRedirectUrl,
  clientMetadata: {
    client_name: 'start',
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    redirect_uris: [interactive?.redirectUrl ?? placeholderRedirectUrl]
  },
  tokens: () => readAuth(server).tokens,
  saveTokens: (tokens) => patchAuth(server, { tokens }),
  codeVerifier: () => readAuth(server).codeVerifier ?? '',
  clientInformation: () => readAuth(server).clientInformation,
  saveCodeVerifier: (codeVerifier) => patchAuth(server, { codeVerifier }),
  saveClientInformation: (clientInformation) => patchAuth(server, { clientInformation }),
  redirectToAuthorization: (url) => {
    if (!interactive) throw new UnauthorizedError('Authentication required.');
    interactive.onAuthorize(url);
  }
});

interface AuthCallback {
  url: string;
  code: Promise<string>;
  close: () => void;
}

const callbackPage =
  '<html><body style="font-family: system-ui; padding: 40px;">Connected. You can close this window.</body></html>';

const startAuthCallback = async (): Promise<AuthCallback> => {
  let resolveCode: (code: string) => void = () => {};
  let rejectCode: (error: Error) => void = () => {};

  const code = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const timer = setTimeout(() => rejectCode(new Error('Authentication timed out.')), callbackTimeoutMs);

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const authCode = requestUrl.searchParams.get('code');
    const authError = requestUrl.searchParams.get('error');

    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(callbackPage);

    if (authCode) resolveCode(authCode);
    else rejectCode(new Error(authError || 'Authentication was canceled.'));
  });

  const url = await new Promise<string>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') resolve(`http://127.0.0.1:${address.port}/callback`);
      else reject(new Error('Authentication callback failed to start.'));
    });
  });

  return {
    url,
    code,
    close: () => {
      clearTimeout(timer);
      server.close();
    }
  };
};

export const authenticateServer = async (server: RemoteServer): Promise<boolean> => {
  const callback = await startAuthCallback();

  try {
    const provider = mcpAuthProvider(server.name, {
      redirectUrl: callback.url,
      onAuthorize: (url) => {
        shell.openExternal(url.toString()).catch(() => {});
      }
    });
    const transport = new StreamableHTTPClientTransport(new URL(server.url), {
      authProvider: provider,
      requestInit: { headers: expandServerVars(server.headers, (name) => resolveServerVar(server.name, name)) }
    });
    const client = new Client({ name: 'start', version: appVersion });

    try {
      await client.connect(transport as Transport);
      await client.close();
      return true;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
    }

    await transport.finishAuth(await callback.code);
    await transport.close();
    return true;
  } catch {
    return false;
  } finally {
    callback.close();
  }
};
