#!/usr/bin/env npx tsx
/**
 * Unified unit test runner – runs all unit tests sequentially.
 */
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const unitDir = join(__dirname, 'unit');

const testFiles = readdirSync(unitDir)
  .filter(f => f.endsWith('.test.ts'))
  .sort();

console.log(`\n🧪 Running ${testFiles.length} unit test files...\n`);

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const file of testFiles) {
  const filePath = join(unitDir, file);
  process.stdout.write(`  ▸ ${file} ... `);
  try {
    execSync(`npx tsx "${filePath}"`, { stdio: 'pipe', timeout: 60_000 });
    console.log('✅');
    passed++;
  } catch (err: any) {
    console.log('❌');
    failed++;
    failures.push(file);
    if (err.stderr) console.error(`    ${err.stderr.toString().trim().split('\n').join('\n    ')}`);
    if (err.stdout) console.error(`    ${err.stdout.toString().trim().split('\n').join('\n    ')}`);
  }
}

console.log(`\n${'═'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${testFiles.length} total`);
if (failures.length) {
  console.log(`Failed: ${failures.join(', ')}`);
}
console.log(`${'═'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
