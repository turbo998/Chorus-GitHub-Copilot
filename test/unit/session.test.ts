import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  beforeEach(() => { transport = createMockTransport(); });
  afterEach(() => { if (mgr) try { mgr.dispose(); } catch {} });

  it('initialize() calls MCP initialize then chorus_create_session when autoSession=true', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    expect(mgr.initialized).toBe(false);
    expect(mgr.chorusSessionId).toBeNull();
    await mgr.initialize();
    expect(mgr.initialized).toBe(true);
    expect(mgr.chorusSessionId).toBe('sess-123');
    expect(transport.calls[0].method).toBe('initialize');
    expect(transport.calls[1].method).toBe('tools/call');
    expect(transport.calls[1].params.name).toBe('chorus_create_session');
  });

  it('initialize() without autoSession skips create_session', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: false });
    await mgr.initialize();
    expect(mgr.initialized).toBe(true);
    expect(mgr.chorusSessionId).toBeNull();
    expect(transport.calls.length).toBe(1);
  });

  it('startHeartbeat() fires at interval', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true, heartbeatInterval: 50 });
    await mgr.initialize();
    transport.calls.length = 0;
    mgr.startHeartbeat();
    await new Promise(r => setTimeout(r, 130));
    const heartbeats = transport.calls.filter(c => c.params?.name === 'chorus_session_heartbeat');
    expect(heartbeats.length).toBeGreaterThanOrEqual(2);
  });

  it('close() stops heartbeat and closes session', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true, heartbeatInterval: 50 });
    await mgr.initialize();
    mgr.startHeartbeat();
    await mgr.close();
    const countBefore = transport.calls.length;
    await new Promise(r => setTimeout(r, 100));
    expect(transport.calls.length).toBe(countBefore);
    expect(transport.calls.filter(c => c.params?.name === 'chorus_close_session').length).toBe(1);
  });

  it('checkinTask delegates to transport', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    await mgr.checkinTask('task-abc');
    const call = transport.calls.find(c => c.params?.name === 'chorus_session_checkin_task');
    expect(call).toBeTruthy();
    expect(call!.params.arguments).toEqual({ task_uuid: 'task-abc', session_id: 'sess-123' });
  });

  it('checkoutTask delegates to transport', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    await mgr.checkoutTask('task-xyz');
    const call = transport.calls.find(c => c.params?.name === 'chorus_session_checkout_task');
    expect(call).toBeTruthy();
    expect(call!.params.arguments).toEqual({ task_uuid: 'task-xyz', session_id: 'sess-123' });
  });

  it('dispose() calls close()', async () => {
    mgr = new ChorusSessionManager({ transport, autoSession: true });
    await mgr.initialize();
    mgr.dispose();
    expect(transport.calls.filter(c => c.params?.name === 'chorus_close_session').length).toBe(1);
  });
});
