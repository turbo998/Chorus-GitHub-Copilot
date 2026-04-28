import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(new URL('.', import.meta.url).pathname, '..', '..');

describe('generate-package-tools', () => {
  it('generates 83 tools with required fields', () => {
    execSync('npx tsx scripts/generate-package-tools.ts', { cwd: root, stdio: 'pipe' });
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    const tools = pkg.contributes?.languageModelTools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(83);
    expect(tools[0].name.startsWith('chorus_')).toBe(true);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.displayName).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.modelDescription).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});
