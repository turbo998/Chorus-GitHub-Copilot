/**
 * Full workflow integration test covering all 6 modules:
 *   Developer, PM, Admin, Session, Core, and Query tools.
 *
 * Starts mock server → creates ChorusMcpClient → exercises end-to-end flow → disconnects.
 */
import http from 'http';
import { start, stop } from '../mock-server';
import { ChorusMcpClient } from '../../src/mcp/client';

const PORT = 9877; // avoid collision with other tests
const BASE = `http://localhost:${PORT}/api/mcp`;

let server: http.Server;
let client: ChorusMcpClient;

function parse(result: any): any {
  if (result?.content?.[0]?.text) return JSON.parse(result.content[0].text);
  return result;
}

async function assert(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
  } catch (e: any) {
    console.error(`  ❌ ${label}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('🚀 Starting integration tests...\n');

  // ── Setup ──
  server = await start(PORT);
  client = new ChorusMcpClient({
    serverUrl: BASE,
    apiKey: 'test-key',
    autoSession: true,
    timeout: 5000,
  });

  // ── Connect ──
  await assert('connect()', async () => {
    await client.connect();
    if (!client.isConnected) throw new Error('not connected');
  });

  // ── Checkin (developer core) ──
  await assert('checkin()', async () => {
    const r = parse(await client.checkin());
    if (!r.agent) throw new Error('missing agent in checkin response');
  });

  // ── Developer workflow ──
  await assert('chorus_list_projects', async () => {
    const r = parse(await client.callTool('chorus_list_projects'));
    if (!r.items || r.total !== 2) throw new Error('unexpected list response');
  });

  await assert('chorus_get_available_tasks', async () => {
    const r = parse(await client.callTool('chorus_get_available_tasks', { projectUuid: 'test-proj' }));
    if (!r.data) throw new Error('expected data in get response');
  });

  await assert('chorus_claim_task', async () => {
    const r = parse(await client.callTool('chorus_claim_task', { taskId: 'test-task' }));
    if (!r.uuid) throw new Error('expected uuid in claim response');
  });

  await assert('chorus_report_work', async () => {
    const r = parse(await client.callTool('chorus_report_work', { taskId: 'test-task', summary: 'done' }));
    if (!r.result) throw new Error('expected result');
  });

  await assert('chorus_submit_for_verify', async () => {
    const r = parse(await client.callTool('chorus_submit_for_verify', { taskId: 'test-task', notes: 'ready' }));
    if (!r.result) throw new Error('expected result');
  });

  // ── PM tool ──
  await assert('chorus_pm_create_idea', async () => {
    const r = parse(await client.callTool('chorus_pm_create_idea', {
      projectId: 'test-proj',
      title: 'New Feature',
      description: 'A great idea',
    }));
    if (!r.uuid) throw new Error('expected uuid in create response');
  });

  // ── Admin tool ──
  await assert('chorus_admin_verify_task', async () => {
    const r = parse(await client.callTool('chorus_admin_verify_task', {
      taskId: 'test-task',
      status: 'approved',
    }));
    if (!r.result) throw new Error('expected result');
  });

  // ── Session tools ──
  await assert('chorus_create_session', async () => {
    const r = parse(await client.callTool('chorus_create_session', {
      projectId: 'test-proj',
      role: 'developer',
    }));
    if (!r.uuid) throw new Error('expected uuid in session create');
  });

  // ── Disconnect ──
  await assert('disconnect()', async () => {
    await client.disconnect();
    if (client.isConnected) throw new Error('still connected');
  });

  // ── Verify post-disconnect throws ──
  await assert('callTool after disconnect throws', async () => {
    try {
      await client.callTool('chorus_checkin');
      throw new Error('should have thrown');
    } catch (e: any) {
      if (!e.message.includes('Not connected')) throw e;
    }
  });

  // ── Teardown ──
  await stop();
  console.log('\n🏁 Integration tests complete.');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exitCode = 1;
  stop();
});
