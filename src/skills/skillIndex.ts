import { SkillFile } from './types.js';

export class SkillIndex {
  private skills = new Map<string, SkillFile>();

  add(skill: SkillFile): void {
    this.skills.set(skill.name, skill);
  }

  remove(name: string): void {
    this.skills.delete(name);
  }

  match(tags: string[]): SkillFile[] {
    const tagSet = new Set(tags);
    return Array.from(this.skills.values())
      .filter(s => s.tags.some(t => tagSet.has(t)))
      .sort((a, b) => b.priority - a.priority);
  }

  clear(): void {
    this.skills.clear();
  }
}
