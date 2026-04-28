export class ToolResultFormatter {
  formatTaskList(tasks: any[]): string {
    const header = '| ID | Title | Status | Assignee |\n| --- | --- | --- | --- |';
    const rows = tasks.map(
      (t) => `| ${t.id ?? ''} | ${t.title ?? ''} | ${t.status ?? ''} | ${t.assignee ?? ''} |`,
    );
    return [header, ...rows].join('\n');
  }

  formatDiff(diff: string): string {
    return '```diff\n' + diff + '\n```';
  }

  formatLink(text: string, chorusUrl: string, path: string): string {
    return `[${text}](${chorusUrl}${path})`;
  }

  formatToolResult(toolName: string, result: any): string {
    if (Array.isArray(result) && result.length > 0 && result[0].id !== undefined && result[0].title !== undefined) {
      return this.formatTaskList(result);
    }
    if (typeof result === 'string' && (result.startsWith('diff ') || result.startsWith('--- ') || result.startsWith('@@'))) {
      return this.formatDiff(result);
    }
    if (typeof result === 'object' && result !== null) {
      return '```json\n' + JSON.stringify(result, null, 2) + '\n```';
    }
    return String(result);
  }
}
