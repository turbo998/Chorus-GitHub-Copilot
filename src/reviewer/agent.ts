import { ReviewResult } from './types.js';
import { ReviewCriteria } from './criteria.js';
import { GitDiffService } from './git-diff.js';

export interface McpClientLike {
  callTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
}

export interface SkillsServiceLike {
  getMatchedSkills(tags: string[]): { name: string; type: string; tags: string[]; priority: number; body: string; filePath: string }[];
}

export class ReviewerAgent {
  constructor(
    private mcpClient: McpClientLike,
    private skillsService: SkillsServiceLike,
    private gitDiff: GitDiffService
  ) {}

  async review(taskId: string): Promise<ReviewResult> {
    const diff = await this.gitDiff.getDiff();
    const skills = this.skillsService.getMatchedSkills(['review']);
    const criteria = ReviewCriteria.fromSkills(skills);

    const hasChanges = diff.length > 0;

    return {
      approved: false,
      confirmationRequired: hasChanges,
      summary: hasChanges
        ? `Review of task ${taskId} based on criteria:\n${criteria}\n\nDiff reviewed (${diff.length} chars).`
        : `No changes found for task ${taskId}.`,
      comments: [],
    };
  }

  async postReview(taskId: string, result: ReviewResult): Promise<void> {
    try {
      await this.mcpClient.callTool('chorus_add_comment', {
        taskId,
        comment: result.summary,
      });


    } catch (e: unknown) {
      console.error('[Chorus Copilot] postReview error:', e);
      throw e;
    }
  }
}
