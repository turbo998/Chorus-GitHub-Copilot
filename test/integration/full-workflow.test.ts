import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import crypto from 'crypto';
import { allTools } from '../../src/schema/index';
import { ChorusMcpClient } from '../../src/mcp/client';

const PORT = 9878;
const BASE = `http://localhost:${PORT}/api/mcp`;
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
    if (server) { server.close(() => { server = null; sessionId = null; resolve(); }); } else resolve();
  });
}

function parse(result: any): any {
  if (result?.content?.[0]?.text) return JSON.parse(result.content[0].text);
  return result;
}

describe('Full workflow integration', () => {
  let client: ChorusMcpClient;

  beforeAll(async () => { await startServer(PORT); });
  afterAll(async () => { await stopServer(); });

  it('connect', async () => {
    client = new ChorusMcpClient({ serverUrl: BASE, apiKey: 'test-key', autoSession: true, timeout: 5000 });
    await client.connect();
    expect(client.isConnected).toBe(true);
  });

  it('checkin', async () => {
    const r = parse(await client.checkin());
    expect(r.agent).toBeTruthy();
  });

  it('chorus_list_projects', async () => {
    const r = parse(await client.callTool('chorus_list_projects'));
    expect(r.items).toBeDefined();
    expect(r.total).toBe(2);
  });

  it('chorus_get_available_tasks', async () => {
    const r = parse(await client.callTool('chorus_get_available_tasks', { projectUuid: 'test-proj' }));
    expect(r.data).toBeTruthy();
  });

  it('chorus_claim_task', async () => {
    const r = parse(await client.callTool('chorus_claim_task', { taskId: 'test-task' }));
    expect(r.uuid).toBeTruthy();
  });

  it('chorus_report_work', async () => {
    const r = parse(await client.callTool('chorus_report_work', { taskId: 'test-task', summary: 'done' }));
    expect(r.result).toBeTruthy();
  });

  it('chorus_submit_for_verify', async () => {
    const r = parse(await client.callTool('chorus_submit_for_verify', { taskId: 'test-task', notes: 'ready' }));
    expect(r.result).toBeTruthy();
  });

  it('chorus_pm_create_idea', async () => {
    const r = parse(await client.callTool('chorus_pm_create_idea', { projectId: 'test-proj', title: 'New Feature', description: 'A great idea' }));
    expect(r.uuid).toBeTruthy();
  });

  it('chorus_admin_verify_task', async () => {
    const r = parse(await client.callTool('chorus_admin_verify_task', { taskId: 'test-task', status: 'approved' }));
    expect(r.result).toBeTruthy();
  });

  it('chorus_create_session', async () => {
    const r = parse(await client.callTool('chorus_create_session', { projectId: 'test-proj', role: 'developer' }));
    expect(r.uuid).toBeTruthy();
  });

  it('disconnect', async () => {
    await client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it('callTool after disconnect throws', async () => {
    await expect(client.callTool('chorus_checkin')).rejects.toThrow('Not connected');
  });
});
