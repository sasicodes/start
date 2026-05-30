import { tw } from '@renderer/utils/tw';

export type ProviderFormDraft = {
  name: string;
  apiKey: string;
  baseUrl: string;
  thinking: string;
  modelIds: string;
};

export const emptyProviderFormDraft: ProviderFormDraft = {
  name: '',
  apiKey: '',
  baseUrl: '',
  thinking: '',
  modelIds: ''
};

interface PillInputProps {
  type: 'text' | 'password';
  value: string;
  onInput: (value: string) => void;
  placeholder: string;
}

const PillInput = ({ type, value, onInput, placeholder }: PillInputProps) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    onInput={(event) => onInput(event.currentTarget.value)}
    class="h-10 w-full rounded-full border border-line bg-composer px-4 text-sm text-ink outline-none placeholder:text-soft"
  />
);

interface ProviderFormProps {
  draft: ProviderFormDraft;
  error: string;
  canSubmit: boolean;
  secondaryLabel: string;
  secondaryDanger?: boolean;
  onSubmit: () => void;
  onSecondary: () => void;
  onUpdate: <K extends keyof ProviderFormDraft>(key: K, value: ProviderFormDraft[K]) => void;
}

export const ProviderForm = ({
  draft,
  error,
  canSubmit,
  secondaryLabel,
  secondaryDanger,
  onSubmit,
  onUpdate,
  onSecondary
}: ProviderFormProps) => (
  <div class="grid gap-2">
    <PillInput
      type="text"
      value={draft.name}
      onInput={(value) => onUpdate('name', value)}
      placeholder="Provider name (e.g. Ollama Home)"
    />
    <PillInput
      type="text"
      value={draft.baseUrl}
      onInput={(value) => onUpdate('baseUrl', value)}
      placeholder="Base URL (e.g. http://localhost:11434/v1)"
    />
    <PillInput
      type="password"
      value={draft.apiKey}
      onInput={(value) => onUpdate('apiKey', value)}
      placeholder="API key"
    />
    <textarea
      rows={3}
      value={draft.modelIds}
      placeholder="Model IDs, one per line (e.g. llama3.1:8b)"
      onInput={(event) => onUpdate('modelIds', event.currentTarget.value)}
      class="w-full rounded-2xl border border-line bg-composer px-4 py-2 text-sm text-ink outline-none placeholder:text-soft"
    />
    <PillInput
      type="text"
      value={draft.thinking}
      onInput={(value) => onUpdate('thinking', value)}
      placeholder="Thinking levels (optional, up to 4, e.g. minimal, low, medium, high)"
    />
    {error && <p class="m-0 text-xs leading-4 text-danger">{error}</p>}
    <div class="mt-1 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onSecondary}
        class={tw(
          'h-8 rounded-full border-0 px-4 text-sm font-medium transition-opacity duration-100 ease-in hover:opacity-80',
          secondaryDanger ? 'bg-danger/15 text-danger' : 'bg-control text-soft'
        )}
      >
        {secondaryLabel}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        class="h-8 rounded-full border-0 bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
      >
        Save
      </button>
    </div>
  </div>
);
