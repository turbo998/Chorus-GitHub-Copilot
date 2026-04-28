import { describe, it, expect, vi } from 'vitest';
import { SessionContextProvider } from '../../src/context/session-provider';
import { TaskContextProvider } from '../../src/context/task-provider';
import { SkillsContextProvider } from '../../src/context/skills-provider';
import { ContextBuilder } from '../../src/context/builder';

describe('SessionContextProvider', () => {
  it('returns formatted session info', async () => {
    const mgr = { chorusSessionId: 'sess-123' } as any;
    const provider = new SessionContextProvider(mgr);
    expect(await provider.provide()).toBe('Session: sess-123');
  });

  it('returns null when no session', async () => {
    const mgr = { chorusSessionId: null } as any;
    const provider = new SessionContextProvider(mgr);
    expect(await provider.provide()).toBeNull();
  });
});

describe('TaskContextProvider', () => {
  it('returns task details', async () => {
    const client = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify([{ title: 'Fix bug', status: 'in_progress', uuid: 'u1' }]) }]
      })
    } as any;
    const provider = new TaskContextProvider(client);
    const result = await provider.provide();
    expect(result).toContain('Fix bug');
    expect(result).toContain('in_progress');
  });

  it('returns null when no tasks', async () => {
    const client = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify([]) }]
      })
    } as any;
    const provider = new TaskContextProvider(client);
    expect(await provider.provide()).toBeNull();
  });
});

describe('SkillsContextProvider', () => {
  it('returns skills snippet', async () => {
    const service = { getContextSnippet: vi.fn().mockReturnValue('## Skill1\nDo stuff') } as any;
    const provider = new SkillsContextProvider(service, ['typescript']);
    expect(await provider.provide()).toBe('## Skill1\nDo stuff');
    expect(service.getContextSnippet).toHaveBeenCalledWith(['typescript']);
  });

  it('returns null when no matching skills', async () => {
    const service = { getContextSnippet: vi.fn().mockReturnValue('') } as any;
    const provider = new SkillsContextProvider(service, ['unknown']);
    expect(await provider.provide()).toBeNull();
  });
});

describe('ContextBuilder', () => {
  it('chains multiple providers', async () => {
    const builder = new ContextBuilder()
      .addProvider({ name: 'a', provide: async () => 'hello' })
      .addProvider({ name: 'b', provide: async () => 'world' });
    const result = await builder.build();
    expect(result).toBe('[a]\nhello\n\n[b]\nworld');
  });

  it('skips nulls', async () => {
    const builder = new ContextBuilder()
      .addProvider({ name: 'a', provide: async () => 'hello' })
      .addProvider({ name: 'b', provide: async () => null })
      .addProvider({ name: 'c', provide: async () => 'world' });
    const result = await builder.build();
    expect(result).toBe('[a]\nhello\n\n[c]\nworld');
  });

  it('empty providers = empty string', async () => {
    const builder = new ContextBuilder();
    expect(await builder.build()).toBe('');
  });
});

describe('Full chain integration', () => {
  it('assembles session + task + skills context', async () => {
    const sessionMgr = { chorusSessionId: 'sess-abc' } as any;
    const mcpClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify([{ title: 'Implement feature', status: 'claimed' }]) }]
      })
    } as any;
    const skillsService = { getContextSnippet: vi.fn().mockReturnValue('## Git\nUse conventional commits') } as any;

    const builder = new ContextBuilder()
      .addProvider(new SessionContextProvider(sessionMgr))
      .addProvider(new TaskContextProvider(mcpClient))
      .addProvider(new SkillsContextProvider(skillsService, ['git']));

    const result = await builder.build();
    expect(result).toContain('[session]');
    expect(result).toContain('sess-abc');
    expect(result).toContain('[task]');
    expect(result).toContain('Implement feature');
    expect(result).toContain('[skills]');
    expect(result).toContain('conventional commits');
  });
});
