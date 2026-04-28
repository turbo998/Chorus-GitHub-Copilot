import assert from 'node:assert';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { ChorusSessionManager, McpTransportLike } from '../../src/mcp/session.js';

function createMockTransport(): McpTransportLike & { calls: Array<{ method: string; params?: any }> } {
  const calls: Array<{ method: string; params?: any }> = [];
  return {
    calls,
    async request(method: string, params?: any) {
      calls.push({ method, params });
      if (method === 'initialize') return { capabilities: {} };
      if (method === 'tools/call' && params?.name === 'chorus_create_session') return { content: [{ text: JSON.stringify({ session_id: 'sess-123' }) }] };
      if (method === 'tools/call' && params?.name === 'chorus_session_heartbeat') return { content: [{ text: '{}' }] };
      if (method === 'tools/call' && params?.name === 'chorus_close_session') return { content: [{ text: '{}' }] };
      if (method === 'tools/call' && params?.name === 'chorus_session_checkin_task') return { content: [{ text: '{}' }] };
      if (method === 'tools/call' && params?.name === 'chorus_session_checkout_task') return { content: [{ text: '{}' }] };
      return {};
    },
  };
}

describe('ChorusSessionManager', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let mgr: ChorusSessionManager;

  beforeEach(() => {
    transport = createMockTransport();
  });

  afterEach(async () => {
    if (mgr) {
      try { mgr.dispose(); } catch {}
    }
  });

  it('initialize() calls MCP initialize then chorus_create_session when autoSession=true', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    assert.strictEqual(mgr.initialized, false);
    assert.strictEqual(mgr.chorusSessionId, null);

    await mgr.initialize();

    assert.strictEqual(mgr.initialized, true);
    assert.strictEqual(mgr.chorusSessionId, 'sess-123');
    assert.strictEqual(transport.calls[0].method, 'initialize');
    assert.strictEqual(transport.calls[1].method, 'tools/call');
    assert.strictEqual(transport.calls[1].params.name, 'chorus_create_session');
  });

  it('initialize() without autoSession skips create_session', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: false });
    await mgr.initialize();
    assert.strictEqual(mgr.initialized, true);
    assert.strictEqual(mgr.chorusSessionId, null);
    assert.strictEqual(transport.calls.length, 1);
  });

  it('startHeartbeat() fires at interval', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true, heartbeatInterval: 50 });
    await mgr.initialize();
    transport.calls.length = 0;

    mgr.startHeartbeat();
    await new Promise(r => setTimeout(r, 130));

    const heartbeats = transport.calls.filter(c => c.params?.name === 'chorus_session_heartbeat');
    assert.ok(heartbeats.length >= 2, `Expected >=2 heartbeats, got ${heartbeats.length}`);
  });

  it('close() stops heartbeat and closes session', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true, heartbeatInterval: 50 });
    await mgr.initialize();
    mgr.startHeartbeat();
    await mgr.close();

    const countBefore = transport.calls.length;
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(transport.calls.length, countBefore, 'No more calls after close');

    const closeCalls = transport.calls.filter(c => c.params?.name === 'chorus_close_session');
    assert.strictEqual(closeCalls.length, 1);
  });

  it('checkinTask delegates to transport', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    await mgr.checkinTask('task-abc');

    const call = transport.calls.find(c => c.params?.name === 'chorus_session_checkin_task');
    assert.ok(call);
    assert.deepStrictEqual(call.params.arguments, { task_uuid: 'task-abc', session_id: 'sess-123' });
  });

  it('checkoutTask delegates to transport', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    await mgr.checkoutTask('task-xyz');

    const call = transport.calls.find(c => c.params?.name === 'chorus_session_checkout_task');
    assert.ok(call);
    assert.deepStrictEqual(call.params.arguments, { task_uuid: 'task-xyz', session_id: 'sess-123' });
  });

  it('dispose() calls close()', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    mgr.dispose();
    const closeCalls = transport.calls.filter(c => c.params?.name === 'chorus_close_session');
    assert.strictEqual(closeCalls.length, 1);
  });
});

// Run
import { run } from 'node:test';
