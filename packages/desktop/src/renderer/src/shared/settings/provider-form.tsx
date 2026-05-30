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
  error: string;
  draftName: string;
  draftApiKey: string;
  draftBaseUrl: string;
  draftThinking: string;
  draftModelIds: string;
  canSubmit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onChangeName: (value: string) => void;
  onChangeApiKey: (value: string) => void;
  onChangeBaseUrl: (value: string) => void;
  onChangeThinking: (value: string) => void;
  onChangeModelIds: (value: string) => void;
}

export const ProviderForm = ({
  error,
  draftName,
  draftApiKey,
  draftBaseUrl,
  draftThinking,
  draftModelIds,
  canSubmit,
  onCancel,
  onSubmit,
  onChangeName,
  onChangeApiKey,
  onChangeBaseUrl,
  onChangeThinking,
  onChangeModelIds
}: ProviderFormProps) => (
  <div class="grid gap-2">
    <PillInput type="text" value={draftName} onInput={onChangeName} placeholder="Provider name (e.g. Ollama Home)" />
    <PillInput
      type="text"
      value={draftBaseUrl}
      onInput={onChangeBaseUrl}
      placeholder="Base URL (e.g. http://localhost:11434/v1)"
    />
    <PillInput type="password" value={draftApiKey} onInput={onChangeApiKey} placeholder="API key" />
    <textarea
      rows={3}
      value={draftModelIds}
      placeholder="Model IDs, one per line (e.g. llama3.1:8b)"
      onInput={(event) => onChangeModelIds(event.currentTarget.value)}
      class="w-full rounded-2xl border border-line bg-composer px-4 py-2 text-sm text-ink outline-none placeholder:text-soft"
    />
    <PillInput
      type="text"
      value={draftThinking}
      onInput={onChangeThinking}
      placeholder="Thinking levels (optional, up to 4, e.g. minimal, low, medium, high)"
    />
    {error && <p class="m-0 text-xs leading-4 text-danger">{error}</p>}
    <div class="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        class="h-8 rounded-full border-0 bg-transparent px-3 text-xs font-medium text-soft transition-opacity duration-100 ease-in hover:opacity-80"
      >
        Cancel
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
