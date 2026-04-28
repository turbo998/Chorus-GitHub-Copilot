import { tool, type ToolDefinition } from './types';
const p = (d: string) => ({ type: 'string', description: d });
const M = 'session' as const;

export const sessionTools: ToolDefinition[] = [
  tool('chorus_create_session', M, 'Create a new work session', { projectId: p('Project ID'), role: p('Session role') }, ['projectId']),
  tool('chorus_get_session', M, 'Get session details', { sessionId: p('Session ID') }, ['sessionId']),
  tool('chorus_list_sessions', M, 'List active sessions', { projectId: p('Project ID') }),
  tool('chorus_close_session', M, 'Close a session', { sessionId: p('Session ID') }, ['sessionId']),
  tool('chorus_reopen_session', M, 'Reopen a closed session', { sessionId: p('Session ID') }, ['sessionId']),
  tool('chorus_session_checkin_task', M, 'Check in a task to session', { sessionId: p('Session ID'), taskId: p('Task ID') }, ['sessionId', 'taskId']),
  tool('chorus_session_checkout_task', M, 'Check out a task from session', { sessionId: p('Session ID'), taskId: p('Task ID') }, ['sessionId', 'taskId']),
  tool('chorus_session_heartbeat', M, 'Send session heartbeat', { sessionId: p('Session ID') }, ['sessionId']),
];
