import { describe, it, expect } from 'vitest';
import { allTools, getToolsByModule } from '../../src/schema/index';
import type { ToolDefinition } from '../../src/schema/types';

describe('schema all tools', () => {
  it('has 83 tools total', () => {
    expect(allTools.length).toBe(83);
  });

  it('correct module counts', () => {
    const moduleCounts: Record<string, number> = { public: 29, developer: 5, session: 8, pm: 24, admin: 14, presence: 3 };
    for (const [mod, count] of Object.entries(moduleCounts)) {
      expect(getToolsByModule(mod as ToolDefinition['module']).length).toBe(count);
    }
  });

  it('no duplicate names', () => {
    const names = allTools.map(t => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes.length).toBe(0);
  });

  it('every tool has required fields', () => {
    for (const t of allTools) {
      expect(t.name).toBeTruthy();
      expect(t.module).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.inputSchema).toBeDefined();
    }
  });
});
