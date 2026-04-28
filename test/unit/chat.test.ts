import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatMemory } from '../../src/chat/memory';

// Mock vscode
const mockShowQuickPick = vi.fn();
const mockShowErrorMessage = vi.fn();
const mockRegisterCommand = vi.fn();
const mockWithProgress = vi.fn();

vi.mock('vscode', () => ({
  window: {
    showQuickPick: mockShowQuickPick,
    withProgress: mockWithProgress,
    showErrorMessage: mockShowErrorMessage,
  },
  commands: {
    registerCommand: mockRegisterCommand,
  },
  ProgressLocation: { Notification: 15 },
}));

describe('ChatMemory', () => {
  let memory: ChatMemory;

  beforeEach(() => {
    memory = new ChatMemory(5);
  });

  it('store and retrieve messages', () => {
    memory.store('s1', 'user', 'hello');
    memory.store('s1', 'assistant', 'hi');
    expect(memory.retrieve('s1')).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
  });

  it('evicts oldest when exceeding maxTurns', () => {
    for (let i = 0; i < 7; i++) {
      memory.store('s1', 'user', `msg${i}`);
    }
    const msgs = memory.retrieve('s1');
    expect(msgs).toHaveLength(5);
    expect(msgs[0].content).toBe('msg2');
  });

  it('clear removes session', () => {
    memory.store('s1', 'user', 'hello');
    memory.clear('s1');
    expect(memory.retrieve('s1')).toEqual([]);
  });

  it('separate sessions are independent', () => {
    memory.store('s1', 'user', 'a');
    memory.store('s2', 'user', 'b');
    expect(memory.retrieve('s1')).toHaveLength(1);
    expect(memory.retrieve('s2')).toHaveLength(1);
    expect(memory.retrieve('s1')[0].content).toBe('a');
  });

  it('getTokenBudget returns maxTurns * 500', () => {
    expect(memory.getTokenBudget()).toBe(2500);
    const big = new ChatMemory(20);
    expect(big.getTokenBudget()).toBe(10000);
  });

  it('evicts least-recently-used session when exceeding maxSessions', () => {
    const mem = new ChatMemory(5, 3);
    mem.store('s1', 'user', 'a');
    mem.store('s2', 'user', 'b');
    mem.store('s3', 'user', 'c');
    // Access s1 to make it recent
    mem.retrieve('s1');
    // Adding s4 should evict s2 (least recently used)
    mem.store('s4', 'user', 'd');
    expect(mem.retrieve('s2')).toEqual([]);
    expect(mem.retrieve('s1')).toHaveLength(1);
    expect(mem.retrieve('s4')).toHaveLength(1);
  });

  it('clearAll removes all sessions', () => {
    memory.store('s1', 'user', 'a');
    memory.store('s2', 'user', 'b');
    memory.clearAll();
    expect(memory.retrieve('s1')).toEqual([]);
    expect(memory.retrieve('s2')).toEqual([]);
  });
});

describe('Quick Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterCommand.mockImplementation((_cmd: string, handler: Function) => {
      (mockRegisterCommand as any)._handler = handler;
      return { dispose: vi.fn() };
    });
  });

  it('registers command and calls correct tool for each option', async () => {
    const { registerQuickAction } = await import('../../src/chat/quick-action');
    const mcpClient = { callTool: vi.fn().mockResolvedValue({ result: 'ok' }) } as any;
    const context = { subscriptions: [] } as any;

    registerQuickAction(context, mcpClient);
    expect(mockRegisterCommand).toHaveBeenCalledWith('chorus.quickAction', expect.any(Function));

    const handler = (mockRegisterCommand as any)._handler;

    const cases = [
      ['Claim Task', 'chorus_claim_task'],
      ['Submit for Verify', 'chorus_submit_verify'],
      ['Verify Task', 'chorus_verify_task'],
      ['Check In', 'chorus_check_in'],
      ['My Tasks', 'chorus_my_tasks'],
    ];

    for (const [pick, tool] of cases) {
      mcpClient.callTool.mockClear();
      mockShowQuickPick.mockResolvedValueOnce(pick);
      await handler();
      expect(mcpClient.callTool).toHaveBeenCalledWith(tool, {});
    }
  });

  it('does nothing when user cancels', async () => {
    const { registerQuickAction } = await import('../../src/chat/quick-action');
    const mcpClient = { callTool: vi.fn() } as any;
    const context = { subscriptions: [] } as any;

    registerQuickAction(context, mcpClient);
    const handler = (mockRegisterCommand as any)._handler;

    mockShowQuickPick.mockResolvedValueOnce(undefined);
    await handler();
    expect(mcpClient.callTool).not.toHaveBeenCalled();
  });

  it('shows error message when callTool throws', async () => {
    const { registerQuickAction } = await import('../../src/chat/quick-action');
    const mcpClient = { callTool: vi.fn().mockRejectedValue(new Error('network down')) } as any;
    const context = { subscriptions: [] } as any;

    registerQuickAction(context, mcpClient);
    const handler = (mockRegisterCommand as any)._handler;

    mockShowQuickPick.mockResolvedValueOnce('Claim Task');
    await handler();
    expect(mockShowErrorMessage).toHaveBeenCalledWith('Chorus action failed: network down');
  });
});

describe('Progress', () => {
  it('wraps function call and returns result', async () => {
    mockWithProgress.mockImplementation((_opts: any, fn: Function) => fn({}, { isCancellationRequested: false }));
    const { withProgress } = await import('../../src/chat/progress');
    const result = await withProgress('Testing', async () => 42);
    expect(result).toBe(42);
    expect(mockWithProgress).toHaveBeenCalledWith(
      { location: 15, title: 'Testing' },
      expect.any(Function),
    );
  });
});
