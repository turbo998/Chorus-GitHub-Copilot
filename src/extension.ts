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

async function handleCheckinCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
): Promise<vscode.ChatResult> {
  const prompt = request.prompt.trim();
  // Expect: projectUuid taskUuid message
  const parts = prompt.split(/\s+/);
  if (parts.length < 3) {
    stream.markdown(`⚠️ **Usage:** \`@chorus /checkin <projectUuid> <taskUuid> <message>\`\n\nProvide the project UUID, task UUID, and a check-in message.`);
    return {};
  }
  const [projectUuid, taskUuid, ...messageParts] = parts;
  const message = messageParts.join(' ');
  stream.progress('Checking in to Chorus...');
  const result = await mcpClient.callTool('chorus_checkin', { projectUuid, taskUuid, message });
  const text = formatToolResult(result);
  stream.markdown(`### ✅ Check-in Complete\n\n${text}`);
  return {};
}

async function handleTasksCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
): Promise<vscode.ChatResult> {
  const projectUuid = request.prompt.trim();
  if (!projectUuid) {
    stream.markdown(`⚠️ **Usage:** \`@chorus /tasks <projectUuid>\`\n\nProvide a project UUID to list its tasks.`);
    return {};
  }
  stream.progress('Fetching tasks...');
  const result = await mcpClient.callTool('chorus_list_tasks', { projectUuid });
  const text = formatToolResult(result);
  stream.markdown(`### 📋 Tasks\n\n${text}`);
  return {};
}

function handleSessionCommand(
  stream: vscode.ChatResponseStream
): vscode.ChatResult {
  const config = getConfig();
  const configured = !!(config.serverUrl && config.apiKey);
  const enabledModules = getEnabledModules();
  const enabledTools = allTools.filter(t => enabledModules.includes(t.module));

  stream.markdown(`### 🔌 Session Status

| Property | Value |
|----------|-------|
| **Server URL** | ${config.serverUrl || '_(not set)_'} |
| **API Key** | ${config.apiKey ? '✅ configured' : '❌ not set'} |
| **Initialized** | ${initialized ? '✅' : '❌'} |
| **Configured** | ${configured ? '✅' : '❌'} |
| **Enabled Modules** | ${enabledModules.join(', ')} |
| **Tools Registered** | ${enabledTools.length} / ${allTools.length} |
`);
  return {};
}

function handleHelpCommand(
  stream: vscode.ChatResponseStream
): vscode.ChatResult {
  const enabledModules = getEnabledModules();
  const enabledTools = allTools.filter(t => enabledModules.includes(t.module));

  stream.markdown(`### 🎵 Chorus for Copilot — Help

**Slash Commands:**

| Command | Description |
|---------|-------------|
| \`/checkin <project> <task> <msg>\` | Check in on a task |
| \`/tasks <projectUuid>\` | List tasks in a project |
| \`/session\` | Show current session status |
| \`/help\` | Show this help message |

**Tools:** ${enabledTools.length} tools registered across ${enabledModules.length} modules (${enabledModules.join(', ')}).

**Tip:** In **Agent Mode**, just describe what you need and Copilot will call the right Chorus tools automatically.
`);
  return {};
}

async function handleChatRequest(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  _token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  // Handle /help and /session without requiring initialization
  if (request.command === 'help') {
    return handleHelpCommand(stream);
  }
  if (request.command === 'session') {
    return handleSessionCommand(stream);
  }

  try {
    await ensureInitialized();
  } catch (e: any) {
    stream.markdown(`⚠️ **Chorus Connection Error**\n\n${e.message}\n\nPlease configure \`chorus.serverUrl\` and \`chorus.apiKey\` in VS Code settings.`);
    return {};
  }

  if (request.command === 'checkin') {
    return handleCheckinCommand(request, stream);
  }
  if (request.command === 'tasks') {
    return handleTasksCommand(request, stream);
  }

  // Default handler: provide context about available tools
  const enabledModules = getEnabledModules();
  const enabledTools = allTools.filter(t => enabledModules.includes(t.module));
  const toolList = enabledTools.map(t => `- **${t.displayName}** (\`${t.name}\`): ${t.description}`).join('\n');

  stream.markdown(`### 🎵 Chorus for Copilot

You said: *${request.prompt}*

I have **${enabledTools.length} Chorus tools** available. Use **Agent Mode** for the best experience — Copilot will automatically call the right tools.

Or use a slash command: \`/checkin\`, \`/tasks\`, \`/session\`, \`/help\`

<details><summary>Available Tools (${enabledTools.length})</summary>

${toolList}

</details>
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
