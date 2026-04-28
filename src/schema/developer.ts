import { tool, type ToolDefinition } from './types';
const p = (d: string) => ({ type: 'string', description: d });
const M = 'developer' as const;

export const developerTools: ToolDefinition[] = [
  tool('chorus_claim_task', M, 'Claim a task for work', { taskId: p('Task ID') }, ['taskId']),
  tool('chorus_release_task', M, 'Release a claimed task', { taskId: p('Task ID') }, ['taskId']),
  tool('chorus_report_work', M, 'Report work progress on a task', { taskId: p('Task ID'), summary: p('Work summary') }, ['taskId', 'summary']),
  tool('chorus_submit_for_verify', M, 'Submit task for verification', { taskId: p('Task ID'), notes: p('Submission notes') }, ['taskId']),
  tool('chorus_report_criteria_self_check', M, 'Report self-check on acceptance criteria', { taskId: p('Task ID'), criteriaId: p('Criteria ID'), status: p('Check status') }, ['taskId', 'criteriaId', 'status']),
];
