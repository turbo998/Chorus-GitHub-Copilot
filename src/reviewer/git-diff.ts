import { execFile } from 'node:child_process';

const MAX_DIFF_LENGTH = 8000;

export class GitDiffService {
  async getDiff(cwd?: string): Promise<string> {
    return new Promise<string>((resolve) => {
      execFile('git', ['diff', 'HEAD'], { cwd: cwd || process.cwd() }, (error, stdout) => {
        if (error) {
          resolve('');
          return;
        }
        const diff = stdout || '';
        if (diff.length > MAX_DIFF_LENGTH) {
          return resolve(diff.slice(0, MAX_DIFF_LENGTH) + '\n[truncated]');
        }
        resolve(diff);
      });
    });
  }
}
