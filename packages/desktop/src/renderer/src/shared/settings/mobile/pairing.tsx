import type { MobileRelaySettings } from '@preload/index';
import { appIconHref } from '@renderer/constants';
import { mobilePairingQrSvg } from '@renderer/shared/settings/utils/pairing';
import { tw } from '@renderer/utils/tw';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

interface PairingQrDialogProps {
  code: string;
  onClose: () => void;
  settings: MobileRelaySettings;
}

export const PairingQrDialog = ({ code, onClose, settings }: PairingQrDialogProps) => {
  const frameRef = useRef(0);
  const [bursting, setBursting] = useState(true);
  const qrMarkup = useMemo(() => mobilePairingQrSvg(settings, code), [settings, code]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const replay = () => {
    cancelAnimationFrame(frameRef.current);
    setBursting(false);
    frameRef.current = requestAnimationFrame(() => setBursting(true));
  };

  return (
    <div class="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close pairing QR"
        class="absolute inset-0 border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <section role="dialog" aria-modal="true" aria-label="Pairing QR" class="relative grid justify-items-center gap-2">
        <div class="relative grid size-56 place-items-center overflow-hidden rounded-3xl border border-line bg-white p-2 text-zinc-950 shadow-shell [&_svg]:block [&_svg]:size-full">
          <span
            class={tw('relative z-10 block size-full', bursting && 'pairing-qr-burst')}
            dangerouslySetInnerHTML={{ __html: qrMarkup }}
          />
          <button
            type="button"
            onClick={replay}
            aria-label="Pairing logo"
            class="absolute z-20 grid size-10 place-items-center overflow-hidden rounded-2xl border-0 bg-transparent p-0 outline-0 transition-transform duration-150 ease-out active:scale-95"
          >
            <img alt="" src={appIconHref} draggable={false} class="block size-full rounded-2xl" />
          </button>
        </div>
        <p class="m-0 max-w-56 text-center text-xs leading-4 font-medium text-soft">Open Start mobile and scan</p>
      </section>
    </div>
  );
};
