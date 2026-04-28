import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { HookName } from './types.js';

export class HookResolver {
  constructor(private workspaceRoot: string) {}

  resolve(hookName: HookName): string | null {
    for (const ext of ['.sh', '.ts', '.js']) {
      const p = join(this.workspaceRoot, '.chorus', 'hooks', `${hookName}${ext}`);
      if (existsSync(p)) return p;
    }
    return null;
  }
}
