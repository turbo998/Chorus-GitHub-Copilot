import { SkillFile } from './types.js';
import { SkillLoader } from './loader.js';
import { SkillIndex } from './skillIndex.js';
import * as path from 'node:path';

export class SkillsService {
  private loader = new SkillLoader();
  private index = new SkillIndex();
  private workspaceRoot?: string;
  private globalDir?: string;

  constructor(workspaceRoot?: string, globalDir?: string) {
    this.workspaceRoot = workspaceRoot;
    this.globalDir = globalDir;
  }

  async load(): Promise<void> {
    this.index.clear();

    // Load global first
    if (this.globalDir) {
      const globals = await this.loader.loadFromDir(path.join(this.globalDir, '.chorus', 'skills'));
      for (const s of globals) this.index.add(s);
    }

    // Workspace overrides global by name
    if (this.workspaceRoot) {
      const workspace = await this.loader.loadFromDir(path.join(this.workspaceRoot, '.chorus', 'skills'));
      for (const s of workspace) this.index.add(s);
    }
  }

  getMatchedSkills(tags: string[]): SkillFile[] {
    return this.index.match(tags);
  }

  getContextSnippet(tags: string[]): string {
    const matched = this.index.match(tags);
    if (matched.length === 0) return '';
    return matched.map(s => `## ${s.name}\n${s.body}`).join('\n\n');
  }

  /** @deprecated Use file watcher from extension.ts activate() instead */
  watch(): void {
    console.warn('[Chorus Copilot] SkillsService.watch() is deprecated. File watching is managed by extension.ts.');
  }
}
