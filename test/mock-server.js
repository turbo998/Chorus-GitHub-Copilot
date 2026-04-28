/**
 * Mock Chorus MCP Server — for POC validation.
 * Implements minimal MCP JSON-RPC over HTTP.
 */
const http = require('http');
const crypto = require('crypto');

let sessionId = null;

const MOCK_TOOLS = {
  chorus_checkin: () => ({
    content: [{ type: 'text', text: JSON.stringify({
      agent: { name: 'copilot-dev-agent', role: 'developer' },
      projects: [{ uuid: 'proj-001', name: 'Demo Project', taskCount: 5 }],
      notifications: { unread: 2 }
    }, null, 2)}]
  }),
  chorus_get_available_tasks: (args) => ({
    content: [{ type: 'text', text: JSON.stringify({
      tasks: [
        { uuid: 'task-001', title: 'Fix login bug', priority: 'high', status: 'open', storyPoints: 3 },
        { uuid: 'task-002', title: 'Add unit tests', priority: 'medium', status: 'open', storyPoints: 5 },
        { uuid: 'task-003', title: 'Update docs', priority: 'low', status: 'open', storyPoints: 2 }
      ]
    }, null, 2)}]
  }),
  chorus_list_tasks: (args) => ({
    content: [{ type: 'text', text: JSON.stringify({
      tasks: [
        { uuid: 'task-001', title: 'Fix login bug', priority: 'high', status: 'open' },
        { uuid: 'task-004', title: 'Refactor auth module', priority: 'medium', status: 'in_progress' },
        { uuid: 'task-005', title: 'Deploy v2.1', priority: 'critical', status: 'to_verify' }
      ],
      total: 3, page: 1
    }, null, 2)}]
  }),
  chorus_claim_task: (args) => ({
    content: [{ type: 'text', text: JSON.stringify({
      task: { uuid: args.taskUuid, status: 'assigned', assignee: 'copilot-dev-agent' },
      message: `Task ${args.taskUuid} claimed successfully`
    }, null, 2)}]
  }),
  chorus_report_work: (args) => ({
    content: [{ type: 'text', text: JSON.stringify({
      task: { uuid: args.taskUuid, status: args.status || 'in_progress' },
      comment: { content: args.report, createdAt: new Date().toISOString() }
    }, null, 2)}]
  }),
  chorus_submit_for_verify: (args) => ({
    content: [{ type: 'text', text: JSON.stringify({
      task: { uuid: args.taskUuid, status: 'to_verify' },
      message: 'Task submitted for verification'
    }, null, 2)}]
  })
};

const server = http.createServer((req, res) => {
  if (req.method === 'DELETE') {
    sessionId = null;
    res.writeHead(200); res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/mcp') {
    res.writeHead(404); res.end('Not found');
    return;
  }

  // Check auth
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer cho_')) {
    res.writeHead(401); res.end(JSON.stringify({ error: 'Invalid API key' }));
    return;
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const rpc = JSON.parse(body);
      let result;

      if (rpc.method === 'initialize') {
        sessionId = crypto.randomUUID();
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'chorus-mock', version: '0.1.0' }
        };
      } else if (rpc.method === 'notifications/initialized') {
        res.writeHead(204); res.end(); return;
      } else if (rpc.method === 'tools/list') {
        result = {
          tools: Object.keys(MOCK_TOOLS).map(name => ({
            name, description: `Mock ${name}`, inputSchema: { type: 'object' }
          }))
        };
      } else if (rpc.method === 'tools/call') {
        const handler = MOCK_TOOLS[rpc.params.name];
        if (!handler) {
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Unknown tool: ${rpc.params.name}` }}));
          return;
        }
        result = handler(rpc.params.arguments || {});
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' }}));
        return;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;
      res.writeHead(200, headers);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(9876, () => console.log('Mock Chorus MCP server on http://localhost:9876/api/mcp'));
