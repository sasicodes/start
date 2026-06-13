import type { McpServerSnapshot } from '@preload/index';
import { Toggle } from '@renderer/ui/toggle';
import { tw } from '@renderer/utils/tw';
import { useEffect, useState } from 'preact/hooks';

let cachedServers: McpServerSnapshot[] | null = null;

interface ServerRowProps {
  busy: boolean;
  server: McpServerSnapshot;
  onSaveSecret: (name: string, value: string) => void;
  onAction: (run: () => Promise<McpServerSnapshot[]>) => void;
}

const statusText = (server: McpServerSnapshot): string => {
  if (server.status === 'connected') return server.toolCount ? `Connected · ${server.toolCount} tools` : 'Connected';
  if (server.status === 'disabled') return 'Disabled';
  if (server.status === 'untrusted') return 'Needs approval';
  if (server.status === 'needs-auth') return 'Authentication required';
  if (server.status === 'missing-vars') return `Needs ${server.missingVars.join(', ')}`;
  if (server.status === 'error') return server.error || 'Connection failed';
  return 'Not connected';
};

const actionLabel = (server: McpServerSnapshot): string => {
  if (server.status === 'untrusted') return 'Allow';
  if (server.status === 'idle' || server.status === 'error' || server.status === 'needs-auth') return 'Connect';
  if (server.status === 'connected' && server.authenticated) return 'Disconnect';
  return '';
};

const runServerAction = (server: McpServerSnapshot) => {
  if (server.status === 'untrusted') return window.pi.mcp.setWorkspaceTrust(true);
  if (server.status === 'connected' && server.authenticated) return window.pi.mcp.disconnect(server.name);
  return window.pi.mcp.connect(server.name);
};

const SecretField = ({ name, onSave }: { name: string; onSave: (value: string) => void }) => {
  const [value, setValue] = useState('');

  return (
    <div class="relative mt-3 rounded-full border border-line bg-composer p-1">
      <input
        type="password"
        value={value}
        placeholder={name}
        onInput={(event) => setValue(event.currentTarget.value)}
        class="h-8 w-full rounded-full border-0 bg-transparent pr-20 pl-3 text-sm text-ink outline-none placeholder:text-soft"
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => onSave(value)}
        class="absolute top-1 right-1 h-8 rounded-full border-0 bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
      >
        Save
      </button>
    </div>
  );
};

const ServerRow = ({ busy, server, onAction, onSaveSecret }: ServerRowProps) => {
  const label = actionLabel(server);
  const origin = server.origin === 'project' ? 'Project' : 'Global';

  return (
    <div>
      <div class="flex min-w-0 items-center gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-sm leading-5 font-medium text-ink">{server.name}</h3>
          <p class="m-0 mt-0.5 truncate text-xs leading-4 text-soft">
            {origin} · <span class={tw(server.status === 'connected' && 'text-success')}>{statusText(server)}</span>
          </p>
        </div>
        {label && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(() => runServerAction(server))}
            class="h-8 flex-none rounded-full border border-line bg-control px-3 text-xs font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
          >
            {busy ? 'Connecting' : label}
          </button>
        )}
        <Toggle
          label={`Enable ${server.name}`}
          checked={server.enabled}
          disabled={busy}
          onChange={(enabled) => onAction(() => window.pi.mcp.setEnabled(server.name, enabled))}
        />
      </div>
      {server.status === 'missing-vars' &&
        server.missingVars.map((name) => (
          <SecretField key={name} name={name} onSave={(value) => onSaveSecret(name, value)} />
        ))}
    </div>
  );
};

export const Mcp = () => {
  const [error, setError] = useState('');
  const [busyServer, setBusyServer] = useState('');
  const [servers, setServers] = useState<McpServerSnapshot[]>(cachedServers ?? []);

  useEffect(() => {
    let active = true;

    window.pi.mcp
      .servers()
      .then((loaded) => {
        cachedServers = loaded;
        if (active) setServers(loaded);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const applyServers = (loaded: McpServerSnapshot[]) => {
    cachedServers = loaded;
    setServers(loaded);
  };

  const runAction = (name: string) => async (run: () => Promise<McpServerSnapshot[]>) => {
    setError('');
    setBusyServer(name);
    try {
      applyServers(await run());
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusyServer('');
    }
  };

  const saveSecret = async (server: string, name: string, value: string) => {
    setError('');
    try {
      const result = await window.pi.mcp.setSecret(server, name, value);
      if (!result.ok) {
        setError('Secure storage is unavailable on this device.');
        return;
      }
      applyServers(result.servers);
    } catch {
      setError('Something went wrong. Try again.');
    }
  };

  const openConfig = (origin: 'global' | 'project') => {
    window.pi.mcp.openConfig(origin).catch(() => {});
  };

  return (
    <div class="grid gap-5">
      {servers.length === 0 && <p class="m-0 text-sm leading-5 text-soft">No MCP servers configured.</p>}
      {servers.map((server) => (
        <ServerRow
          key={server.name}
          server={server}
          busy={busyServer === server.name}
          onAction={runAction(server.name)}
          onSaveSecret={(name, value) => saveSecret(server.name, name, value)}
        />
      ))}
      {error && <p class="m-0 text-xs leading-4 text-danger">{error}</p>}
      <div class="flex items-center gap-4 text-xs leading-4">
        <button
          type="button"
          onClick={() => openConfig('global')}
          class="border-0 bg-transparent p-0 font-medium text-soft transition-colors duration-100 hover:text-ink"
        >
          Open global config
        </button>
        <button
          type="button"
          onClick={() => openConfig('project')}
          class="border-0 bg-transparent p-0 font-medium text-soft transition-colors duration-100 hover:text-ink"
        >
          Open project config
        </button>
        <span class="ml-auto text-soft">Changes apply to new sessions</span>
      </div>
    </div>
  );
};
