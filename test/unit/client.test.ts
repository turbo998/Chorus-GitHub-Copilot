import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { ChorusMcpClient } from '../../src/mcp/client';

let server: ReturnType<typeof createServer>;
let port: number;
let lastRequest: { method: string; params?: any; id: number } | null = null;
let requestCount = 0;

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        lastRequest = parsed;
        requestCount++;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('mcp-session-id', 'test-session-123');
        if (parsed.method === 'initialize') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { capabilities: {} } }));
        } else if (parsed.method === 'tools/call' && parsed.params?.name === 'chorus_create_session') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { content: [{ text: JSON.stringify({ session_id: 'chorus-sess-abc' }) }] } }));
        } else if (parsed.method === 'tools/call' && parsed.params?.name === 'chorus_close_session') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { content: [{ text: '{}' }] } }));
        } else if (parsed.method === 'tools/list') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { tools: [{ name: 'chorus_checkin' }] } }));
        } else if (parsed.method === 'tools/call') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { content: [{ text: JSON.stringify({ ok: true, tool: parsed.params?.name }) }] } }));
        } else {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: null }));
        }
      });
    });
    server.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
}

describe('ChorusMcpClient', () => {
  beforeAll(async () => {
    await startMockServer();
  });
  afterAll(() => { server.close(); });

  it('connect() initializes session', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    expect(client.isConnected).toBe(false);
    expect(client.sessionId).toBeNull();
    await client.connect();
    expect(client.isConnected).toBe(true);
    expect(client.sessionId).toBe('chorus-sess-abc');
    await client.disconnect();
  });

  it('callTool() sends correct JSON-RPC', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    await client.connect();
    requestCount = 0;
    await client.callTool('my_tool', { foo: 'bar' });
    expect(lastRequest).toBeTruthy();
    expect(lastRequest!.method).toBe('tools/call');
    expect(lastRequest!.params?.name).toBe('my_tool');
    expect(lastRequest!.params?.arguments).toEqual({ foo: 'bar' });
    await client.disconnect();
  });

  it('listTools()', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    await client.connect();
    await client.listTools();
    expect(lastRequest!.method).toBe('tools/list');
    await client.disconnect();
  });

  it('checkin() shortcut', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    await client.connect();
    await client.checkin();
    expect(lastRequest!.method).toBe('tools/call');
    expect(lastRequest!.params?.name).toBe('chorus_checkin');
    await client.disconnect();
  });

  it('disconnect() cleans up', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    await client.connect();
    await client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it('error when calling tool while disconnected', async () => {
    const client = new ChorusMcpClient({ serverUrl: `http://localhost:${port}`, apiKey: 'test-key', autoSession: true });
    await expect(client.callTool('anything')).rejects.toThrow('Not connected');
  });
});
