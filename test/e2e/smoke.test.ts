import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

// Mock vscode before any imports that need it
vi.mock('vscode', () => ({
  window: {
    showQuickPick: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    withProgress: vi.fn(),
    createStatusBarItem: vi.fn(() => ({ show: vi.fn(), hide: vi.fn(), dispose: vi.fn(), text: '', tooltip: '' })),
  },
  commands: { registerCommand: vi.fn(() => ({ dispose: vi.fn() })) },
  ProgressLocation: { Notification: 15 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  Uri: { parse: (s: string) => ({ toString: () => s }) },
  EventEmitter: vi.fn(),
}));

import { StateManager } from '../../src/state/state-manager';
import { ConnectionState, TaskState } from '../../src/state/types';
import { ToolResultFormatter } from '../../src/chat/formatter';
import { ChatMemory } from '../../src/chat/memory';
import { ContextBuilder } from '../../src/context/builder';
import { SkillLoader } from '../../src/skills/loader';
import { SkillsService } from '../../src/skills/service';
import { parseSkill } from '../../src/skills/parser';
import { HookRunner } from '../../src/hooks/runner';
import type { ContextProvider } from '../../src/context/types';

describe('E2E Smoke Test – Full Extension Flow', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  afterEach(() => {
    stateManager.dispose();
  });

  describe('Lifecycle: activate → connect → claim → work → submit → verify → idle', () => {
    it('walks through the complete state machine', () => {
      // Initial state after activation
      expect(stateManager.connectionState).toBe(ConnectionState.Disconnected);
      expect(stateManager.taskState).toBe(TaskState.Idle);

      // Connect
      stateManager.connect();
      expect(stateManager.connectionState).toBe(ConnectionState.Connecting);

      stateManager.onConnected();
      expect(stateManager.connectionState).toBe(ConnectionState.Connected);

      // Claim task
      stateManager.claimTask('TASK-42');
      expect(stateManager.taskState).toBe(TaskState.Claimed);
      expect(stateManager.currentTaskId).toBe('TASK-42');

      // Start work
      stateManager.startWork();
      expect(stateManager.taskState).toBe(TaskState.Working);

      // Submit
      stateManager.submit();
      expect(stateManager.taskState).toBe(TaskState.Submitting);

      // Verify
      stateManager.verify();
      expect(stateManager.taskState).toBe(TaskState.Verifying);

      // Complete verify → back to idle
      stateManager.completeVerify();
      expect(stateManager.taskState).toBe(TaskState.Idle);
      expect(stateManager.currentTaskId).toBeUndefined();
    });

    it('emits stateChange events throughout the lifecycle', () => {
      const events: string[] = [];
      stateManager.on('stateChange', (e: any) => events.push(e.type));

      stateManager.connect();
      stateManager.onConnected();
      stateManager.claimTask('T-1');
      stateManager.startWork();
      stateManager.submit();
      stateManager.verify();
      stateManager.completeVerify();

      expect(events).toEqual([
        'CONNECT', 'CONNECTED', 'CLAIM_TASK', 'START_WORK', 'SUBMIT', 'VERIFY', 'COMPLETE_VERIFY',
      ]);
    });

    it('handles error + reconnect flow', () => {
      stateManager.connect();
      stateManager.onConnected();
      expect(stateManager.connectionState).toBe(ConnectionState.Connected);

      stateManager.onError('timeout');
      expect(stateManager.connectionState).toBe(ConnectionState.Error);
      expect(stateManager.lastError).toBe('timeout');

      // Manual reconnect
      stateManager.connect();
      expect(stateManager.connectionState).toBe(ConnectionState.Connecting);
      stateManager.onConnected();
      expect(stateManager.connectionState).toBe(ConnectionState.Connected);
    });

    it('persist and restore round-trips state', async () => {
      const store = new Map<string, any>();
      const memento = {
        get: <T>(k: string, d: T) => store.has(k) ? store.get(k) : d,
        update: (k: string, v: unknown) => { store.set(k, v); return Promise.resolve(); },
      };

      stateManager.connect();
      stateManager.onConnected();
      stateManager.claimTask('T-99');
      await stateManager.persist(memento);

      const restored = new StateManager();
      restored.restore(memento);
      expect(restored.connectionState).toBe(ConnectionState.Connected);
      expect(restored.taskState).toBe(TaskState.Claimed);
      expect(restored.currentTaskId).toBe('T-99');
      restored.dispose();
    });
  });

  describe('Skills loading', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smoke-skills-'));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('parses a skill file from frontmatter', () => {
      const content = '---\ntype: review\ntags: [security]\npriority: 2\n---\nCheck for SQL injection';
      const skill = parseSkill(content, '/skills/sql-check.md');
      expect(skill.name).toBe('sql-check');
      expect(skill.type).toBe('review');
      expect(skill.tags).toContain('security');
      expect(skill.priority).toBe(2);
      expect(skill.body).toBe('Check for SQL injection');
    });

    it('SkillLoader loads .md files from a directory', async () => {
      await fs.writeFile(path.join(tmpDir, 'alpha.md'), '---\ntype: guide\ntags: [ts]\npriority: 1\n---\nAlpha body');
      await fs.writeFile(path.join(tmpDir, 'beta.md'), '---\ntype: review\ntags: [rust]\npriority: 3\n---\nBeta body');
      await fs.writeFile(path.join(tmpDir, 'ignore.txt'), 'not a skill');

      const loader = new SkillLoader();
      const skills = await loader.loadFromDir(tmpDir);
      expect(skills).toHaveLength(2);
      const names = skills.map((s) => s.name).sort();
      expect(names).toEqual(['alpha', 'beta']);
    });

    it('SkillsService loads and indexes skills', async () => {
      await fs.writeFile(path.join(tmpDir, 'fast.md'), '---\ntype: review\ntags: [perf]\npriority: 5\n---\nOptimize');

      // SkillsService expects .chorus/skills subdir
      const skillsDir = path.join(tmpDir, '.chorus', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'fast.md'), '---\ntype: review\ntags: [perf]\npriority: 5\n---\nOptimize');

      const service = new SkillsService(tmpDir);
      await service.load();
      const matched = service.getMatchedSkills(['perf']);
      expect(matched).toHaveLength(1);
      expect(matched[0].name).toBe('fast');

      const snippet = service.getContextSnippet(['perf']);
      expect(snippet).toContain('Optimize');
    });
  });

  describe('HookRunner', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smoke-hooks-'));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('executes a hook script and captures output', async () => {
      const scriptPath = path.join(tmpDir, 'hook.sh');
      await fs.writeFile(scriptPath, '#!/bin/sh\necho "hook executed"\n');
      await fs.chmod(scriptPath, 0o755);

      const runner = new HookRunner();
      const result = await runner.exec(scriptPath);
      expect(result.stdout.trim()).toBe('hook executed');
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
    });

    it('captures non-zero exit code', async () => {
      const scriptPath = path.join(tmpDir, 'fail.sh');
      await fs.writeFile(scriptPath, '#!/bin/sh\nexit 1\n');
      await fs.chmod(scriptPath, 0o755);

      const runner = new HookRunner();
      const result = await runner.exec(scriptPath);
      expect(result.exitCode).toBe(1);
      expect(result.timedOut).toBe(false);
    });

    it('passes env variables to hook', async () => {
      const scriptPath = path.join(tmpDir, 'env.sh');
      await fs.writeFile(scriptPath, '#!/bin/sh\necho "$CHORUS_TASK_ID"\n');
      await fs.chmod(scriptPath, 0o755);

      const runner = new HookRunner();
      const result = await runner.exec(scriptPath, { env: { CHORUS_TASK_ID: 'T-55' } });
      expect(result.stdout.trim()).toBe('T-55');
    });
  });

  describe('ToolResultFormatter', () => {
    const fmt = new ToolResultFormatter();

    it('formatTaskList renders markdown table', () => {
      const tasks = [
        { id: 'T-1', title: 'Bug fix', status: 'open', assignee: 'alice' },
        { id: 'T-2', title: 'Feature', status: 'done', assignee: 'bob' },
      ];
      const table = fmt.formatTaskList(tasks);
      expect(table).toContain('| ID | Title | Status | Assignee |');
      expect(table).toContain('| T-1 | Bug fix | open | alice |');
      expect(table).toContain('| T-2 | Feature | done | bob |');
    });

    it('formatToolResult auto-detects task list', () => {
      const result = fmt.formatToolResult('any', [{ id: '1', title: 'T', status: 's', assignee: 'a' }]);
      expect(result).toContain('| ID |');
    });

    it('formatToolResult auto-detects diff', () => {
      const result = fmt.formatToolResult('any', '--- a/file\n+++ b/file');
      expect(result).toContain('```diff');
    });
  });

  describe('ChatMemory', () => {
    it('store, retrieve, evict cycle', () => {
      const mem = new ChatMemory(3, 2);

      // Store messages
      mem.store('s1', 'user', 'hello');
      mem.store('s1', 'assistant', 'hi');
      expect(mem.retrieve('s1')).toHaveLength(2);

      // Evict on maxTurns
      mem.store('s1', 'user', 'q1');
      mem.store('s1', 'assistant', 'a1');
      // Now 4 messages, maxTurns=3, oldest should be evicted
      expect(mem.retrieve('s1')).toHaveLength(3);
      expect(mem.retrieve('s1')[0].content).toBe('hi');

      // Session eviction (maxSessions=2)
      mem.store('s2', 'user', 'x');
      // Access s1 to make it most recent
      mem.retrieve('s1');
      mem.store('s3', 'user', 'y'); // should evict LRU session (s2)
      expect(mem.retrieve('s2')).toEqual([]);
    });

    it('clearAll wipes everything', () => {
      const mem = new ChatMemory();
      mem.store('a', 'user', 'msg');
      mem.store('b', 'user', 'msg');
      mem.clearAll();
      expect(mem.retrieve('a')).toEqual([]);
      expect(mem.retrieve('b')).toEqual([]);
    });
  });

  describe('ContextBuilder', () => {
    it('chains providers and produces context string', async () => {
      const builder = new ContextBuilder();

      const taskProvider: ContextProvider = {
        name: 'Task',
        provide: async () => 'Working on TASK-42: Fix login bug',
      };
      const skillsProvider: ContextProvider = {
        name: 'Skills',
        provide: async () => 'Review for SQL injection\nCheck error handling',
      };
      const nullProvider: ContextProvider = {
        name: 'Empty',
        provide: async () => null,
      };

      builder.addProvider(taskProvider).addProvider(skillsProvider).addProvider(nullProvider);

      const ctx = await builder.build();
      expect(ctx).toContain('[Task]');
      expect(ctx).toContain('Working on TASK-42');
      expect(ctx).toContain('[Skills]');
      expect(ctx).toContain('SQL injection');
      // Null provider should be excluded
      expect(ctx).not.toContain('[Empty]');
    });

    it('returns empty string with no providers', async () => {
      const builder = new ContextBuilder();
      expect(await builder.build()).toBe('');
    });
  });
});
