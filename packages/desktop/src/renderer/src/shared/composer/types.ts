import type { EffortLevel, ImageAttachment, ModelOption, QueuedMessage } from '@preload/index';
import type { RefObject } from 'preact';

export interface ComposerProps {
  draft: string;
  hasTurns: boolean;
  exiting?: boolean;
  overlay?: boolean;
  onStop: () => void;
  revealKey?: number;
  onSubmit: () => void;
  previousTurn: string;
  onCancel?: () => void;
  models: ModelOption[];
  modelsLoaded: boolean;
  isGenerating: boolean;
  workspacePath: string;
  selectedModelKey: string;
  thinkingLevel: EffortLevel;
  onOpenSettings: () => void;
  onExitComplete: () => void;
  onRefillPrevious: () => void;
  attachments: ImageAttachment[];
  queuedMessages: QueuedMessage[];
  onDraftChange: (value: string) => void;
  onChooseWorkspaceDirectory: () => void;
  onPaste: (event: ClipboardEvent) => void;
  onRemoveAttachment: (id: string) => void;
  onOpenAttachment: (path: string) => void;
  onSelectModel: (modelKey: string) => void;
  onSelectWorkspace: (path: string) => void;
  onSteerQueuedMessage: (id: string) => void;
  onDeleteQueuedMessage: (id: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onSelectThinkingLevel: (level: EffortLevel) => void;
}
