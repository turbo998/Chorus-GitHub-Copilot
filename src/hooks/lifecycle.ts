import { HookResolver } from './resolver.js';
import { HookRunner } from './runner.js';
import { HookName, HookResult } from './types.js';

export class HookLifecycle {
  constructor(private resolver: HookResolver, private runner: HookRunner) {}

  async fire(hookName: HookName, context?: Record<string, string>): Promise<{ ok: boolean; result?: HookResult }> {
    const script = this.resolver.resolve(hookName);
    if (!script) return { ok: true };

    const result = await this.runner.exec(script, { env: context });
    const isPreHook = hookName.startsWith('pre-');

    if (isPreHook) {
      return { ok: result.exitCode === 0 && !result.timedOut, result };
    }
    return { ok: true, result };
  }
}
