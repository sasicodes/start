import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { DefaultResourceLoader } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { buildStartSystemPrompt, createStartPromptExtension } from '@main/prompt/index';

const piConfigSegment = `${sep}.pi${sep}`;
const globalSkillsDir = join(homedir(), '.agents', 'skills');
const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const startPromptsPrefix = `${startPromptsDir}${sep}`;
const systemPrompt = buildStartSystemPrompt(startPromptsDir);

export const createStartResourceLoader = async (cwd: string) => {
  const projectSkillsDir = join(cwd, '.agents', 'skills');
  const skillDirs = [globalSkillsDir, projectSkillsDir];

  const loader = new DefaultResourceLoader({
    cwd,
    systemPrompt,
    noThemes: true,
    noSkills: false,
    noExtensions: false,
    noContextFiles: false,
    appendSystemPrompt: [],
    agentDir: startAgentDir,
    noPromptTemplates: false,
    skillsOverride: (base) => ({
      ...base,
      skills: base.skills.filter((skill) =>
        skillDirs.some((dir) => skill.sourceInfo.path === dir || skill.sourceInfo.path.startsWith(`${dir}${sep}`))
      )
    }),
    promptsOverride: (base) => ({
      ...base,
      prompts: base.prompts.filter((prompt) => prompt.sourceInfo.path.startsWith(startPromptsPrefix))
    }),
    extensionsOverride: (base) => ({
      ...base,
      extensions: base.extensions.filter((extension) => !extension.sourceInfo?.path?.includes(piConfigSegment))
    }),
    additionalSkillPaths: skillDirs,
    additionalPromptTemplatePaths: [startPromptsDir],
    extensionFactories: [createStartPromptExtension(startPromptsDir)]
  });

  await loader.reload();
  return loader;
};
