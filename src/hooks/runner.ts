import { execFile } from 'node:child_process';
import { HookResult, HookOptions } from './types.js';

export class HookRunner {
  async exec(scriptPath: string, opts?: HookOptions): Promise<HookResult> {
    const timeout = opts?.timeout ?? 30000;
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      ...(opts?.env ?? {}),
    };

    return new Promise<HookResult>((resolve) => {
      const child = execFile(scriptPath, [], { timeout, env }, (error, stdout, stderr) => {
        if (error && (error as any).killed) {
          resolve({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode: 1, timedOut: true });
        } else {
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: error ? (error as any).code ?? 1 : 0,
            timedOut: false,
          });
        }
      });
    });
  }
}
