export interface HookResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export type HookName = 'pre-claim' | 'post-claim' | 'pre-submit' | 'post-verify';

export interface HookOptions {
  timeout?: number;
  env?: Record<string, string>;
}
