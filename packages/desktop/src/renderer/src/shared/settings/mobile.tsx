import type { AppSettingsResult, MobileRelaySettings } from '@preload/index';
import { RELAY_SETUP_URL } from '@renderer/constants';
import { PairingQrDialog } from '@renderer/shared/settings/mobile/pairing';
import { keepAwake, updateKeepAwake } from '@renderer/shared/settings/state';
import { CheckIcon, QrIcon, SpinnerIcon, TrashIcon, XIcon } from '@renderer/ui/icons';
import { Toggle } from '@renderer/ui/toggle';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

interface MobileProps {
  settings: MobileRelaySettings;
  onChange: (settings: MobileRelaySettings) => Promise<AppSettingsResult>;
}

interface MobileInputProps {
  value: string;
  placeholder: string;
  type: 'text' | 'password';
  trailing?: ComponentChildren;
  onInput: (value: string) => void;
}

const mobileRelaySettingsKey = (settings: MobileRelaySettings) =>
  `${settings.desktopId}:${settings.enabled}:${settings.relayUrl}:${settings.desktopName}:${settings.relayToken}`;

const normalizedRelayUrl = (value: string) =>
  value
    .trim()
    .replace(/^http:/u, 'ws:')
    .replace(/^https:/u, 'wss:');

type RelayProbeStatus = 'idle' | 'checking' | 'ok' | 'fail';

const probeReadyUrl = (value: string) => {
  const normalized = normalizedRelayUrl(value);
  try {
    const { protocol } = new URL(normalized);
    return protocol === 'ws:' || protocol === 'wss:' ? normalized : '';
  } catch {
    return '';
  }
};

const useRelayProbe = (relayUrl: string, relayToken: string): RelayProbeStatus => {
  const [status, setStatus] = useState<RelayProbeStatus>('idle');
  const url = probeReadyUrl(relayUrl);
  const token = relayToken.trim();

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('checking');
    const checkRelay = async () => {
      try {
        const result = await window.pi.app.probeMobileRelay({ relayUrl: url, relayToken: token });
        if (active) setStatus(result.ok ? 'ok' : 'fail');
      } catch {
        if (active) setStatus('fail');
      }
    };
    const timer = setTimeout(() => {
      checkRelay();
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url, token]);

  return status;
};

const RelayStatus = ({ status }: { status: RelayProbeStatus }) => {
  if (status === 'checking')
    return (
      <span role="status" class="text-soft" aria-label="Checking relay connection">
        <SpinnerIcon class="block size-4 animate-spin" />
      </span>
    );
  if (status === 'ok')
    return (
      <span role="img" class="text-success" aria-label="Relay reachable">
        <CheckIcon class="block size-4" />
      </span>
    );
  if (status === 'fail')
    return (
      <span role="img" class="text-danger" aria-label="Relay unreachable">
        <XIcon class="block size-4" />
      </span>
    );
  return null;
};

const useMobileRelayCode = (enabled: boolean) => {
  const [code, setCode] = useState('');

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setCode('');
      return () => {
        active = false;
      };
    }

    const loadCode = async () => {
      try {
        const value = await window.pi.app.mobileRelayCode();
        if (active) setCode(value);
      } catch {
        return;
      }
    };

    loadCode();

    const stopMobileRelayCode = window.pi.app.onMobileRelayCode((value) => {
      if (active) setCode(value);
    });

    return () => {
      active = false;
      stopMobileRelayCode();
    };
  }, [enabled]);

  return code;
};

interface IconActionProps {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ComponentChildren;
}

const IconAction = ({ label, danger, onClick, children }: IconActionProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    class={tw(
      "relative inline-flex size-4 items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] [&_svg]:block [&_svg]:size-4",
      danger ? 'hover:text-danger focus-visible:text-danger' : 'hover:text-ink focus-visible:text-ink'
    )}
  >
    {children}
  </button>
);

