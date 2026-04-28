import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HookRunner } from '../../src/hooks/runner';
import { HookResolver } from '../../src/hooks/resolver';
import { HookLifecycle } from '../../src/hooks/lifecycle';

describe('HookRunner', () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'hook-test-')); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it('runs script and captures stdout/stderr/exitCode', async () => {
    const script = join(tmp, 'test.sh');
    writeFileSync(script, '#!/bin/sh\necho hello\necho err >&2\nexit 0\n');
    chmodSync(script, 0o755);
    const r = new HookRunner();
    const result = await r.exec(script);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.stderr.trim()).toBe('err');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('timeout kills process', async () => {
    const script = join(tmp, 'slow.sh');
    writeFileSync(script, '#!/bin/sh\nsleep 10\n');
    chmodSync(script, 0o755);
    const r = new HookRunner();
    const result = await r.exec(script, { timeout: 1000 });
    expect(result.timedOut).toBe(true);
  });

  it('handles missing script', async () => {
    const r = new HookRunner();
    const result = await r.exec('/nonexistent/script.sh');
    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(false);
  });
});

describe('HookResolver', () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'hook-resolve-')); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it('finds .sh then .ts then .js in order', () => {
    const dir = join(tmp, '.chorus', 'hooks');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'pre-claim.js'), '');
    writeFileSync(join(dir, 'pre-claim.sh'), '');
    const resolver = new HookResolver(tmp);
    expect(resolver.resolve('pre-claim')).toBe(join(dir, 'pre-claim.sh'));
  });

  it('returns null when no hook exists', () => {
    const resolver = new HookResolver(tmp);
    expect(resolver.resolve('post-verify')).toBeNull();
  });
});

describe('HookLifecycle', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'hook-lc-'));
    mkdirSync(join(tmp, '.chorus', 'hooks'), { recursive: true });
  });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it('pre-hook failure blocks (ok=false)', async () => {
    const script = join(tmp, '.chorus', 'hooks', 'pre-claim.sh');
    writeFileSync(script, '#!/bin/sh\nexit 1\n');
    chmodSync(script, 0o755);
    const lc = new HookLifecycle(new HookResolver(tmp), new HookRunner());
    const { ok } = await lc.fire('pre-claim');
    expect(ok).toBe(false);
  });

  it('post-hook failure still ok=true', async () => {
    const script = join(tmp, '.chorus', 'hooks', 'post-claim.sh');
    writeFileSync(script, '#!/bin/sh\nexit 1\n');
    chmodSync(script, 0o755);
    const lc = new HookLifecycle(new HookResolver(tmp), new HookRunner());
    const { ok } = await lc.fire('post-claim');
    expect(ok).toBe(true);
  });

  it('no hook file = ok=true (skip)', async () => {
    const lc = new HookLifecycle(new HookResolver(tmp), new HookRunner());
    const { ok } = await lc.fire('pre-submit');
    expect(ok).toBe(true);
  });
});
