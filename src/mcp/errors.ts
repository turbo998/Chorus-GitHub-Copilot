export class McpError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.retryable = retryable;
  }

  toJSON(): Record<string, unknown> {
    return { name: this.name, message: this.message, code: this.code, retryable: this.retryable };
  }
}

export class McpNetworkError extends McpError {
  constructor(message: string, code = 'NETWORK_ERROR') {
    super(message, code, true);
    this.name = 'McpNetworkError';
  }
}

export class McpAuthError extends McpError {
  constructor(message: string, code = 'AUTH_ERROR') {
    super(message, code, false);
    this.name = 'McpAuthError';
  }
}

export class McpToolError extends McpError {
  readonly toolName: string;
  readonly errorCode: string;

  constructor(message: string, toolName: string, errorCode: string, retryable = false) {
    super(message, 'TOOL_ERROR', retryable);
    this.name = 'McpToolError';
    this.toolName = toolName;
    this.errorCode = errorCode;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), toolName: this.toolName, errorCode: this.errorCode };
  }
}

export class McpTimeoutError extends McpNetworkError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'McpTimeoutError';
    this.timeoutMs = timeoutMs;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), timeoutMs: this.timeoutMs };
  }
}

export class McpSessionError extends McpError {
  constructor(message: string, code = 'SESSION_ERROR') {
    super(message, code, false);
    this.name = 'McpSessionError';
  }
}
