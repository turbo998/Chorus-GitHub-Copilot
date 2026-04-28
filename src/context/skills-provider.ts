import { ContextProvider } from './types.js';
import { SkillsService } from '../skills/service.js';

export class SkillsContextProvider implements ContextProvider {
  name = 'skills';
  constructor(private skillsService: SkillsService, private tags: string[]) {}

  async provide(): Promise<string | null> {
    const snippet = this.skillsService.getContextSnippet(this.tags);
    return snippet || null;
  }
}
