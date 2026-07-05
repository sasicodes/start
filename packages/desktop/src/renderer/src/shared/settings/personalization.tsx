import type { AppSettingsResult } from '@preload/index';
import { CliInstall } from '@renderer/shared/settings/cli';
import { ComposerShortcut } from '@renderer/shared/settings/composer-shortcut';
import { Sounds } from '@renderer/shared/settings/sounds';
import { Translucency } from '@renderer/shared/settings/translucency';

interface PersonalizationProps {
  translucentBackground: boolean;
  onTranslucentBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Personalization = ({ translucentBackground, onTranslucentBackgroundChange }: PersonalizationProps) => (
  <>
    <CliInstall />
    <Translucency enabled={translucentBackground} onChange={onTranslucentBackgroundChange} />
    <Sounds />
    <ComposerShortcut />
  </>
);
