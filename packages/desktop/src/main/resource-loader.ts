import { join, sep } from 'node:path';
import { DefaultResourceLoader } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { startSystemPrompt } from '@main/system-prompt';

const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const piConfigSegment = `${sep}.pi${sep}`;

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
    systemPrompt: startSystemPrompt,
    additionalSkillPaths: [projectSkillsDir],
    additionalPromptTemplatePaths: [startPromptsDir],
    skillsOverride: (base) => ({
      ...base,
      skills: base.skills.filter((skill) => skill.sourceInfo.path.startsWith(projectSkillsDir))
    }),
    promptsOverride: (base) => ({
      ...base,
      prompts: base.prompts.filter((prompt) => prompt.sourceInfo.path.startsWith(startPromptsDir))
    }),
    extensionsOverride: (base) => ({
      ...base,
      extensions: base.extensions.filter((extension) => !extension.sourceInfo?.path?.includes(piConfigSegment))
    })
  });

  await loader.reload();
  return loader;
};
