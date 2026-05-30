import type { AgentSession, SlashCommandInfo } from '@earendil-works/pi-coding-agent';

export interface SlashCommandItem {
  key: string;
  name: string;
  description: string;
  source: SlashCommandInfo['source'];
}

const slashCommandItem = (command: SlashCommandInfo): SlashCommandItem => ({
  name: command.name,
  source: command.source,
  description: command.description ?? '',
  key: `${command.source}:${command.sourceInfo.path}:${command.name}`
});

export const sessionSlashCommandItems = (session: AgentSession): SlashCommandItem[] => {
  const extensionCommands = session.extensionRunner.getRegisteredCommands().map((command) =>
    slashCommandItem({
      source: 'extension',
      name: command.invocationName,
      sourceInfo: command.sourceInfo,
      ...(command.description ? { description: command.description } : {})
    })
  );
  const promptCommands = session.promptTemplates.map((template) =>
    slashCommandItem({
      source: 'prompt',
      name: template.name,
      sourceInfo: template.sourceInfo,
      ...(template.description ? { description: template.description } : {})
    })
  );
  const skillCommands = session.resourceLoader.getSkills().skills.map((skill) =>
    slashCommandItem({
      source: 'skill',
      name: `skill:${skill.name}`,
      sourceInfo: skill.sourceInfo,
      ...(skill.description ? { description: skill.description } : {})
    })
  );

  return [...extensionCommands, ...promptCommands, ...skillCommands];
};
