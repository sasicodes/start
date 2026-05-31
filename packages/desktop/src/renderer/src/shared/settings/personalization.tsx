import type { AppSettingsResult } from '@preload/index';
import { CliInstall } from '@renderer/shared/settings/cli';
import { ComposerShortcut } from '@renderer/shared/settings/composer-shortcut';
import { Translucency } from '@renderer/shared/settings/translucency';

interface PersonalizationProps {
  composerShortcut: string;
  translucentBackground: boolean;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
  onTranslucentBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Personalization = ({
  composerShortcut,
  translucentBackground,
  onComposerShortcutChange,
  onTranslucentBackgroundChange
}: PersonalizationProps) => (
  <>
    <ComposerShortcut composerShortcut={composerShortcut} onChange={onComposerShortcutChange} />
    <Translucency enabled={translucentBackground} onChange={onTranslucentBackgroundChange} />
    <CliInstall />
  </>
);
