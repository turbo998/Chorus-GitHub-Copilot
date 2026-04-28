import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: { createStatusBarItem: vi.fn(() => ({ show: vi.fn(), dispose: vi.fn() })), withProgress: vi.fn() },
  commands: { registerCommand: vi.fn(() => ({ dispose: vi.fn() })) },
  workspace: { getConfiguration: () => ({ get: (_k: string, d: unknown) => d }), createFileSystemWatcher: vi.fn(() => ({ onDidChange: vi.fn(), onDidCreate: vi.fn(), onDidDelete: vi.fn(), dispose: vi.fn() })) },
  StatusBarAlignment: { Left: 1 },
  EventEmitter: vi.fn(() => ({ event: vi.fn(), fire: vi.fn(), dispose: vi.fn() })),
  ProgressLocation: { Notification: 15 },
}));

/**
 * Integration wiring is validated by the extension.ts compile check
 * and the fact that all modules export correctly.
 * Full activation testing requires a VS Code Extension Host.
 */

describe('Extension integration wiring - module exports', () => {
  it('state module exports StateManager and StatusBarController', async () => {
    const state = await import('../../src/state/index');
    expect(state.StateManager).toBeDefined();
    expect(state.StatusBarController).toBeDefined();
  });

  it('chat module exports quick-action, progress, memory', async () => {
    const quickAction = await import('../../src/chat/quick-action');
    const progress = await import('../../src/chat/progress');
    const memory = await import('../../src/chat/memory');
    expect(quickAction.registerQuickAction).toBeDefined();
    expect(progress.withProgress).toBeDefined();
    expect(memory.ChatMemory).toBeDefined();
  });

  it('skills module exports SkillsService', async () => {
    const skills = await import('../../src/skills/index');
    expect(skills.SkillsService).toBeDefined();
  });

  it('hooks module exports HookLifecycle', async () => {
    const hooks = await import('../../src/hooks/index');
    expect(hooks.HookLifecycle).toBeDefined();
  });
});
