import { DefaultResourceLoader, getAgentDir } from '@earendil-works/pi-coding-agent';

export type SkillItem = {
  name: string;
  path: string;
  command: string;
  description: string;
};

type SkillsCacheEntry = {
  expiresAt: number;
  items?: SkillItem[];
  promise?: Promise<SkillItem[]>;
};

const skillsCache = new Map<string, SkillsCacheEntry>();
const skillsCacheMs = 3000;
const skillsCacheMaxEntries = 40;

const pruneSkillsCache = (now = Date.now()) => {
  for (const [key, entry] of skillsCache) {
    if (!entry.promise && entry.expiresAt <= now) skillsCache.delete(key);
  }

  while (skillsCache.size > skillsCacheMaxEntries) {
    const key = skillsCache.keys().next().value;
    if (!key) return;
    skillsCache.delete(key);
  }
};

const readSkills = async (cwd: string) => {
  const loader = new DefaultResourceLoader({ cwd, agentDir: getAgentDir(), noExtensions: true });
  await loader.reload();

  return loader
    .getSkills()
    .skills.map((skill) => ({
      name: skill.name,
      path: skill.filePath,
      description: skill.description,
      command: `skill:${skill.name}`
    }))
    .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
};

export const listSkills = async (cwd = process.cwd()) => {
  const now = Date.now();
  pruneSkillsCache(now);
  const cached = skillsCache.get(cwd);

  if (cached?.items && cached.expiresAt > now) return cached.items;
  if (cached?.promise) return cached.promise;

  const promise = readSkills(cwd)
    .then((items) => {
      skillsCache.set(cwd, { expiresAt: Date.now() + skillsCacheMs, items });
      pruneSkillsCache();
      return items;
    })
    .catch((error) => {
      skillsCache.delete(cwd);
      throw error;
    });

  skillsCache.set(cwd, { expiresAt: now + skillsCacheMs, promise });
  return promise;
};
