/**
 * Chorus for GitHub Copilot — VS Code Extension Entry Point.
 * 
 * Registers:
 * 1. @chorus Chat Participant — natural language interface
 * 2. Language Model Tools — Copilot agent mode can auto-invoke
 */

import * as vscode from 'vscode';
import { ChorusMcpClient, ChorusMcpConfig } from './chorus-mcp-client';

let mcpClient: ChorusMcpClient;
let initialized = false;

// ─── Helpers ─────────────────────────────────────────────

function getConfig(): ChorusMcpConfig {
  const cfg = vscode.workspace.getConfiguration('chorus');
  return {
    serverUrl: cfg.get<string>('serverUrl', ''),
    apiKey: cfg.get<string>('apiKey', '')
  };
}

async function ensureInitialized(): Promise<void> {
  if (!mcpClient.isConfigured()) {
    throw new Error('Chorus not configured. Set chorus.serverUrl and chorus.apiKey in Settings.');
  }
  if (!initialized) {
    await mcpClient.initialize();
    initialized = true;
  }
}

function formatToolResult(result: unknown): string {
  if (!result) return 'No result';
  if (typeof result === 'string') return result;
  // MCP tools/call returns { content: [{ type: 'text', text: '...' }] }
  const r = result as { content?: Array<{ type: string; text: string }> };
  if (r.content && Array.isArray(r.content)) {
    return r.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
  return JSON.stringify(result, null, 2);
}

// ─── Chat Participant ────────────────────────────────────

async function handleChatRequest(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  try {
    await ensureInitialized();
  } catch (e: any) {
    stream.markdown(`⚠️ **Chorus Connection Error**\n\n${e.message}\n\nPlease configure \`chorus.serverUrl\` and \`chorus.apiKey\` in VS Code settings.`);
    return {};
  }

  const prompt = request.prompt.trim().toLowerCase();

  // Simple command routing for POC
  if (prompt === 'checkin' || prompt === '签到') {
    stream.markdown('🔄 Checking in to Chorus...\n\n');
    try {
      const result = await mcpClient.callTool('chorus_checkin');
      stream.markdown('✅ **Checked in successfully!**\n\n```json\n' + formatToolResult(result) + '\n```');
    } catch (e: any) {
      stream.markdown(`❌ Checkin failed: ${e.message}`);
    }
    return {};
  }

  if (prompt.startsWith('tasks') || prompt.startsWith('任务')) {
    const parts = prompt.split(/\s+/);
    const projectUuid = parts[1];
    if (!projectUuid) {
      stream.markdown('Please provide a project UUID: `@chorus tasks <projectUuid>`');
      return {};
    }
    stream.markdown('🔄 Fetching available tasks...\n\n');
    try {
      const result = await mcpClient.callTool('chorus_get_available_tasks', { projectUuid });
      stream.markdown('📋 **Available Tasks:**\n\n```json\n' + formatToolResult(result) + '\n```');
    } catch (e: any) {
      stream.markdown(`❌ Failed to list tasks: ${e.message}`);
    }
    return {};
  }

  if (prompt.startsWith('claim') || prompt.startsWith('认领')) {
    const parts = prompt.split(/\s+/);
    const taskUuid = parts[1];
    if (!taskUuid) {
      stream.markdown('Please provide a task UUID: `@chorus claim <taskUuid>`');
      return {};
    }
    stream.markdown('🔄 Claiming task...\n\n');
    try {
      const result = await mcpClient.callTool('chorus_claim_task', { taskUuid });
      stream.markdown('✅ **Task claimed!**\n\n```json\n' + formatToolResult(result) + '\n```');
    } catch (e: any) {
      stream.markdown(`❌ Failed to claim task: ${e.message}`);
    }
    return {};
  }

  // Default: show help + let Copilot LLM handle with tools
  stream.markdown(`### 🎵 Chorus Commands

| Command | Description |
|---------|-------------|
| \`@chorus checkin\` | Check in to Chorus |
| \`@chorus tasks <projectUuid>\` | List available tasks |
| \`@chorus claim <taskUuid>\` | Claim a task |

Or just describe what you need — Copilot will use Chorus tools automatically in **Agent Mode**.
`);
  return {};
}

// ─── Language Model Tool Handlers ────────────────────────

class ChorusToolHandler implements vscode.LanguageModelTool<Record<string, unknown>> {
  constructor(private toolName: string) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<Record<string, unknown>>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    await ensureInitialized();
    const result = await mcpClient.callTool(this.toolName, options.input || {});
    const text = formatToolResult(result);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(text)
    ]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>,
    token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation | undefined> {
    // No confirmation needed for read operations
    if (['chorus_checkin', 'chorus_list_tasks', 'chorus_get_available_tasks'].includes(this.toolName)) {
      return { invocationMessage: `Calling Chorus: ${this.toolName}...` };
    }
    // Write operations get a confirmation message
    return {
      invocationMessage: `Calling Chorus: ${this.toolName}...`,
      confirmationMessages: {
        title: `Chorus: ${this.toolName}`,
        message: new vscode.MarkdownString(`Execute **${this.toolName}** with:\n\`\`\`json\n${JSON.stringify(options.input, null, 2)}\n\`\`\``)
      }
    };
  }
}

// ─── Activation ──────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  console.log('[Chorus Copilot] Activating...');

  // Initialize MCP client
  mcpClient = new ChorusMcpClient(getConfig());

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('chorus')) {
        mcpClient.updateConfig(getConfig());
        initialized = false;
        console.log('[Chorus Copilot] Config updated');
      }
    })
  );

  // Register Chat Participant
  const participant = vscode.chat.createChatParticipant('chorus-copilot.chorus', handleChatRequest);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  context.subscriptions.push(participant);

  // Register Language Model Tools
  const tools = [
    'chorus_checkin',
    'chorus_list_tasks', 
    'chorus_get_available_tasks',
    'chorus_claim_task',
    'chorus_report_work',
    'chorus_submit_for_verify'
  ];
  for (const toolName of tools) {
    context.subscriptions.push(
      vscode.lm.registerTool(toolName, new ChorusToolHandler(toolName))
    );
  }

  console.log('[Chorus Copilot] Activated with', tools.length, 'tools');
}

export function deactivate() {
  mcpClient?.close();
}
