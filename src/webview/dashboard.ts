import * as vscode from 'vscode';

export interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

export class TaskDashboardProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.html = this.getHtmlContent([]);
  }

  getHtmlContent(tasks: Task[]): string {
    const rows = tasks
      .map(
        (t) =>
          `<tr><td>${t.id}</td><td>${t.title}</td><td>${t.status}</td><td>${t.assignee}</td></tr>`
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--vscode-widget-border, #444); }
  th { color: var(--vscode-descriptionForeground); }
  button { margin: 8px 0; padding: 4px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
</style>
</head>
<body>
<button id="refresh">Refresh</button>
<table>
<thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Assignee</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
  }

  async refresh(mcpClient: { callTool: (name: string, args: Record<string, unknown>) => Promise<unknown> }): Promise<void> {
    const result = await mcpClient.callTool('chorus_get_project_tasks', {});
    const tasks: Task[] = Array.isArray(result) ? result : [];
    if (this._view) {
      this._view.webview.html = this.getHtmlContent(tasks);
    }
  }
}
