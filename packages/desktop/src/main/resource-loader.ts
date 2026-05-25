import { join, sep } from 'node:path';
import { DefaultResourceLoader } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { buildStartSystemPrompt } from '@main/system-prompt';

const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const startPromptsPrefix = `${startPromptsDir}${sep}`;
const piConfigSegment = `${sep}.pi${sep}`;
const systemPrompt = buildStartSystemPrompt(startPromptsDir);

export const createStartResourceLoader = async (cwd: string) => {
  const projectSkillsDir = join(cwd, '.agents', 'skills');
  const projectSkillsPrefix = `${projectSkillsDir}${sep}`;

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
    additionalSkillPaths: [projectSkillsDir],
    additionalPromptTemplatePaths: [startPromptsDir],
    skillsOverride: (base) => ({
      ...base,
      skills: base.skills.filter(
        (skill) => skill.sourceInfo.path === projectSkillsDir || skill.sourceInfo.path.startsWith(projectSkillsPrefix)
      )
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
