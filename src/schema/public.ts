import type { ToolDefinition } from './types.js';

const p = (name: string, displayName: string, description: string, props: Record<string, {type: string; description: string}>, required?: string[], confirmationRequired?: boolean): ToolDefinition => ({
  name, module: 'public', displayName, description, modelDescription: description,
  inputSchema: { type: 'object', properties: props, ...(required ? { required } : {}) },
  ...(confirmationRequired ? { confirmationRequired } : {}),
});

const uuid = (name: string, desc: string) => ({ [name]: { type: 'string', description: desc } });
const page = { page: { type: 'number', description: 'Page number' }, pageSize: { type: 'number', description: 'Page size' } };
const projCtx = { projectUuid: { type: 'string', description: 'Project UUID' } };

export const publicTools: ToolDefinition[] = [
  p('chorus_get_project', 'Get Project', 'Get project details', uuid('projectUuid', 'Project UUID'), ['projectUuid']),
  p('chorus_list_projects', 'List Projects', 'List all projects', page),
  p('chorus_get_task', 'Get Task', 'Get task details', { ...projCtx, ...uuid('taskUuid', 'Task UUID') }, ['projectUuid', 'taskUuid']),
  p('chorus_list_tasks', 'List Tasks', 'List tasks in a project', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_available_tasks', 'Get Available Tasks', 'Get tasks available for assignment', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_create_tasks', 'Create Tasks', 'Create new tasks in a project', { ...projCtx, tasks: { type: 'array', description: 'Array of task objects to create' } }, ['projectUuid', 'tasks'], true),
  p('chorus_update_task', 'Update Task', 'Update an existing task', { ...projCtx, ...uuid('taskUuid', 'Task UUID'), updates: { type: 'object', description: 'Task fields to update' } }, ['projectUuid', 'taskUuid', 'updates'], true),
  p('chorus_get_unblocked_tasks', 'Get Unblocked Tasks', 'Get tasks that are unblocked', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_checkin', 'Check In', 'Check in on a task', { ...projCtx, ...uuid('taskUuid', 'Task UUID'), message: { type: 'string', description: 'Check-in message' } }, ['projectUuid', 'taskUuid', 'message'], true),
  p('chorus_get_idea', 'Get Idea', 'Get idea details', { ...projCtx, ...uuid('ideaUuid', 'Idea UUID') }, ['projectUuid', 'ideaUuid']),
  p('chorus_get_ideas', 'Get Ideas', 'List ideas in a project', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_available_ideas', 'Get Available Ideas', 'Get ideas available for review', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_proposal', 'Get Proposal', 'Get proposal details', { ...projCtx, ...uuid('proposalUuid', 'Proposal UUID') }, ['projectUuid', 'proposalUuid']),
  p('chorus_get_proposals', 'Get Proposals', 'List proposals in a project', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_document', 'Get Document', 'Get document details', { ...projCtx, ...uuid('documentUuid', 'Document UUID') }, ['projectUuid', 'documentUuid']),
  p('chorus_get_documents', 'Get Documents', 'List documents in a project', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_activity', 'Get Activity', 'Get activity feed', { ...projCtx, ...page }, ['projectUuid']),
  p('chorus_get_comments', 'Get Comments', 'Get comments on an entity', { ...projCtx, ...uuid('entityUuid', 'Entity UUID'), entityType: { type: 'string', description: 'Entity type (task, idea, etc.)' } }, ['projectUuid', 'entityUuid', 'entityType']),
  p('chorus_add_comment', 'Add Comment', 'Add a comment to an entity', { ...projCtx, ...uuid('entityUuid', 'Entity UUID'), entityType: { type: 'string', description: 'Entity type' }, body: { type: 'string', description: 'Comment body' } }, ['projectUuid', 'entityUuid', 'entityType', 'body'], true),
  p('chorus_get_my_assignments', 'Get My Assignments', 'Get current user assignments', page),
  p('chorus_get_notifications', 'Get Notifications', 'Get user notifications', page),
  p('chorus_mark_notification_read', 'Mark Notification Read', 'Mark a notification as read', uuid('notificationUuid', 'Notification UUID'), ['notificationUuid'], true),
  p('chorus_get_elaboration', 'Get Elaboration', 'Get elaboration details', { ...projCtx, ...uuid('elaborationUuid', 'Elaboration UUID') }, ['projectUuid', 'elaborationUuid']),
  p('chorus_answer_elaboration', 'Answer Elaboration', 'Answer an elaboration question', { ...projCtx, ...uuid('elaborationUuid', 'Elaboration UUID'), answer: { type: 'string', description: 'Answer text' } }, ['projectUuid', 'elaborationUuid', 'answer'], true),
  p('chorus_search', 'Search', 'Search across project entities', { ...projCtx, query: { type: 'string', description: 'Search query' }, ...page }, ['query']),
  p('chorus_search_mentionables', 'Search Mentionables', 'Search for mentionable users/entities', { ...projCtx, query: { type: 'string', description: 'Search query' } }, ['projectUuid', 'query']),
  p('chorus_get_project_group', 'Get Project Group', 'Get project group details', uuid('groupUuid', 'Group UUID'), ['groupUuid']),
  p('chorus_get_project_groups', 'Get Project Groups', 'List all project groups', page),
  p('chorus_get_group_dashboard', 'Get Group Dashboard', 'Get dashboard for a project group', uuid('groupUuid', 'Group UUID'), ['groupUuid']),
];
