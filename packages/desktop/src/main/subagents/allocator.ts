import { hashString } from '@main/subagents/hash';
import { subagentNames } from '@main/subagents/names';

export class SubagentNameAllocator {
  private readonly assigned = new Set<string>();

  next(seed: string): string {
    const available = subagentNames.filter((name) => !this.assigned.has(name));
    if (available.length > 0) {
      const name = available[hashString(`${seed}:${this.assigned.size}`) % available.length] ?? subagentNames[0];
      this.assigned.add(name);
      return name;
    }

    const baseName = subagentNames[hashString(seed) % subagentNames.length] ?? subagentNames[0];
    let suffix = 2;
    let name = `${baseName}-${suffix}`;

    while (this.assigned.has(name)) {
      suffix += 1;
      name = `${baseName}-${suffix}`;
    }

    this.assigned.add(name);
    return name;
  }
}
