import { createServer, IncomingMessage, ServerResponse } from 'http';
import assert from 'assert';

// We'll import the client under test
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
          res.end(JSON.stringify({
            jsonrpc: '2.0', id: parsed.id,
            result: { content: [{ text: JSON.stringify({ session_id: 'chorus-sess-abc' }) }] },
          }));
        } else if (parsed.method === 'tools/call' && parsed.params?.name === 'chorus_close_session') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { content: [{ text: '{}' }] } }));
        } else if (parsed.method === 'tools/list') {
          res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { tools: [{ name: 'chorus_checkin' }] } }));
        } else if (parsed.method === 'tools/call') {
          res.end(JSON.stringify({
            jsonrpc: '2.0', id: parsed.id,
            result: { content: [{ text: JSON.stringify({ ok: true, tool: parsed.params?.name }) }] },
          }));
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

async function run() {
  await startMockServer();
  console.log(`Mock server on port ${port}`);

  try {
    // Test 1: connect() initializes session
    console.log('TEST 1: connect() initializes session');
    const client = new ChorusMcpClient({
      serverUrl: `http://localhost:${port}`,
      apiKey: 'test-key',
      autoSession: true,
    });

    assert.strictEqual(client.isConnected, false);
    assert.strictEqual(client.sessionId, null);

    await client.connect();

    assert.strictEqual(client.isConnected, true);
    assert.strictEqual(client.sessionId, 'chorus-sess-abc');
    console.log('  PASS');

    // Test 2: callTool() sends correct JSON-RPC
    console.log('TEST 2: callTool() sends correct JSON-RPC');
    requestCount = 0;
    const result = await client.callTool('my_tool', { foo: 'bar' });
    assert.ok(lastRequest);
    assert.strictEqual(lastRequest!.method, 'tools/call');
    assert.strictEqual(lastRequest!.params?.name, 'my_tool');
    assert.deepStrictEqual(lastRequest!.params?.arguments, { foo: 'bar' });
    console.log('  PASS');

    // Test 3: listTools()
    console.log('TEST 3: listTools()');
    const tools = await client.listTools();
    assert.ok(lastRequest);
    assert.strictEqual(lastRequest!.method, 'tools/list');
    console.log('  PASS');

    // Test 4: checkin() shortcut
    console.log('TEST 4: checkin() shortcut');
    await client.checkin();
    assert.strictEqual(lastRequest!.method, 'tools/call');
    assert.strictEqual(lastRequest!.params?.name, 'chorus_checkin');
    console.log('  PASS');

    // Test 5: disconnect() cleans up
    console.log('TEST 5: disconnect() cleans up');
    await client.disconnect();
    assert.strictEqual(client.isConnected, false);
    console.log('  PASS');

    // Test 6: cannot call tools when disconnected
    console.log('TEST 6: error when calling tool while disconnected');
    try {
      await client.callTool('anything');
      assert.fail('Should have thrown');
    } catch (e: any) {
      assert.ok(e.message.includes('Not connected'));
    }
    console.log('  PASS');

    console.log('\nAll tests passed!');
  } finally {
    server.close();
  }
}

run().catch((e) => {
  console.error('FAIL:', e);
  server?.close();
  process.exit(1);
});
