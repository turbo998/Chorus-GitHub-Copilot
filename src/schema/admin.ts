import { tool, type ToolDefinition } from './types';
const p = (d: string) => ({ type: 'string', description: d });
const M = 'admin' as const;
const D = { confirmationRequired: true };

export const adminTools: ToolDefinition[] = [
  tool('chorus_admin_create_project', M, 'Create a new project', { name: p('Project name'), description: p('Project description') }, ['name'], D),
  tool('chorus_admin_verify_task', M, 'Verify a completed task', { taskId: p('Task ID'), status: p('Verification status') }, ['taskId', 'status'], D),
  tool('chorus_admin_close_task', M, 'Close a task', { taskId: p('Task ID'), reason: p('Close reason') }, ['taskId'], D),
  tool('chorus_admin_reopen_task', M, 'Reopen a closed task', { taskId: p('Task ID') }, ['taskId'], D),
  tool('chorus_admin_delete_task', M, 'Delete a task permanently', { taskId: p('Task ID') }, ['taskId'], D),
  tool('chorus_admin_approve_proposal', M, 'Approve a proposal', { proposalId: p('Proposal ID') }, ['proposalId'], D),
  tool('chorus_admin_close_proposal', M, 'Close a proposal', { proposalId: p('Proposal ID'), reason: p('Close reason') }, ['proposalId'], D),
  tool('chorus_admin_delete_idea', M, 'Delete an idea', { ideaId: p('Idea ID') }, ['ideaId'], D),
  tool('chorus_admin_delete_document', M, 'Delete a document', { documentId: p('Document ID') }, ['documentId'], D),
  tool('chorus_admin_create_project_group', M, 'Create a project group', { name: p('Group name') }, ['name'], D),
  tool('chorus_admin_update_project_group', M, 'Update a project group', { groupId: p('Group ID'), name: p('New name') }, ['groupId'], D),
  tool('chorus_admin_delete_project_group', M, 'Delete a project group', { groupId: p('Group ID') }, ['groupId'], D),
  tool('chorus_admin_move_project_to_group', M, 'Move project to a group', { projectId: p('Project ID'), groupId: p('Group ID') }, ['projectId', 'groupId'], D),
  tool('chorus_mark_acceptance_criteria', M, 'Mark acceptance criteria status', { criteriaId: p('Criteria ID'), status: p('Status') }, ['criteriaId', 'status'], D),
];
