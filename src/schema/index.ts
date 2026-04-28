import type { ToolDefinition } from './types';
export type { ToolDefinition } from './types';
export { tool } from './types';

import { publicTools } from './public';
import { developerTools } from './developer';
import { sessionTools } from './session';
import { pmTools } from './pm';
import { adminTools } from './admin';
import { presenceTools } from './presence';

export { publicTools, developerTools, sessionTools, pmTools, adminTools, presenceTools };

export const allTools: ToolDefinition[] = [
  ...publicTools,
  ...developerTools,
  ...sessionTools,
  ...pmTools,
  ...adminTools,
  ...presenceTools,
];

export function getToolsByModule(module: ToolDefinition['module']): ToolDefinition[] {
  return allTools.filter(t => t.module === module);
}
