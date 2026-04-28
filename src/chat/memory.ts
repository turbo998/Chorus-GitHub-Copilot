export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatMemory {
  private sessions = new Map<string, ChatMessage[]>();
  private maxTurns: number;

  constructor(maxTurns = 20) {
    this.maxTurns = maxTurns;
  }

  store(sessionId: string, role: 'user' | 'assistant', content: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const messages = this.sessions.get(sessionId)!;
    messages.push({ role, content });
    while (messages.length > this.maxTurns) {
      messages.shift();
    }
  }

  retrieve(sessionId: string): ChatMessage[] {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getTokenBudget(): number {
    return this.maxTurns * 500;
  }
}
