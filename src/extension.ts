/**
 * Chorus for GitHub Copilot — VS Code Extension Entry Point.
 * 
 * Registers:
 * 1. @chorus Chat Participant — natural language interface
 * 2. Language Model Tools — dynamically from schema registry
 */

import * as vscode from 'vscode';
import { ChorusMcpClient, ChorusMcpConfig } from './chorus-mcp-client';
import { allTools, ToolDefinition } from './schema/index.js';

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

function getEnabledModules(): string[] {
  const cfg = vscode.workspace.getConfiguration('chorus');
  return cfg.get<string[]>('enabledModules', ['public', 'developer', 'session', 'pm', 'admin', 'presence']);
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

  // Default: show help
  stream.markdown(`### 🎵 Chorus for Copilot

Use **Agent Mode** to interact with Chorus tools naturally, or try:

| Command | Description |
|---------|-------------|
| \`@chorus checkin\` | Check in to Chorus |
| \`@chorus tasks <projectUuid>\` | List available tasks |

Or just describe what you need — Copilot will use Chorus tools automatically in **Agent Mode**.
`);
  return {};
}

// ─── Generic Tool Handler ────────────────────────────────

class ChorusToolHandler implements vscode.LanguageModelTool<Record<string, unknown>> {
  constructor(
    private toolDef: ToolDefinition,
    private client: ChorusMcpClient
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<Record<string, unknown>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    await ensureInitialized();
    const result = await this.client.callTool(this.toolDef.name, options.input || {});
    const text = formatToolResult(result);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(text)
    ]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation | undefined> {
    if (!this.toolDef.confirmationRequired) {
      return { invocationMessage: `Calling Chorus: ${this.toolDef.displayName}...` };
    }
    return {
      invocationMessage: `Calling Chorus: ${this.toolDef.displayName}...`,
      confirmationMessages: {
        title: `Chorus: ${this.toolDef.displayName}`,
        message: new vscode.MarkdownString(
          `Execute **${this.toolDef.displayName}** with:\n\`\`\`json\n${JSON.stringify(options.input, null, 2)}\n\`\`\``
        )
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

  // Register Language Model Tools dynamically from schema
  const enabledModules = getEnabledModules();
  const enabledTools = allTools.filter(t => enabledModules.includes(t.module));

  for (const toolDef of enabledTools) {
    context.subscriptions.push(
      vscode.lm.registerTool(toolDef.name, new ChorusToolHandler(toolDef, mcpClient))
    );
  }

  console.log(`[Chorus Copilot] Activated with ${enabledTools.length}/${allTools.length} tools (modules: ${enabledModules.join(', ')})`);
}

export function deactivate() {
  mcpClient?.close();
}
