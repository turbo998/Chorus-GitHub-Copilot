/**
 * Chorus for GitHub Copilot — VS Code Extension Entry Point.
 * 
 * Registers:
 * 1. @chorus Chat Participant — natural language interface
 * 2. Language Model Tools — dynamically from schema registry
 */

import * as vscode from 'vscode';
import { ChorusMcpClient } from './chorus-mcp-client.js';
import { SkillsService } from './skills/service.js';
import { HookResolver } from './hooks/resolver.js';
import { HookRunner } from './hooks/runner.js';
import { HookLifecycle } from './hooks/lifecycle.js';
import { ReviewerAgent } from './reviewer/agent.js';
import { GitDiffService } from './reviewer/git-diff.js';
import { ContextBuilder } from './context/builder.js';
import { SkillsContextProvider } from './context/skills-provider.js';
import { StateManager, StatusBarController } from './state/index.js';
import { registerQuickAction } from './chat/quick-action.js';

interface ChorusMcpConfigLocal {
  serverUrl: string;
  apiKey: string;
}
import { allTools, ToolDefinition } from './schema/index.js';

let mcpClient: ChorusMcpClient;
let initialized = false;
let skillsService: SkillsService | undefined;
let hookLifecycle: HookLifecycle | undefined;
let contextBuilder: ContextBuilder | undefined;
let reviewerAgent: ReviewerAgent | undefined;
let fileWatcher: vscode.Disposable | undefined;
let stateManager: StateManager | undefined;
let statusBarController: StatusBarController | undefined;

// ─── Helpers ─────────────────────────────────────────────

function getConfig(): ChorusMcpConfigLocal {
  const cfg = vscode.workspace.getConfiguration('chorus');
  return {
    serverUrl: cfg.get<string>('serverUrl', ''),
    apiKey: cfg.get<string>('apiKey', '')
  };
}

function isConfigured(config: ChorusMcpConfigLocal): boolean {
  return !!(config.serverUrl && config.apiKey);
}

function getEnabledModules(): string[] {
  const cfg = vscode.workspace.getConfiguration('chorus');
  return cfg.get<string[]>('enabledModules', ['public', 'developer', 'session', 'pm', 'admin', 'presence']);
}

async function ensureInitialized(): Promise<void> {
  if (!isConfigured(getConfig())) {
    throw new Error('Chorus not configured. Set chorus.serverUrl and chorus.apiKey in Settings.');
  }
  if (!initialized) {
    await mcpClient.connect();
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stream.markdown(`⚠️ **Chorus Connection Error**\n\n${msg}\n\nPlease configure \`chorus.serverUrl\` and \`chorus.apiKey\` in VS Code settings.`);
    return {};
  }

  if (request.command === 'checkin') {
    return handleCheckinCommand(request, stream);
  }
  if (request.command === 'tasks') {
    return handleTasksCommand(request, stream);
  }

  // Build context from providers
  let contextPrefix = '';
  if (contextBuilder) {
    try {
      contextPrefix = await contextBuilder.build();
    } catch (e: unknown) {
      console.error('[Chorus Copilot] Context build error:', e);
    }
  }

  // Default handler: provide context about available tools
  const enabledModules = getEnabledModules();
  const enabledTools = allTools.filter(t => enabledModules.includes(t.module));
  const toolList = enabledTools.map(t => `- **${t.displayName}** (\`${t.name}\`): ${t.description}`).join('\n');

  stream.markdown(`### 🎵 Chorus for Copilot

${contextPrefix ? `**Context:**\n${contextPrefix}\n\n` : ''}You said: *${request.prompt}*

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

  // Initialize State Manager
  stateManager = new StateManager();
  stateManager.restore(context.globalState);

  // Status Bar
  const sbItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarController = new StatusBarController(stateManager, sbItem);
  context.subscriptions.push(sbItem);

  // Initialize MCP client
  mcpClient = new ChorusMcpClient(getConfig());

  // Wire MCP connection events to state
  mcpClient.on?.('connected', () => stateManager?.onConnected());
  mcpClient.on?.('error', (err: string) => stateManager?.onError(err));

  // Register quick action
  registerQuickAction(context, mcpClient);

  // Initialize Week 2 modules
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (workspaceRoot) {
    // Skills
    skillsService = new SkillsService(workspaceRoot);
    skillsService.load().catch(e => console.error('[Chorus Copilot] Skills load error:', e));
    try {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, '.chorus/skills/**/*.md')
      );
      watcher.onDidChange(() => skillsService?.load().catch(e => console.error('[Chorus Copilot] Skills reload error:', e)));
      watcher.onDidCreate(() => skillsService?.load().catch(e => console.error('[Chorus Copilot] Skills reload error:', e)));
      watcher.onDidDelete(() => skillsService?.load().catch(e => console.error('[Chorus Copilot] Skills reload error:', e)));
      fileWatcher = watcher;
      context.subscriptions.push(watcher);
    } catch (e: unknown) {
      console.error('[Chorus Copilot] File watcher error:', e);
    }

    // Hooks
    const hookResolver = new HookResolver(workspaceRoot);
    const hookRunner = new HookRunner();
    hookLifecycle = new HookLifecycle(hookResolver, hookRunner);

    // Reviewer
    const gitDiff = new GitDiffService();
    reviewerAgent = new ReviewerAgent(mcpClient, skillsService, gitDiff);

    // Context
    contextBuilder = new ContextBuilder();
    contextBuilder.addProvider(new SkillsContextProvider(skillsService, ['context']));
  }

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('chorus')) {
        mcpClient.disconnect().catch(e => console.error('[Chorus Copilot] Disconnect error:', e));
        const cfg = getConfig();
        mcpClient = new ChorusMcpClient(cfg);
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

export async function deactivate(globalState?: { update(key: string, value: unknown): Thenable<void>; get<T>(key: string, defaultValue: T): T }): Promise<void> {
  if (stateManager) {
    if (globalState) {
      await stateManager.persist(globalState);
    }
    stateManager.cancelReconnect();
    stateManager.dispose();
    stateManager = undefined;
  }
  if (statusBarController) {
    statusBarController.dispose();
    statusBarController = undefined;
  }
  if (fileWatcher) {
    fileWatcher.dispose();
    fileWatcher = undefined;
  }
  if (mcpClient) {
    await mcpClient.disconnect();
  }
}
