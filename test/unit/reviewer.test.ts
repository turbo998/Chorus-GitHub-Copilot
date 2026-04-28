import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before imports
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';
import { GitDiffService } from '../../src/reviewer/git-diff.js';
import { ReviewCriteria } from '../../src/reviewer/criteria.js';
import { ReviewerAgent } from '../../src/reviewer/agent.js';
import type { SkillFile } from '../../src/skills/types.js';

const mockExecFile = vi.mocked(execFile);

describe('GitDiffService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns diff output', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, 'diff --git a/file.ts\n+added line', '');
      return undefined as any;
    });
    const svc = new GitDiffService();
    const diff = await svc.getDiff('/some/dir');
    expect(diff).toBe('diff --git a/file.ts\n+added line');
    expect(mockExecFile).toHaveBeenCalledWith('git', ['diff', 'HEAD'], { cwd: '/some/dir' }, expect.any(Function));
  });

  it('handles no-repo error', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(new Error('not a git repo'), '', '');
      return undefined as any;
    });
    const svc = new GitDiffService();
    expect(await svc.getDiff()).toBe('');
  });

  it('truncates long diffs', async () => {
    const longDiff = 'x'.repeat(9000);
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, longDiff, '');
      return undefined as any;
    });
    const svc = new GitDiffService();
    const diff = await svc.getDiff();
    expect(diff.length).toBeLessThan(9000);
    expect(diff).toContain('[truncated]');
    expect(diff.startsWith('x'.repeat(8000))).toBe(true);
  });
});

describe('ReviewCriteria', () => {
  it('formats review skills into criteria', () => {
    const skills: SkillFile[] = [
      { name: 'Security Review', type: 'review', tags: ['review'], priority: 1, body: 'Check for XSS.', filePath: '/a.md' },
      { name: 'Perf Review', type: 'review', tags: ['review'], priority: 2, body: 'Check N+1 queries.', filePath: '/b.md' },
    ];
    const result = ReviewCriteria.fromSkills(skills);
    expect(result).toContain('Security Review');
    expect(result).toContain('Check for XSS.');
    expect(result).toContain('Perf Review');
  });

  it('returns default criteria for empty skills', () => {
    const result = ReviewCriteria.fromSkills([]);
    expect(result).toContain('correctness');
  });

  it('filters non-review skills', () => {
    const skills: SkillFile[] = [
      { name: 'Coding', type: 'guide', tags: ['dev'], priority: 1, body: 'Write clean code.', filePath: '/c.md' },
    ];
    const result = ReviewCriteria.fromSkills(skills);
    expect(result).toContain('correctness');
  });
});

describe('ReviewerAgent', () => {
  const mockMcpClient = { callTool: vi.fn().mockResolvedValue({}) };
  const mockSkillsService = {
    getMatchedSkills: vi.fn().mockReturnValue([
      { name: 'Test Review', type: 'review', tags: ['review'], priority: 1, body: 'Check tests.', filePath: '/r.md' },
    ]),
  };
  const mockGitDiff = { getDiff: vi.fn().mockResolvedValue('diff content') } as any;

  beforeEach(() => vi.clearAllMocks());

  it('review orchestrates diff+skills+criteria and returns ReviewResult', async () => {
    mockGitDiff.getDiff.mockResolvedValue('some diff');
    mockSkillsService.getMatchedSkills.mockReturnValue([
      { name: 'R1', type: 'review', tags: ['review'], priority: 1, body: 'body', filePath: '' },
    ]);

    const agent = new ReviewerAgent(mockMcpClient, mockSkillsService, mockGitDiff);
    const result = await agent.review('task-1');

    expect(mockGitDiff.getDiff).toHaveBeenCalled();
    expect(mockSkillsService.getMatchedSkills).toHaveBeenCalledWith(['review']);
    expect(result.approved).toBe(false);
    expect(result.confirmationRequired).toBe(true);
    expect(result.summary).toContain('task-1');
    expect(Array.isArray(result.comments)).toBe(true);
  });

  it('review returns not approved when no diff', async () => {
    mockGitDiff.getDiff.mockResolvedValue('');
    const agent = new ReviewerAgent(mockMcpClient, mockSkillsService, mockGitDiff);
    const result = await agent.review('task-2');
    expect(result.approved).toBe(false);
  });

  it('postReview calls add_comment', async () => {
    const agent = new ReviewerAgent(mockMcpClient, mockSkillsService, mockGitDiff);
    await agent.postReview('task-1', { approved: false, summary: 'Needs work', comments: [] });
    expect(mockMcpClient.callTool).toHaveBeenCalledWith('chorus_add_comment', { taskId: 'task-1', comment: 'Needs work' });
    expect(mockMcpClient.callTool).toHaveBeenCalledTimes(1);
  });

  it('postReview does not auto-verify even if approved', async () => {
    const agent = new ReviewerAgent(mockMcpClient, mockSkillsService, mockGitDiff);
    await agent.postReview('task-1', { approved: true, summary: 'LGTM', comments: [] });
    expect(mockMcpClient.callTool).toHaveBeenCalledWith('chorus_add_comment', { taskId: 'task-1', comment: 'LGTM' });
    expect(mockMcpClient.callTool).toHaveBeenCalledTimes(1);
  });
});
