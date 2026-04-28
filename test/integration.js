/**
 * Integration test — validates MCP client against mock server.
 * Run: node test/integration.js
 */

// Inline a minimal MCP client (same logic as ChorusMcpClient)
const MCP_URL = 'http://localhost:9876/api/mcp';
const API_KEY = 'cho_test_key_12345';
let sessionId = null;
let reqId = 0;

async function send(method, params) {
  const id = ++reqId;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const resp = await fetch(MCP_URL, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });

  const sid = resp.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  if (resp.status === 204) return null;
  const json = await resp.json();
  if (json.error) throw new Error(`MCP error: ${json.error.message}`);
  return json.result;
}

async function test() {
  console.log('=== Chorus MCP Integration Test ===\n');
  
  // 1. Initialize
  console.log('1. Initialize MCP session...');
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.1.0' }
  });
  console.log(`   ✅ Session: ${sessionId}`);
  console.log(`   Server: ${init.serverInfo.name} v${init.serverInfo.version}\n`);

  // Send initialized notification
  await send('notifications/initialized', {});

  // 2. List tools
  console.log('2. List tools...');
  const tools = await send('tools/list', {});
  console.log(`   ✅ ${tools.tools.length} tools available: ${tools.tools.map(t => t.name).join(', ')}\n`);

  // 3. Checkin
  console.log('3. chorus_checkin...');
  const checkin = await send('tools/call', { name: 'chorus_checkin', arguments: {} });
  const checkinData = JSON.parse(checkin.content[0].text);
  console.log(`   ✅ Agent: ${checkinData.agent.name} (${checkinData.agent.role})`);
  console.log(`   Projects: ${checkinData.projects.map(p => p.name).join(', ')}\n`);

  // 4. Get available tasks
  const projectUuid = checkinData.projects[0].uuid;
  console.log(`4. chorus_get_available_tasks (project: ${projectUuid})...`);
  const tasks = await send('tools/call', { name: 'chorus_get_available_tasks', arguments: { projectUuid } });
  const tasksData = JSON.parse(tasks.content[0].text);
  console.log(`   ✅ ${tasksData.tasks.length} available tasks:`);
  tasksData.tasks.forEach(t => console.log(`      - [${t.priority}] ${t.title} (${t.uuid})`));
  console.log();

  // 5. Claim task
  const taskUuid = tasksData.tasks[0].uuid;
  console.log(`5. chorus_claim_task (${taskUuid})...`);
  const claim = await send('tools/call', { name: 'chorus_claim_task', arguments: { taskUuid } });
  const claimData = JSON.parse(claim.content[0].text);
  console.log(`   ✅ ${claimData.message}\n`);

  // 6. Report work
  console.log(`6. chorus_report_work...`);
  const report = await send('tools/call', { name: 'chorus_report_work', arguments: { taskUuid, report: 'Fixed the login validation logic', status: 'in_progress' } });
  console.log(`   ✅ Progress reported\n`);

  // 7. Submit for verify
  console.log(`7. chorus_submit_for_verify...`);
  const submit = await send('tools/call', { name: 'chorus_submit_for_verify', arguments: { taskUuid, summary: 'Login bug fixed and tested' } });
  const submitData = JSON.parse(submit.content[0].text);
  console.log(`   ✅ ${submitData.message}\n`);

  console.log('=== ALL TESTS PASSED ===');
  console.log('\nFull Dev Agent workflow validated:');
  console.log('  checkin → list tasks → claim → report work → submit for verify ✅');
}

test().catch(e => { console.error('❌ TEST FAILED:', e.message); process.exit(1); });
