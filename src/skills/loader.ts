import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SkillFile } from './types.js';
import { parseSkill } from './parser.js';

export class SkillLoader {
  async loadFromDir(dirPath: string): Promise<SkillFile[]> {
    try {
      const entries = await fs.readdir(dirPath);
      const mdFiles = entries.filter(e => e.endsWith('.md'));
      const skills: SkillFile[] = [];
      for (const file of mdFiles) {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        skills.push(parseSkill(content, filePath));
      }
      return skills;
    } catch {
      return [];
    }
  }
}
