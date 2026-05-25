import { join, sep } from 'node:path';
import { DefaultResourceLoader } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { buildStartSystemPrompt } from '@main/system-prompt';

const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const piConfigSegment = `${sep}.pi${sep}`;
const systemPrompt = buildStartSystemPrompt(startPromptsDir);

const startPromptsPrefix = `${startPromptsDir}${sep}`;

const isUnderDir = (path: string, dir: string) => path === dir || path.startsWith(`${dir}${sep}`);

export const createStartResourceLoader = async (cwd: string) => {
  const projectSkillsDir = join(cwd, '.agents', 'skills');

  const loader = new DefaultResourceLoader({
    cwd,
    noThemes: true,
    noSkills: false,
    noExtensions: false,
    noContextFiles: false,
    appendSystemPrompt: [],
    agentDir: startAgentDir,
    noPromptTemplates: false,
    systemPrompt,
    additionalSkillPaths: [projectSkillsDir],
    additionalPromptTemplatePaths: [startPromptsDir],
    skillsOverride: (base) => ({
      ...base,
      skills: base.skills.filter((skill) => isUnderDir(skill.sourceInfo.path, projectSkillsDir))
    }),
    promptsOverride: (base) => ({
      ...base,
      prompts: base.prompts.filter((prompt) => prompt.sourceInfo.path.startsWith(startPromptsPrefix))
    }),
    extensionsOverride: (base) => ({
      ...base,
      extensions: base.extensions.filter((extension) => !extension.sourceInfo?.path?.includes(piConfigSegment))
    })
  });

  await loader.reload();
  return loader;
};
