import * as http from 'http';
import assert from 'assert';
import { McpTransport } from '../../src/mcp/transport';
import { McpAuthError, McpTimeoutError, McpToolError, McpNetworkError } from '../../src/mcp/errors';

function createTestServer(handler: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

function jsonRpcOk(result: unknown) {
  return JSON.stringify({ jsonrpc: '2.0', id: 1, result });
}

async function test_successful_request() {
  const { server, port } = await createTestServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.jsonrpc, '2.0');
      assert.strictEqual(parsed.method, 'tools/list');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(jsonRpcOk({ tools: ['a', 'b'] }));
    });
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, apiKey: 'test-key' });
    const result = await t.request('tools/list');
    assert.deepStrictEqual(result, { tools: ['a', 'b'] });
    t.close();
    console.log('✅ test_successful_request');
  } finally {
    server.close();
  }
}

async function test_retries_on_503() {
  let attempts = 0;
  const { server, port } = await createTestServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      attempts++;
      if (attempts < 3) {
        res.writeHead(503);
        res.end('Service Unavailable');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonRpcOk('ok'));
      }
    });
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, maxRetries: 3, retryDelay: 10 });
    const result = await t.request('test');
    assert.strictEqual(result, 'ok');
    assert.strictEqual(attempts, 3);
    t.close();
    console.log('✅ test_retries_on_503');
  } finally {
    server.close();
  }
}

async function test_no_retry_on_401() {
  let attempts = 0;
  const { server, port } = await createTestServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      attempts++;
      res.writeHead(401);
      res.end('Unauthorized');
    });
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, maxRetries: 3, retryDelay: 10 });
    await assert.rejects(() => t.request('test'), (err: any) => {
      assert(err instanceof McpAuthError);
      return true;
    });
    assert.strictEqual(attempts, 1);
    t.close();
    console.log('✅ test_no_retry_on_401');
  } finally {
    server.close();
  }
}

async function test_timeout() {
  const { server, port } = await createTestServer((req, res) => {
    // Never respond
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}`, timeout: 100, maxRetries: 0 });
    await assert.rejects(() => t.request('test'), (err: any) => {
      assert(err instanceof McpTimeoutError);
      return true;
    });
    t.close();
    console.log('✅ test_timeout');
  } finally {
    server.close();
  }
}

async function test_session_id_captured() {
  const { server, port } = await createTestServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'sess-123' });
      res.end(jsonRpcOk('ok'));
    });
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}` });
    assert.strictEqual(t.sessionId, null);
    await t.request('test');
    assert.strictEqual(t.sessionId, 'sess-123');
    t.close();
    console.log('✅ test_session_id_captured');
  } finally {
    server.close();
  }
}

async function test_jsonrpc_error_throws_tool_error() {
  const { server, port } = await createTestServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }));
    });
  });
  try {
    const t = new McpTransport({ baseUrl: `http://localhost:${port}` });
    await assert.rejects(() => t.request('bad_method'), (err: any) => {
      assert(err instanceof McpToolError);
      return true;
    });
    t.close();
    console.log('✅ test_jsonrpc_error_throws_tool_error');
  } finally {
    server.close();
  }
}

(async () => {
  await test_successful_request();
  await test_retries_on_503();
  await test_no_retry_on_401();
  await test_timeout();
  await test_session_id_captured();
  await test_jsonrpc_error_throws_tool_error();
  console.log('\n🎉 All transport tests passed!');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
