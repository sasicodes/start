import type { EffortLevel, ImageAttachment, ModelOption } from '@preload/index';
import type { RefObject } from 'preact';

export type ComposerProps = {
  draft: string;
  onStop: () => void;
  onPaste: (event: ClipboardEvent) => void;
  onSubmit: () => void;
  hasTurns: boolean;
  attachments: ImageAttachment[];
  models: ModelOption[];
  modelsLoaded: boolean;
  isGenerating: boolean;
  previousTurn: string;
  overlay?: boolean;
  thinkingLevel: EffortLevel;
  onRefillPrevious: () => void;
  selectedModelKey: string | undefined;
  onDraftChange: (value: string) => void;
  onSelectModel: (modelKey: string) => void;
  onRemoveAttachment: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAttachment: (path: string) => void;
  onSelectThinkingLevel: (level: EffortLevel) => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
};
