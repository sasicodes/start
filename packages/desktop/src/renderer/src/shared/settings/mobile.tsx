import type { AppSettingsResult, MobileRelaySettings } from '@preload/index';
import { mobilePairingQrSvg } from '@renderer/shared/settings/utils/pairing';
import { QrIcon, TrashIcon } from '@renderer/ui/icons';
import { useEffect, useState } from 'preact/hooks';

interface MobileProps {
  settings: MobileRelaySettings;
  onChange: (settings: MobileRelaySettings) => Promise<AppSettingsResult>;
}

interface MobileInputProps {
  value: string;
  placeholder: string;
  type: 'text' | 'password';
  onInput: (value: string) => void;
}

const mobileRelaySettingsKey = (settings: MobileRelaySettings) =>
  `${settings.desktopId}:${settings.enabled}:${settings.relayUrl}:${settings.relayToken}`;

const normalizedRelayUrl = (value: string) =>
  value
    .trim()
    .replace(/^http:/u, 'ws:')
    .replace(/^https:/u, 'wss:');

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

    window.pi.app
      .mobileRelayCode()
      .then((value) => {
        if (active) setCode(value);
      })
      .catch(() => {});

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

const MobileInput = ({ type, value, onInput, placeholder }: MobileInputProps) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    onInput={(event) => onInput(event.currentTarget.value)}
    class="h-10 w-full rounded-full border border-line bg-composer px-4 text-sm text-ink outline-none placeholder:text-soft"
  />
);

interface PairingQrDialogProps {
  code: string;
  onClose: () => void;
  settings: MobileRelaySettings;
}

const PairingQrDialog = ({ code, onClose, settings }: PairingQrDialogProps) => (
  <div class="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
    <button
      type="button"
      aria-label="Close pairing QR"
      class="absolute inset-0 border-0 bg-black/20 p-0"
      onClick={onClose}
    />
    <section role="dialog" aria-modal="true" aria-label="Pairing QR" class="relative grid justify-items-center gap-3">
      <div
        class="grid size-44 place-items-center rounded-2xl bg-white p-3 text-zinc-950 shadow-shell [&_svg]:block [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: mobilePairingQrSvg(settings, code) }}
      />
      <p class="m-0 rounded-full bg-composer px-3 py-1.5 text-center text-xs leading-4 font-medium text-soft shadow-shell">
        Scan to pair
      </p>
    </section>
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

  const persist = async (nextSettings: MobileRelaySettings) => {
    await onChange(nextSettings);
  };

  const save = async () => {
    const relayUrl = normalizedRelayUrl(draft.relayUrl);
    await persist({
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
    await persist(nextSettings);
  };

  const canSave = Boolean(draft.desktopId && draft.relayUrl.trim());
  const qrAvailable = Boolean(settings.enabled && settings.relayUrl.trim());
  const relayCode = useMobileRelayCode(qrAvailable);

  return (
    <div class="grid gap-4">
      <div class="flex items-start justify-between gap-4">
        <div class="grid gap-1">
          <h3 class="m-0 text-sm leading-5 font-medium text-ink">Remote access</h3>
          <p class="m-0 text-xs leading-5 text-soft">
            Connect this desktop to your hosted relay so trusted phones can start and resume work.
          </p>
        </div>
        {qrAvailable && (
          <div class="flex flex-none items-center gap-4">
            <button
              type="button"
              aria-label="Show pairing QR"
              onClick={() => setQrOpen(true)}
              class="relative inline-flex size-4 items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-ink focus-visible:text-ink [&_svg]:block [&_svg]:size-4"
            >
              <QrIcon />
            </button>
            <button
              type="button"
              aria-label="Delete mobile relay settings"
              onClick={() => remove().catch(() => {})}
              class="relative inline-flex size-4 items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-danger focus-visible:text-danger [&_svg]:block [&_svg]:size-4"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {!qrAvailable && (
        <>
          <div class="grid gap-2">
            <MobileInput
              type="text"
              value={draft.relayUrl}
              placeholder="Relay URL (e.g. wss://relay.example.com/connect)"
              onInput={(relayUrl) => updateDraft({ relayUrl })}
            />
            <MobileInput
              type="password"
              value={draft.relayToken}
              placeholder="Relay token (optional)"
              onInput={(relayToken) => updateDraft({ relayToken })}
            />
          </div>

          <div class="mt-1 flex justify-end">
            <button
              type="button"
              disabled={!canSave}
              onClick={() => save().catch(() => {})}
              class="h-8 rounded-full border-0 bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
            >
              Save
            </button>
          </div>
        </>
      )}
      {qrOpen && <PairingQrDialog code={relayCode} settings={settings} onClose={() => setQrOpen(false)} />}
    </div>
  );
};
