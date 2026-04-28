import { describe, it, expect } from 'vitest';
import {
  McpError, McpNetworkError, McpAuthError, McpToolError, McpTimeoutError, McpSessionError,
} from '../../src/mcp/errors.js';

describe('McpError hierarchy', () => {
  it('McpError base', () => {
    const base = new McpError('base error', 'UNKNOWN');
    expect(base).toBeInstanceOf(Error);
    expect(base).toBeInstanceOf(McpError);
    expect(base.message).toBe('base error');
    expect(base.code).toBe('UNKNOWN');
    expect(base.retryable).toBe(false);
    const j = base.toJSON();
    expect(j.name).toBe('McpError');
    expect(j.code).toBe('UNKNOWN');
    expect(j.retryable).toBe(false);
  });

  it('McpNetworkError', () => {
    const e = new McpNetworkError('connection refused');
    expect(e).toBeInstanceOf(McpError);
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e.retryable).toBe(true);
  });

  it('McpAuthError', () => {
    const e = new McpAuthError('unauthorized', 'AUTH_EXPIRED');
    expect(e).toBeInstanceOf(McpError);
    expect(e.code).toBe('AUTH_EXPIRED');
    expect(e.retryable).toBe(false);
    expect(new McpAuthError('forbidden').code).toBe('AUTH_ERROR');
  });

  it('McpToolError', () => {
    const e = new McpToolError('tool failed', 'myTool', 'EXEC_FAILED');
    expect(e).toBeInstanceOf(McpError);
    expect(e.toolName).toBe('myTool');
    expect(e.errorCode).toBe('EXEC_FAILED');
    expect(e.code).toBe('TOOL_ERROR');
    expect(e.retryable).toBe(false);
    const j = e.toJSON();
    expect(j.toolName).toBe('myTool');
    expect(j.errorCode).toBe('EXEC_FAILED');
    const retry = new McpToolError('transient', 'myTool', 'TIMEOUT', true);
    expect(retry.retryable).toBe(true);
  });

  it('McpTimeoutError', () => {
    const e = new McpTimeoutError('request timed out', 5000);
    expect(e).toBeInstanceOf(McpNetworkError);
    expect(e).toBeInstanceOf(McpError);
    expect(e.code).toBe('TIMEOUT_ERROR');
    expect(e.retryable).toBe(true);
    expect(e.timeoutMs).toBe(5000);
    expect(e.toJSON().timeoutMs).toBe(5000);
  });

  it('McpSessionError', () => {
    const e = new McpSessionError('session expired', 'SESSION_EXPIRED');
    expect(e).toBeInstanceOf(McpError);
    expect(e.code).toBe('SESSION_EXPIRED');
    expect(e.retryable).toBe(false);
    expect(new McpSessionError('invalid session').code).toBe('SESSION_ERROR');
  });
});
