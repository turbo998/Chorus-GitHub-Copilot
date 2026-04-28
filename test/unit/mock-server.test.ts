/**
 * Tests for comprehensive mock MCP server
 */
import { start, stop, allTools } from '../mock-server';
import http from 'http';

const PORT = 9877;

function rpc(method: string, params?: any, id = 1): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/mcp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

async function main() {
  await start(PORT);
  console.log('\n--- Initialize ---');
  const init = await rpc('initialize');
  assert(init.body.result?.serverInfo?.name === 'chorus-mock', 'server info name');
  assert(init.body.result?.protocolVersion === '2024-11-05', 'protocol version');
  assert(!!init.headers['mcp-session-id'], 'session id header present');

  console.log('\n--- Tools List ---');
  const list = await rpc('tools/list');
  const toolCount = list.body.result?.tools?.length;
  console.log(`  Tool count: ${toolCount}`);
  assert(toolCount === allTools.length, `tools/list returns ${allTools.length} tools (got ${toolCount})`);

  console.log('\n--- Tools Call patterns ---');
  // checkin
  let r = await rpc('tools/call', { name: 'chorus_checkin', arguments: {} });
  let txt = JSON.parse(r.body.result.content[0].text);
  assert(txt.agent?.name === 'test-agent', 'checkin returns agent');

  // find a _get_ tool
  const getTool = allTools.find(t => /_get_/.test(t.name));
  if (getTool) {
    r = await rpc('tools/call', { name: getTool.name, arguments: {} });
    txt = JSON.parse(r.body.result.content[0].text);
    assert(!!txt.data, `get tool (${getTool.name}) returns data`);
  }

  // find a _list_ tool
  const listTool = allTools.find(t => /_list_/.test(t.name));
  if (listTool) {
    r = await rpc('tools/call', { name: listTool.name, arguments: {} });
    txt = JSON.parse(r.body.result.content[0].text);
    assert(Array.isArray(txt.items), `list tool (${listTool.name}) returns items`);
  }

  // find a _create_ tool
  const createTool = allTools.find(t => /_create_/.test(t.name));
  if (createTool) {
    r = await rpc('tools/call', { name: createTool.name, arguments: {} });
    txt = JSON.parse(r.body.result.content[0].text);
    assert(txt.status === 'created', `create tool (${createTool.name}) returns created`);
  }

  // find a _delete_ tool
  const deleteTool = allTools.find(t => /_delete_/.test(t.name));
  if (deleteTool) {
    r = await rpc('tools/call', { name: deleteTool.name, arguments: {} });
    txt = JSON.parse(r.body.result.content[0].text);
    assert(txt.success === true, `delete tool (${deleteTool.name}) returns success`);
  }

  // unknown tool
  r = await rpc('tools/call', { name: 'nonexistent_tool', arguments: {} });
  assert(!!r.body.error, 'unknown tool returns error');

  console.log(`\n✅ Passed: ${passed}  ❌ Failed: ${failed}\n`);
  await stop();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
