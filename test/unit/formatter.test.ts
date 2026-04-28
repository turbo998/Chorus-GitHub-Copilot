import { describe, it, expect } from 'vitest';
import { ToolResultFormatter } from '../../src/chat/formatter';

describe('ToolResultFormatter', () => {
  const fmt = new ToolResultFormatter();

  describe('formatTaskList', () => {
    it('renders a markdown table', () => {
      const tasks = [
        { id: '1', title: 'Fix bug', status: 'open', assignee: 'alice' },
        { id: '2', title: 'Add feature', status: 'done', assignee: 'bob' },
      ];
      const result = fmt.formatTaskList(tasks);
      expect(result).toContain('| ID | Title | Status | Assignee |');
      expect(result).toContain('| 1 | Fix bug | open | alice |');
      expect(result).toContain('| 2 | Add feature | done | bob |');
    });

    it('handles missing fields', () => {
      const result = fmt.formatTaskList([{ id: '1' }]);
      expect(result).toContain('| 1 |  |  |  |');
    });
  });

  describe('formatDiff', () => {
    it('wraps in diff code block', () => {
      const diff = '--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new';
      const result = fmt.formatDiff(diff);
      expect(result).toBe('```diff\n' + diff + '\n```');
    });
  });

  describe('formatLink', () => {
    it('creates a markdown link', () => {
      expect(fmt.formatLink('Task 1', 'https://chorus.example.com', '/tasks/1'))
        .toBe('[Task 1](https://chorus.example.com/tasks/1)');
    });
  });

  describe('formatToolResult', () => {
    it('auto-formats task lists', () => {
      const tasks = [{ id: '1', title: 'T', status: 'open', assignee: 'a' }];
      const result = fmt.formatToolResult('chorus_my_tasks', tasks);
      expect(result).toContain('| ID |');
    });

    it('auto-formats diffs', () => {
      const diff = '--- a/f\n+++ b/f';
      const result = fmt.formatToolResult('chorus_diff', diff);
      expect(result).toContain('```diff');
    });

    it('formats objects as JSON', () => {
      const result = fmt.formatToolResult('other', { key: 'val' });
      expect(result).toContain('```json');
      expect(result).toContain('"key": "val"');
    });

    it('formats primitives as string', () => {
      expect(fmt.formatToolResult('x', 42)).toBe('42');
      expect(fmt.formatToolResult('x', 'hello')).toBe('hello');
    });
  });
});
