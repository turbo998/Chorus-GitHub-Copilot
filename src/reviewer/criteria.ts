import { SkillFile } from '../skills/types.js';

const DEFAULT_CRITERIA = 'Review for correctness, readability, and best practices.';

export class ReviewCriteria {
  static fromSkills(skills: SkillFile[]): string {
    const reviewSkills = skills.filter(s => s.type === 'review');
    if (reviewSkills.length === 0) return DEFAULT_CRITERIA;
    return reviewSkills.map(s => `### ${s.name}\n${s.body}`).join('\n\n');
  }
}
