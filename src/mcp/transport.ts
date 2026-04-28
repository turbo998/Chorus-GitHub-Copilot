import { McpAuthError, McpNetworkError, McpTimeoutError, McpToolError } from './errors';

export interface McpTransportOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class McpTransport {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private _sessionId: string | null = null;
  private _requestId = 0;

  get sessionId(): string | null {
    return this._sessionId;
  }

  constructor(opts: McpTransportOptions) {
    this.baseUrl = opts.baseUrl;
    this.apiKey = opts.apiKey;
    this.timeout = opts.timeout ?? 30000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.retryDelay = opts.retryDelay ?? 1000;
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: ++this._requestId,
      method,
      ...(params !== undefined && { params }),
    });

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        if (this._sessionId) headers['Mcp-Session-Id'] = this._sessionId;

        const res = await fetch(this.baseUrl, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Auth errors - no retry
        if (res.status === 401 || res.status === 403) {
          throw new McpAuthError(`Authentication failed: ${res.status}`);
        }

        // Server errors - retry
        if (res.status >= 500) {
          if (attempt < this.maxRetries) {
            await this.sleep(this.retryDelay * Math.pow(2, attempt));
            continue;
          }
          throw new McpNetworkError(`Server error: ${res.status}`);
        }

        // Capture session ID
        const sid = res.headers.get('mcp-session-id');
        if (sid) this._sessionId = sid;

        const json = await res.json();

        if (json.error) {
          throw new McpToolError(json.error.message, method, String(json.error.code));
        }

        return json.result;
      } catch (err: any) {
        clearTimeout(timer);
        if (err instanceof McpAuthError || err instanceof McpToolError) throw err;
        if (err.name === 'AbortError') {
          throw new McpTimeoutError(`Request timed out after ${this.timeout}ms`, this.timeout);
        }
        if (err instanceof McpNetworkError || err instanceof McpTimeoutError) throw err;
        // Network failure - retry
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
          continue;
        }
        throw new McpNetworkError(err.message || 'Network error');
      }
    }
    throw new McpNetworkError('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  close(): void {
    this._sessionId = null;
  }
}
