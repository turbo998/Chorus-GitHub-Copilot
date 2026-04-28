import { describe, it, expect } from 'vitest';
import { publicTools } from '../../src/schema/public.js';

describe('schema public tools', () => {
  it('has 29 tools', () => {
    expect(publicTools.length).toBe(29);
  });

  it('all have required fields and module=public', () => {
    for (const tool of publicTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.module).toBe('public');
      expect(tool.displayName).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.modelDescription).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('no duplicate names', () => {
    const names = publicTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains expected tool names', () => {
    const names = publicTools.map(t => t.name);
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
      expect(names).toContain(name);
    }
  });
});
