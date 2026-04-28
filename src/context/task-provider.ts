import { ContextProvider } from './types.js';
import { ChorusMcpClient } from '../mcp/client.js';

export class TaskContextProvider implements ContextProvider {
  name = 'task';
  constructor(private client: ChorusMcpClient) {}

  async provide(): Promise<string | null> {
    const result = await this.client.callTool('chorus_get_my_tasks') as { content?: Array<{ type: string; text: string }> } | unknown;
    let tasks: unknown;
    try {
      const r = result as { content?: Array<{ type: string; text: string }> };
      tasks = r?.content?.[0]?.text
        ? JSON.parse(r.content[0].text)
        : result;
    } catch {
      console.error('[Chorus Copilot] Failed to parse task response');
      return null;
    }
    if (!Array.isArray(tasks) || tasks.length === 0) return null;
    const task = tasks[0] as Record<string, unknown>;
    return `Current Task: ${task.title ?? task.name ?? task.uuid}\nStatus: ${task.status ?? 'unknown'}`;
  }
}
