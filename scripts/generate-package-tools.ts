import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { allTools } from '../src/schema/index.js';

const root = join(new URL('.', import.meta.url).pathname, '..');
const pkgPath = join(root, 'package.json');

// Read package.json preserving formatting
const raw = readFileSync(pkgPath, 'utf-8');
const pkg = JSON.parse(raw);

// Detect indent
const indent = raw.match(/^(\s+)"/m)?.[1] || '  ';

// Generate languageModelTools
const languageModelTools = allTools.map(t => ({
  name: t.name,
  displayName: t.displayName,
  description: t.description,
  modelDescription: t.modelDescription,
  inputSchema: t.inputSchema,
}));

// Update package.json
if (!pkg.contributes) pkg.contributes = {};
pkg.contributes.languageModelTools = languageModelTools;

writeFileSync(pkgPath, JSON.stringify(pkg, null, indent.length) + '\n', 'utf-8');
console.log(`✅ Wrote ${languageModelTools.length} tools to package.json`);
