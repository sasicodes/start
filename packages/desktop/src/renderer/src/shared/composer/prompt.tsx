import { tw } from '@renderer/utils/tw';

interface PromptProps {
  draft: string;
  label: string;
  expanded: boolean;
  singleLine: boolean;
  placeholder: string;
  layered: boolean;
  activeDescendant?: string;
  onPaste: (event: ClipboardEvent) => void;
  onInput: (event: InputEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  inputRef: (element: HTMLTextAreaElement | null) => void;
}

export const Prompt = ({
  draft,
  label,
  onPaste,
  onInput,
  expanded,
  inputRef,
  singleLine,
  onKeyDown,
  layered,
  placeholder,
  activeDescendant
}: PromptProps) => (
  <textarea
    rows={1}
    value={draft}
    ref={inputRef}
    role="combobox"
    aria-label={label}
    aria-expanded={expanded}
    aria-controls="composer-finder"
    aria-autocomplete="list"
    {...(activeDescendant ? { 'aria-activedescendant': activeDescendant } : {})}
    spellcheck={false}
    autoCorrect="off"
    onInput={onInput}
    onPaste={onPaste}
    onKeyDown={onKeyDown}
    autoComplete="off"
    autoCapitalize="off"
    placeholder={placeholder}
    {...(singleLine ? { wrap: 'off' } : {})}
    class={tw(
      'block min-h-5.75 w-full min-w-0 resize-none border-0 bg-transparent py-0.5 text-sm leading-6 text-ink outline-0 placeholder:text-soft [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-soft/25 [&::-webkit-scrollbar-track]:bg-transparent',
      layered ? 'px-2.5' : 'px-1',
      singleLine && 'overflow-hidden',
      !singleLine && 'max-h-25.5 overflow-y-auto',
      !layered && '[&::-webkit-scrollbar]:hidden'
    )}
  />
);
