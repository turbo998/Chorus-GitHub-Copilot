import { ContextProvider } from './types.js';
import { ChorusSessionManager } from '../mcp/session.js';

export class SessionContextProvider implements ContextProvider {
  name = 'session';
  constructor(private sessionManager: ChorusSessionManager) {}

  async provide(): Promise<string | null> {
    const sessionId = this.sessionManager.chorusSessionId;
    if (!sessionId) return null;
    return `Session: ${sessionId}`;
  }
}
