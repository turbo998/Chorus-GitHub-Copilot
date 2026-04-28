import { tool, type ToolDefinition } from './types.js';
const p = (d: string) => ({ type: 'string', description: d });
const M = 'pm' as const;

export const pmTools: ToolDefinition[] = [
  tool('chorus_pm_create_idea', M, 'Create a new idea', { projectId: p('Project ID'), title: p('Idea title'), description: p('Idea description') }, ['projectId', 'title']),
  tool('chorus_claim_idea', M, 'Claim an idea', { ideaId: p('Idea ID') }, ['ideaId']),
  tool('chorus_release_idea', M, 'Release a claimed idea', { ideaId: p('Idea ID') }, ['ideaId']),
  tool('chorus_move_idea', M, 'Move idea to different status', { ideaId: p('Idea ID'), status: p('Target status') }, ['ideaId', 'status']),
  tool('chorus_pm_create_proposal', M, 'Create a proposal', { projectId: p('Project ID'), title: p('Title'), description: p('Description') }, ['projectId', 'title']),
  tool('chorus_pm_submit_proposal', M, 'Submit proposal for review', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_reject_proposal', M, 'Reject a proposal', { proposalId: p('Proposal ID'), reason: p('Rejection reason') }, ['proposalId']),
  tool('chorus_pm_revoke_proposal', M, 'Revoke a submitted proposal', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_validate_proposal', M, 'Validate proposal completeness', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_create_document', M, 'Create a document', { proposalId: p('Proposal ID'), title: p('Title'), content: p('Content') }, ['proposalId', 'title']),
  tool('chorus_pm_update_document', M, 'Update a document', { documentId: p('Document ID'), content: p('Updated content') }, ['documentId']),
  tool('chorus_pm_add_document_draft', M, 'Add document draft to proposal', { proposalId: p('Proposal ID'), title: p('Title'), content: p('Content') }, ['proposalId', 'title']),
  tool('chorus_pm_update_document_draft', M, 'Update a document draft', { draftId: p('Draft ID'), content: p('Updated content') }, ['draftId']),
  tool('chorus_pm_remove_document_draft', M, 'Remove a document draft', { draftId: p('Draft ID') }, ['draftId']),
  tool('chorus_pm_create_tasks', M, 'Create tasks from proposal', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_add_task_draft', M, 'Add task draft to proposal', { proposalId: p('Proposal ID'), title: p('Title'), description: p('Description') }, ['proposalId', 'title']),
  tool('chorus_pm_update_task_draft', M, 'Update a task draft', { draftId: p('Draft ID'), title: p('Title'), description: p('Description') }, ['draftId']),
  tool('chorus_pm_remove_task_draft', M, 'Remove a task draft', { draftId: p('Draft ID') }, ['draftId']),
  tool('chorus_pm_assign_task', M, 'Assign a task to a user', { taskId: p('Task ID'), userId: p('User ID') }, ['taskId']),
  tool('chorus_pm_start_elaboration', M, 'Start proposal elaboration', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_skip_elaboration', M, 'Skip elaboration phase', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_pm_validate_elaboration', M, 'Validate elaboration completeness', { proposalId: p('Proposal ID') }, ['proposalId']),
  tool('chorus_add_task_dependency', M, 'Add dependency between tasks', { taskId: p('Task ID'), dependsOnTaskId: p('Depends on task ID') }, ['taskId', 'dependsOnTaskId']),
  tool('chorus_remove_task_dependency', M, 'Remove task dependency', { taskId: p('Task ID'), dependsOnTaskId: p('Depends on task ID') }, ['taskId', 'dependsOnTaskId']),
];
