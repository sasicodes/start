import type { EffortLevel, ImageAttachment, ModelOption, QueuedMessage } from '@preload/index';
import type { RefObject } from 'preact';

export interface ComposerProps {
  draft: string;
  onStop: () => void;
  hasTurns: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  onPaste: (event: ClipboardEvent) => void;
  attachments: ImageAttachment[];
  queuedMessages: QueuedMessage[];
  models: ModelOption[];
  modelsLoaded: boolean;
  isGenerating: boolean;
  previousTurn: string;
  exiting?: boolean;
  overlay?: boolean;
  revealKey?: number;
  workspacePath: string;
  thinkingLevel: EffortLevel;
  onOpenSettings: () => void;
  onExitComplete: () => void;
  onRefillPrevious: () => void;
  selectedModelKey: string;
  onDraftChange: (value: string) => void;
  onRemoveAttachment: (id: string) => void;
  onSelectModel: (modelKey: string) => void;
  onOpenAttachment: (path: string) => void;
  onSelectWorkspace: (path: string) => void;
  onSteerQueuedMessage: (id: string) => void;
  onDeleteQueuedMessage: (id: string) => void;
  onChooseWorkspaceDirectory: () => void;
  onSelectThinkingLevel: (level: EffortLevel) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}
