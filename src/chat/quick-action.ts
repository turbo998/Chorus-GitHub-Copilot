import * as vscode from 'vscode';
import { ChorusMcpClient } from '../mcp/client.js';

const ACTION_MAP: Record<string, { tool: string; args: Record<string, unknown> }> = {
  'Claim Task': { tool: 'chorus_claim_task', args: {} },
  'Submit for Verify': { tool: 'chorus_submit_verify', args: {} },
  'Verify Task': { tool: 'chorus_verify_task', args: {} },
  'Check In': { tool: 'chorus_check_in', args: {} },
  'My Tasks': { tool: 'chorus_my_tasks', args: {} },
};

export function registerQuickAction(
  context: vscode.ExtensionContext,
  mcpClient: ChorusMcpClient,
): vscode.Disposable {
  const disposable = vscode.commands.registerCommand('chorus.quickAction', async () => {
    const selection = await vscode.window.showQuickPick(Object.keys(ACTION_MAP), {
      placeHolder: 'Select a Chorus action',
    });
    if (!selection) return;
    const action = ACTION_MAP[selection];
    try {
      return await mcpClient.callTool(action.tool, action.args);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Chorus action failed: ${err?.message ?? err}`);
    }
  });
  context.subscriptions.push(disposable);
  return disposable;
}
