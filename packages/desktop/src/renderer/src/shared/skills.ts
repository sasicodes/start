import type { SkillItem } from '@preload/index';
import type { SkillToken } from '@renderer/shared/input';
import { useEffect, useMemo, useState } from 'preact/hooks';

let cachedSkills: SkillItem[] | undefined;
let cachedSkillsPromise: Promise<SkillItem[]> | undefined;
let cachedSkillsExpiresAt = 0;
const skillsCacheMs = 10000;

const loadSkills = () => {
  const now = Date.now();
  if (cachedSkills && cachedSkillsExpiresAt > now) return Promise.resolve(cachedSkills);

  cachedSkillsPromise ??= window.pi.app
    .listSkills()
    .then((skills) => {
      cachedSkills = skills;
      cachedSkillsPromise = undefined;
      cachedSkillsExpiresAt = Date.now() + skillsCacheMs;
      return skills;
    })
    .catch((error: unknown) => {
      cachedSkillsPromise = undefined;
      throw error;
    });

  return cachedSkillsPromise;
};

export const clearSkillsCache = () => {
  cachedSkills = undefined;
  cachedSkillsPromise = undefined;
  cachedSkillsExpiresAt = 0;
};

export const useSkillItems = (token: SkillToken | undefined) => {
  const skillFinderOpen = Boolean(token);
  const [skills, setSkills] = useState<SkillItem[]>(() => cachedSkills ?? []);

  useEffect(() => {
    if (!skillFinderOpen) return;

    let disposed = false;
    if (cachedSkills) setSkills(cachedSkills);

    loadSkills()
      .then((items) => {
        if (!disposed) setSkills(items);
      })
      .catch(() => {
        if (!disposed && !cachedSkills) setSkills([]);
      });

    return () => {
      disposed = true;
    };
  }, [skillFinderOpen]);

  return useMemo(() => {
    if (!token) return [];

    const query = token.query.trim().toLowerCase();
    return skills
      .filter((skill) => {
        if (!query) return true;
        return skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query);
      })
      .map((skill) => ({
        type: 'skill' as const,
        name: skill.command,
        path: skill.command,
        description: skill.description
      }));
  }, [skills, token]);
};
