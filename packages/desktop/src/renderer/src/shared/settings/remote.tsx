import { RELAY_FEEDBACK_URL } from '@renderer/constants';

export const Remote = () => (
  <div class="mt-5 grid gap-6">
    <div class="grid gap-1">
      <h2 class="m-0 text-sm leading-5 font-medium text-ink">Remote access</h2>
      <p class="m-0 text-xs leading-5 text-soft">
        Remote access pairs your phone with this desktop through a relay. The relay is in the works, self-hosted for
        complete privacy.
      </p>
    </div>
    <div class="grid justify-items-start gap-2 rounded-2xl border border-line bg-composer p-5">
      <p class="m-0 text-sm leading-6 font-medium text-ink">
        Would you use a hosted relay, or would you rather host it yourself?{' '}
        <span class="font-normal text-soft">(your answer decides what we build first)</span>
      </p>
      <a
        target="_blank"
        rel="external noreferrer"
        href={RELAY_FEEDBACK_URL}
        class="mt-2 flex h-8 items-center rounded-full border border-line bg-control px-4 text-xs font-medium text-ink no-underline transition-opacity duration-100 ease-in hover:opacity-80"
      >
        Let us know
      </a>
    </div>
  </div>
);
