export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatMemory {
  private sessions = new Map<string, ChatMessage[]>();
  private lastAccessed = new Map<string, number>();
  private maxTurns: number;
  private maxSessions: number;
  private accessCounter = 0;

  constructor(maxTurns = 20, maxSessions = 10) {
    this.maxTurns = maxTurns;
    this.maxSessions = maxSessions;
  }

  store(sessionId: string, role: 'user' | 'assistant', content: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
      // Evict LRU if over limit
      if (this.sessions.size > this.maxSessions) {
        let oldestId: string | undefined;
        let oldestTime = Infinity;
        this.lastAccessed.forEach((time, id) => {
          if (time < oldestTime) {
            oldestTime = time;
            oldestId = id;
          }
        });
        if (oldestId) {
          this.sessions.delete(oldestId);
          this.lastAccessed.delete(oldestId);
        }
      }
    }
    this.lastAccessed.set(sessionId, ++this.accessCounter);
    const messages = this.sessions.get(sessionId)!;
    messages.push({ role, content });
    while (messages.length > this.maxTurns) {
      messages.shift();
    }
  }

  retrieve(sessionId: string): ChatMessage[] {
    if (this.sessions.has(sessionId)) {
      this.lastAccessed.set(sessionId, ++this.accessCounter);
    }
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.lastAccessed.delete(sessionId);
  }

  clearAll(): void {
    this.sessions.clear();
    this.lastAccessed.clear();
  }

  getTokenBudget(): number {
    return this.maxTurns * 500;
  }
}
