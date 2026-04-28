import * as vscode from 'vscode';

export async function withProgress<T>(title: string, fn: (token: vscode.CancellationToken) => Promise<T>): Promise<T> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title },
    (_progress, token) => fn(token),
  );
}
