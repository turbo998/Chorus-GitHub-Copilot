import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => ({
  Uri: { joinPath: vi.fn() },
  ViewColumn: { One: 1 },
}));

import { TaskDashboardProvider, Task } from '../../src/webview/dashboard';

describe('TaskDashboardProvider', () => {
  let provider: TaskDashboardProvider;

  beforeEach(() => {
    provider = new TaskDashboardProvider();
  });

  describe('getHtmlContent', () => {
    it('returns valid HTML with table rows for tasks', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Fix bug', status: 'open', assignee: 'Alice' },
        { id: '2', title: 'Add feature', status: 'done', assignee: 'Bob' },
      ];
      const html = provider.getHtmlContent(tasks);
      expect(html).toContain('<table>');
      expect(html).toContain('Fix bug');
      expect(html).toContain('Alice');
      expect(html).toContain('Add feature');
      expect(html).toContain('Bob');
      expect(html).toContain('<th>ID</th>');
      expect(html).toContain('<th>Status</th>');
    });

    it('handles empty tasks array', () => {
      const html = provider.getHtmlContent([]);
      expect(html).toContain('<table>');
      expect(html).toContain('<tbody></tbody>');
      expect(html).not.toContain('<td>');
    });
  });

  describe('refresh', () => {
    it('calls mcpClient.callTool with correct tool name', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue([]),
      };
      await provider.refresh(mockClient);
      expect(mockClient.callTool).toHaveBeenCalledWith('chorus_get_project_tasks', {});
    });
  });
});
