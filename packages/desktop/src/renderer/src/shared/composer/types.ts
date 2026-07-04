import type { EffortLevel, ImageAttachment, ModelOption, QueuedMessage } from '@preload/index';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import type { RefObject } from 'preact';

export interface ComposerProps {
  draft: string;
  hasTurns: boolean;
  exiting?: boolean;
  overlay?: boolean;
  onStop: () => void;
  revealKey?: number;
  onSubmit: () => void;
  onCancel?: () => void;
  models: ModelOption[];
  modelsLoaded: boolean;
  isGenerating: boolean;
  workspacePath: string;
  selectedModelKey: string;
  thinkingLevel: EffortLevel;
  onOpenSettings: (tab?: SettingsTab) => void;
  onExitComplete: () => void;
  noProvidersConfigured: boolean;
  attachments: ImageAttachment[];
  recallMessages: string[];
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
