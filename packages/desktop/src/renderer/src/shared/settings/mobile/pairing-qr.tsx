import type { MobileRelaySettings } from '@preload/index';
import { appIconHref } from '@renderer/constants';
import { mobilePairingQrSvg } from '@renderer/shared/settings/utils/pairing';
import { useState } from 'preact/hooks';

interface PairingQrDialogProps {
  code: string;
  onClose: () => void;
  settings: MobileRelaySettings;
}

export const PairingQrDialog = ({ code, onClose, settings }: PairingQrDialogProps) => {
  const [pulseKey, setPulseKey] = useState(0);

  return (
    <div class="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close pairing QR"
        class="absolute inset-0 border-0 bg-transparent p-0 backdrop-blur-md"
        onClick={onClose}
      />
      <section role="dialog" aria-modal="true" aria-label="Pairing QR" class="relative grid justify-items-center gap-2">
        <button
          type="button"
          aria-label="Pairing QR code"
          onClick={() => setPulseKey((value) => value + 1)}
          class="group relative grid size-56 place-items-center overflow-hidden rounded-3xl border border-line bg-white p-2 text-zinc-950 shadow-shell outline-0 transition-[color,transform] duration-200 ease-out hover:text-pairing-accent focus-visible:text-pairing-accent active:scale-[0.985] [&_rect]:transition-colors [&_rect]:duration-200 [&_svg]:block [&_svg]:size-full"
        >
          {pulseKey > 0 ? (
            <span
              key={pulseKey}
              class="pointer-events-none absolute inset-0 rounded-3xl bg-pairing-accent/20 animate-pairing-qr-ripple"
            />
          ) : null}
          <span
            class="relative z-10 block size-full"
            dangerouslySetInnerHTML={{ __html: mobilePairingQrSvg(settings, code) }}
          />
          <span class="absolute z-20 grid size-10 place-items-center rounded-2xl bg-white p-1.5 shadow-shell">
            <img src={appIconHref} alt="" class="block size-full rounded-xl" />
          </span>
        </button>
        <p class="m-0 max-w-56 text-center text-xs leading-4 font-medium text-soft">
          Scan with Start mobile to connect remotely
        </p>
      </section>
    </div>
  );
};
