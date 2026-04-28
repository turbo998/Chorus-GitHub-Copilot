import assert from 'node:assert/strict';
import {
  McpError,
  McpNetworkError,
  McpAuthError,
  McpToolError,
  McpTimeoutError,
  McpSessionError,
} from '../../src/mcp/errors.js';

// --- McpError base ---
const base = new McpError('base error', 'UNKNOWN');
assert(base instanceof Error);
assert(base instanceof McpError);
assert.equal(base.message, 'base error');
assert.equal(base.code, 'UNKNOWN');
assert.equal(base.retryable, false);
const baseJson = base.toJSON();
assert.equal(baseJson.name, 'McpError');
assert.equal(baseJson.message, 'base error');
assert.equal(baseJson.code, 'UNKNOWN');
assert.equal(baseJson.retryable, false);

// --- McpNetworkError ---
const net = new McpNetworkError('connection refused');
assert(net instanceof McpError);
assert(net instanceof Error);
assert.equal(net.code, 'NETWORK_ERROR');
assert.equal(net.retryable, true);

// --- McpAuthError ---
const auth = new McpAuthError('unauthorized', 'AUTH_EXPIRED');
assert(auth instanceof McpError);
assert.equal(auth.code, 'AUTH_EXPIRED');
assert.equal(auth.retryable, false);

const auth2 = new McpAuthError('forbidden');
assert.equal(auth2.code, 'AUTH_ERROR');

// --- McpToolError ---
const tool = new McpToolError('tool failed', 'myTool', 'EXEC_FAILED');
assert(tool instanceof McpError);
assert.equal(tool.toolName, 'myTool');
assert.equal(tool.errorCode, 'EXEC_FAILED');
assert.equal(tool.code, 'TOOL_ERROR');
assert.equal(tool.retryable, false);
const toolJson = tool.toJSON();
assert.equal(toolJson.toolName, 'myTool');
assert.equal(toolJson.errorCode, 'EXEC_FAILED');

const toolRetry = new McpToolError('transient', 'myTool', 'TIMEOUT', true);
assert.equal(toolRetry.retryable, true);

// --- McpTimeoutError ---
const timeout = new McpTimeoutError('request timed out', 5000);
assert(timeout instanceof McpNetworkError);
assert(timeout instanceof McpError);
assert(timeout instanceof Error);
assert.equal(timeout.code, 'TIMEOUT_ERROR');
assert.equal(timeout.retryable, true);
assert.equal(timeout.timeoutMs, 5000);
const toJson = timeout.toJSON();
assert.equal(toJson.timeoutMs, 5000);

// --- McpSessionError ---
const session = new McpSessionError('session expired', 'SESSION_EXPIRED');
assert(session instanceof McpError);
assert.equal(session.code, 'SESSION_EXPIRED');
assert.equal(session.retryable, false);

const session2 = new McpSessionError('invalid session');
assert.equal(session2.code, 'SESSION_ERROR');

console.log('✅ All error tests passed');
