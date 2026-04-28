/**
 * Comprehensive Mock Chorus MCP Server
 * Handles all 83 tools from schema with pattern-based fixture responses.
 */
import http from 'http';
import crypto from 'crypto';
import { allTools } from '../src/schema/index';

let sessionId: string | null = null;
let server: http.Server | null = null;

function getFixtureResponse(toolName: string, args: Record<string, any>): any {
  if (toolName.endsWith('_checkin')) {
    return { agent: { name: 'test-agent' }, projects: [] };
  }
  if (/_get_/.test(toolName)) {
    return { data: { uuid: 'mock-uuid', name: 'mock-item' } };
  }
  if (/_list_/.test(toolName)) {
    return { items: [{ uuid: 'mock-uuid-1' }, { uuid: 'mock-uuid-2' }], total: 2 };
  }
  if (/_create_/.test(toolName) || /_claim_/.test(toolName)) {
    return { uuid: 'mock-uuid', status: 'created' };
  }
  if (/_delete_/.test(toolName) || /_close_/.test(toolName)) {
    return { success: true };
  }
  return { result: 'ok' };
}

const toolNames = new Set(allTools.map(t => t.name));

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === 'DELETE') {
    sessionId = null;
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/mcp') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', (c: Buffer) => (body += c));
  req.on('end', () => {
    try {
      const rpc = JSON.parse(body);
      let result: any;

      if (rpc.method === 'initialize') {
        sessionId = crypto.randomUUID();
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'chorus-mock', version: '0.1.0' },
        };
      } else if (rpc.method === 'notifications/initialized') {
        res.writeHead(204);
        res.end();
        return;
      } else if (rpc.method === 'tools/list') {
        result = {
          tools: allTools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        };
      } else if (rpc.method === 'tools/call') {
        const name = rpc.params?.name;
        if (!toolNames.has(name)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Unknown tool: ${name}` } }));
          return;
        }
        const fixture = getFixtureResponse(name, rpc.params?.arguments || {});
        result = {
          content: [{ type: 'text', text: JSON.stringify(fixture, null, 2) }],
        };
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } }));
        return;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;
      res.writeHead(200, headers);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }));
    } catch (e: any) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

export function start(port = 9876): Promise<http.Server> {
  return new Promise((resolve) => {
    server = http.createServer(handleRequest);
    server.listen(port, () => {
      console.log(`Mock MCP server on http://localhost:${port}/api/mcp`);
      resolve(server!);
    });
  });
}

export function stop(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        sessionId = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export { allTools };
