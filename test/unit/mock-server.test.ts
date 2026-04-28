import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import crypto from 'crypto';
import { allTools } from '../../src/schema/index';

const PORT = 9877;
let sessionId: string | null = null;
let server: http.Server | null = null;
const toolNames = new Set(allTools.map(t => t.name));

function getFixtureResponse(toolName: string, args: Record<string, any>): any {
  if (toolName.endsWith('_checkin')) return { agent: { name: 'test-agent' }, projects: [] };
  if (/_get_/.test(toolName)) return { data: { uuid: 'mock-uuid', name: 'mock-item' } };
  if (/_list_/.test(toolName)) return { items: [{ uuid: 'mock-uuid-1' }, { uuid: 'mock-uuid-2' }], total: 2 };
  if (/_create_/.test(toolName) || /_claim_/.test(toolName)) return { uuid: 'mock-uuid', status: 'created' };
  if (/_delete_/.test(toolName) || /_close_/.test(toolName)) return { success: true };
  return { result: 'ok' };
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === 'DELETE') { sessionId = null; res.writeHead(200); res.end(); return; }
  let body = '';
  req.on('data', (c: any) => (body += c));
  req.on('end', () => {
    try {
      const rpc = JSON.parse(body);
      let result: any;
      if (rpc.method === 'initialize') {
        sessionId = crypto.randomUUID();
        result = { protocolVersion: '2024-11-05', capabilities: { tools: { listChanged: true } }, serverInfo: { name: 'chorus-mock', version: '1.0.0' } };
      } else if (rpc.method === 'notifications/initialized') { res.writeHead(204); res.end(); return; }
      else if (rpc.method === 'tools/list') {
        result = { tools: allTools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
      } else if (rpc.method === 'tools/call') {
        const name = rpc.params?.name;
        if (!toolNames.has(name)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Unknown tool: ${name}` } }));
          return;
        }
        result = { content: [{ type: 'text', text: JSON.stringify(getFixtureResponse(name, rpc.params?.arguments || {})) }] };
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } }));
        return;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;
      res.writeHead(200, headers);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }));
    } catch (e: any) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
  });
}

function startServer(port: number): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer(handleRequest);
    server.listen(port, () => resolve());
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) { server.close(() => { server = null; sessionId = null; resolve(); }); }
    else resolve();
  });
}

function rpc(method: string, params?: any, id = 1): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/mcp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c: any) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

describe('Mock MCP Server', () => {
  beforeAll(async () => { await startServer(PORT); });
  afterAll(async () => { await stopServer(); });

  it('initialize returns server info', async () => {
    const init = await rpc('initialize');
    expect(init.body.result?.serverInfo?.name).toBe('chorus-mock');
    expect(init.body.result?.protocolVersion).toBe('2024-11-05');
    expect(init.headers['mcp-session-id']).toBeTruthy();
  });

  it('tools/list returns all tools', async () => {
    const list = await rpc('tools/list');
    expect(list.body.result?.tools?.length).toBe(allTools.length);
  });

  it('checkin returns agent', async () => {
    const r = await rpc('tools/call', { name: 'chorus_checkin', arguments: {} });
    const txt = JSON.parse(r.body.result.content[0].text);
    expect(txt.agent?.name).toBe('test-agent');
  });

  it('get tool returns data', async () => {
    const getTool = allTools.find(t => /_get_/.test(t.name));
    if (!getTool) return;
    const r = await rpc('tools/call', { name: getTool.name, arguments: {} });
    const txt = JSON.parse(r.body.result.content[0].text);
    expect(txt.data).toBeTruthy();
  });

  it('list tool returns items', async () => {
    const listTool = allTools.find(t => /_list_/.test(t.name));
    if (!listTool) return;
    const r = await rpc('tools/call', { name: listTool.name, arguments: {} });
    const txt = JSON.parse(r.body.result.content[0].text);
    expect(Array.isArray(txt.items)).toBe(true);
  });

  it('create tool returns created', async () => {
    const createTool = allTools.find(t => /_create_/.test(t.name));
    if (!createTool) return;
    const r = await rpc('tools/call', { name: createTool.name, arguments: {} });
    const txt = JSON.parse(r.body.result.content[0].text);
    expect(txt.status).toBe('created');
  });

  it('delete tool returns success', async () => {
    const deleteTool = allTools.find(t => /_delete_/.test(t.name));
    if (!deleteTool) return;
    const r = await rpc('tools/call', { name: deleteTool.name, arguments: {} });
    const txt = JSON.parse(r.body.result.content[0].text);
    expect(txt.success).toBe(true);
  });

  it('unknown tool returns error', async () => {
    const r = await rpc('tools/call', { name: 'nonexistent_tool', arguments: {} });
    expect(r.body.error).toBeTruthy();
  });
});
