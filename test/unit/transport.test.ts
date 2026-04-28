import { describe, it, expect, afterEach } from 'vitest';
import * as http from 'http';
import { McpTransport } from '../../src/mcp/transport';
import { McpAuthError, McpTimeoutError, McpToolError } from '../../src/mcp/errors';

function createTestServer(handler: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      resolve({ server, port: (server.address() as any).port });
    });
  });
}

function jsonRpcOk(result: unknown) {
  return JSON.stringify({ jsonrpc: '2.0', id: 1, result });
}

describe('McpTransport', () => {
  const servers: http.Server[] = [];
  afterEach(() => { servers.forEach(s => s.close()); servers.length = 0; });

  it('successful request', async () => {
    const { server, port } = await createTestServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonRpcOk({ tools: ['a', 'b'] }));
      });
    });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, apiKey: 'test-key' });
    const result = await t.request('tools/list');
    expect(result).toEqual({ tools: ['a', 'b'] });
    t.close();
  });

  it('retries on 503', async () => {
    let attempts = 0;
    const { server, port } = await createTestServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        attempts++;
        if (attempts < 3) { res.writeHead(503); res.end('Service Unavailable'); }
        else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(jsonRpcOk('ok')); }
      });
    });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, maxRetries: 3, retryDelay: 10 });
    const result = await t.request('test');
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    t.close();
  });

  it('no retry on 401', async () => {
    let attempts = 0;
    const { server, port } = await createTestServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => { attempts++; res.writeHead(401); res.end('Unauthorized'); });
    });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, maxRetries: 3, retryDelay: 10 });
    await expect(t.request('test')).rejects.toThrow();
    expect(attempts).toBe(1);
    t.close();
  });

  it('timeout', async () => {
    const { server, port } = await createTestServer(() => { /* never respond */ });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, timeout: 100, maxRetries: 0 });
    await expect(t.request('test')).rejects.toThrow();
    t.close();
  });

  it('session id captured from header', async () => {
    const { server, port } = await createTestServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'sess-123' });
        res.end(jsonRpcOk('ok'));
      });
    });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}` });
    expect(t.sessionId).toBeNull();
    await t.request('test');
    expect(t.sessionId).toBe('sess-123');
    t.close();
  });

  it('jsonrpc error throws McpToolError', async () => {
    const { server, port } = await createTestServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }));
      });
    });
    servers.push(server);
    const t = new McpTransport({ baseUrl: `http://localhost:${port}` });
    await expect(t.request('bad_method')).rejects.toThrow();
    t.close();
  });
});