const MobileInput = ({ type, value, onInput, placeholder, trailing }: MobileInputProps) => (
  <div class="relative">
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onInput={(event) => onInput(event.currentTarget.value)}
      class={tw(
        'h-10 w-full rounded-full border border-line bg-composer px-4 text-sm text-ink outline-none placeholder:text-soft',
        trailing ? 'pr-11' : ''
      )}
    />
    {trailing ? <div class="absolute inset-y-0 right-3.5 flex items-center">{trailing}</div> : null}
  </div>
);

export const Mobile = ({ settings, onChange }: MobileProps) => {
  const settingsKey = mobileRelaySettingsKey(settings);
  const [qrOpen, setQrOpen] = useState(false);
  const [draftState, setDraftState] = useState({ settings, settingsKey });
  const draft = draftState.settingsKey === settingsKey ? draftState.settings : settings;

  const updateDraft = (patch: Partial<MobileRelaySettings>) => {
    setDraftState({ settingsKey, settings: { ...draft, ...patch } });
  };

  const save = async () => {
    const relayUrl = normalizedRelayUrl(draft.relayUrl);
    await onChange({
      ...draft,
      enabled: Boolean(relayUrl),
      relayUrl,
      relayToken: draft.relayToken.trim()
    });
  };

  const remove = async () => {
    const nextSettings = { ...draft, enabled: false, relayUrl: '', relayToken: '' };
    setQrOpen(false);
    setDraftState({ settingsKey, settings: nextSettings });
    await onChange(nextSettings);
  };

  const canSave = Boolean(draft.desktopId && draft.relayUrl.trim());
  const qrAvailable = Boolean(settings.enabled && settings.relayUrl.trim());
  const relayCode = useMobileRelayCode(qrAvailable);
  const probeStatus = useRelayProbe(draft.relayUrl, draft.relayToken);

  return (
    <div class="grid gap-4">
      <div class="flex items-center justify-between gap-4">
        <div class="grid gap-1">
          <h3 class="m-0 text-sm leading-5 font-medium text-ink">Remote access</h3>
          <p class="m-0 text-xs leading-5 text-soft">
            Self-host our relay with the{' '}
            <a
              href={RELAY_SETUP_URL}
              target="_blank"
              rel="noreferrer"
              class="font-medium text-soft underline decoration-soft decoration-dotted underline-offset-3 transition-colors duration-100 hover:text-ink focus-visible:text-ink"
            >
              setup guide
            </a>{' '}
            and paste its WebSocket URL and token here.
          </p>
        </div>
        {qrAvailable && (
          <div class="flex flex-none items-center gap-4">
            <IconAction label="Show pairing QR" onClick={() => setQrOpen(true)}>
              <QrIcon />
            </IconAction>
            <IconAction danger onClick={remove} label="Delete mobile relay settings">
              <TrashIcon />
            </IconAction>
          </div>
        )}
      </div>

      {!qrAvailable && (
        <>
          <div class="grid gap-2">
            <MobileInput
              type="text"
              value={draft.relayUrl}
              trailing={<RelayStatus status={probeStatus} />}
              onInput={(relayUrl) => updateDraft({ relayUrl })}
              placeholder="Relay URL (e.g. wss://relay.example.com/connect)"
            />
            <MobileInput
              type="password"
              value={draft.relayToken}
              placeholder="START_RELAY_TOKEN"
              onInput={(relayToken) => updateDraft({ relayToken })}
            />
          </div>

          <div class="mt-1 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              class="h-8 rounded-full border-0 bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
            >
              Save
            </button>
          </div>
        </>
      )}
      {qrAvailable && (
        <div class="flex items-center justify-between gap-4">
          <div class="grid gap-1">
            <h3 class="m-0 text-sm leading-5 font-medium text-ink">Keep this system awake</h3>
            <p class="m-0 text-xs leading-5 text-soft">Prevent sleep when plugged in and remote access is enabled.</p>
          </div>
          <Toggle checked={keepAwake.value} onChange={updateKeepAwake} label="Keep this system awake" />
        </div>
      )}
      {qrOpen && <PairingQrDialog code={relayCode} settings={settings} onClose={() => setQrOpen(false)} />}
    </div>
  );
};
