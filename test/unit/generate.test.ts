import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');

// Run the generator script
execSync('npx tsx scripts/generate-package-tools.ts', { cwd: root, stdio: 'pipe' });

// Read package.json
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const tools = pkg.contributes?.languageModelTools;

// Assert 83 tools
assert.ok(Array.isArray(tools), 'languageModelTools should be an array');
assert.strictEqual(tools.length, 83, `Expected 83 tools, got ${tools.length}`);

// Assert first tool name starts with 'chorus_'
assert.ok(tools[0].name.startsWith('chorus_'), `First tool name should start with chorus_, got ${tools[0].name}`);

// Assert each tool has required fields
for (const tool of tools) {
  assert.ok(tool.name, 'Missing name');
  assert.ok(tool.displayName, 'Missing displayName');
  assert.ok(tool.description, 'Missing description');
  assert.ok(tool.modelDescription, 'Missing modelDescription');
  assert.ok(tool.inputSchema, 'Missing inputSchema');
}

console.log('✅ generate.test.ts passed');
