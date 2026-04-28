import { tool, type ToolDefinition } from './types';
const p = (d: string) => ({ type: 'string', description: d });
const M = 'presence' as const;

export const presenceTools: ToolDefinition[] = [
  tool('chorus_get_presence', M, 'Get presence info for a user', { userId: p('User ID') }, ['userId']),
  tool('chorus_list_presence', M, 'List all online presences', { projectId: p('Project ID') }),
  tool('chorus_search_presence', M, 'Search presence by criteria', { query: p('Search query') }, ['query']),
];
