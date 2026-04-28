import assert from 'node:assert';
import { publicTools } from '../../src/schema/public.js';
import type { ToolDefinition } from '../../src/schema/types.js';

// Length check
assert.strictEqual(publicTools.length, 29, `Expected 29 tools, got ${publicTools.length}`);

// All have required fields
for (const tool of publicTools) {
  assert.ok(tool.name, `Missing name`);
  assert.strictEqual(tool.module, 'public');
  assert.ok(tool.displayName, `Missing displayName for ${tool.name}`);
  assert.ok(tool.description, `Missing description for ${tool.name}`);
  assert.ok(tool.modelDescription, `Missing modelDescription for ${tool.name}`);
  assert.strictEqual(tool.inputSchema.type, 'object');
  assert.ok(tool.inputSchema.properties, `Missing properties for ${tool.name}`);
}

// No duplicate names
const names = publicTools.map(t => t.name);
const unique = new Set(names);
assert.strictEqual(unique.size, names.length, `Duplicate tool names found`);

// Expected tool names
const expected = [
  'chorus_get_project', 'chorus_list_projects', 'chorus_get_task', 'chorus_list_tasks',
  'chorus_get_available_tasks', 'chorus_create_tasks', 'chorus_update_task', 'chorus_get_unblocked_tasks',
  'chorus_checkin', 'chorus_get_idea', 'chorus_get_ideas', 'chorus_get_available_ideas',
  'chorus_get_proposal', 'chorus_get_proposals', 'chorus_get_document', 'chorus_get_documents',
  'chorus_get_activity', 'chorus_get_comments', 'chorus_add_comment', 'chorus_get_my_assignments',
  'chorus_get_notifications', 'chorus_mark_notification_read', 'chorus_get_elaboration',
  'chorus_answer_elaboration', 'chorus_search', 'chorus_search_mentionables',
  'chorus_get_project_group', 'chorus_get_project_groups', 'chorus_get_group_dashboard'
];
for (const name of expected) {
  assert.ok(names.includes(name), `Missing tool: ${name}`);
}

console.log('✅ All schema tests passed');
