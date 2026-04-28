import assert from 'node:assert';
import { allTools, getToolsByModule } from '../../src/schema/index';
import type { ToolDefinition } from '../../src/schema/types';

// Total count
assert.strictEqual(allTools.length, 83, `Expected 83 tools, got ${allTools.length}`);

// Module counts
const moduleCounts: Record<string, number> = { public: 29, developer: 5, session: 8, pm: 24, admin: 14, presence: 3 };
for (const [mod, count] of Object.entries(moduleCounts)) {
  const tools = getToolsByModule(mod as ToolDefinition['module']);
  assert.strictEqual(tools.length, count, `Module '${mod}': expected ${count}, got ${tools.length}`);
}

// No duplicate names
const names = allTools.map(t => t.name);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
assert.strictEqual(dupes.length, 0, `Duplicate tool names: ${dupes.join(', ')}`);

// Every tool has required fields
for (const t of allTools) {
  assert.ok(t.name, 'Missing name');
  assert.ok(t.module, 'Missing module');
  assert.ok(t.description, 'Missing description');
  assert.ok(t.inputSchema, 'Missing inputSchema');
}

console.log('✅ All schema tests passed (83 tools, no duplicates, correct module counts)');
