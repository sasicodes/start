import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { DefaultResourceLoader } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { createHarnessController } from '@main/harness/controller';
import { buildStartSystemPrompt, createStartPromptExtension } from '@main/prompt/index';

const piConfigSegment = `${sep}.pi${sep}`;
const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const startSkillsDir = join(startAgentDir, 'skills');
const startHarnessDir = join(startAgentDir, 'harness');
const startPromptsPrefix = `${startPromptsDir}${sep}`;
const globalSkillsDir = join(homedir(), '.agents', 'skills');
const systemPrompt = buildStartSystemPrompt(startPromptsDir, startSkillsDir);

export const createStartResourceLoader = async (cwd: string, options?: { persistHarness?: boolean }) => {
  const projectSkillsDir = join(cwd, '.agents', 'skills');
  const skillDirs = [startSkillsDir, globalSkillsDir, projectSkillsDir];
  const persistHarness = options?.persistHarness !== false;
  const harness = createHarnessController({ harnessDir: startHarnessDir, persist: persistHarness });

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
    extensionFactories: [createStartPromptExtension(startPromptsDir, startSkillsDir, harness), harness.extension]
  });

  await loader.reload();
  await harness.restore();
  return loader;
};
