/**
 * Chorus MCP Client — lightweight HTTP client for Chorus MCP server.
 * Implements JSON-RPC 2.0 over HTTP (Streamable Transport).
 *
 * NOTE: Prefer using ChorusMcpClient from './mcp/client' for new code.
 */

// Re-export new high-level client for convenience
export { ChorusMcpClient } from './mcp/client';

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface ChorusMcpConfig {
  serverUrl: string;  // e.g. https://chorus.example.com
  apiKey: string;      // cho_xxx
}

export class ChorusMcpClient {
  private config: ChorusMcpConfig;
  private mcpEndpoint: string;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(config: ChorusMcpConfig) {
    this.config = config;
    this.mcpEndpoint = `${config.serverUrl.replace(/\/$/, '')}/api/mcp`;
  }

  /**
   * Initialize MCP session (handshake).
   */
  async initialize(): Promise<void> {
    const result = await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'chorus-copilot', version: '0.1.0' }
    });
    // Send initialized notification
    await this.notify('notifications/initialized', {});
    console.log('[Chorus MCP] Initialized, session:', this.sessionId);
  }

  /**
   * Call a Chorus MCP tool.
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.send('tools/call', { name, arguments: args });
    return result;
  }

  /**
   * List available tools from server.
   */
  async listTools(): Promise<unknown> {
    return await this.send('tools/list', {});
  }

  /**
   * Close MCP session.
   */
  async close(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(this.mcpEndpoint, {
          method: 'DELETE',
          headers: { 'Mcp-Session-Id': this.sessionId }
        });
      } catch { /* ignore */ }
      this.sessionId = null;
    }
  }

  /**
   * Check if client is configured (has URL and API key).
   */
  isConfigured(): boolean {
    return !!(this.config.serverUrl && this.config.apiKey);
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<ChorusMcpConfig>): void {
    if (config.serverUrl !== undefined) {
      this.config.serverUrl = config.serverUrl;
      this.mcpEndpoint = `${config.serverUrl.replace(/\/$/, '')}/api/mcp`;
    }
    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey;
    }
    // Reset session on config change
    this.sessionId = null;
  }

  // --- Internal ---

  private async send(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId;
    const body: McpRequest = { jsonrpc: '2.0', id, method, params };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const resp = await fetch(this.mcpEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    // Capture session ID from response
    const sid = resp.headers.get('mcp-session-id');
    if (sid) {
      this.sessionId = sid;
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`MCP ${method} failed (${resp.status}): ${text}`);
    }

    const contentType = resp.headers.get('content-type') || '';

    // Handle SSE responses
    if (contentType.includes('text/event-stream')) {
      return await this.parseSSE(resp);
    }

    // Handle JSON response
    const json = await resp.json() as McpResponse;
    if (json.error) {
      throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
    }
    return json.result;
  }

  private async notify(method: string, params: Record<string, unknown>): Promise<void> {
    const body = { jsonrpc: '2.0', method, params };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }
    await fetch(this.mcpEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }

  private async parseSSE(resp: Response): Promise<unknown> {
    const text = await resp.text();
    const lines = text.split('\n');
    let lastData = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        lastData = line.slice(6);
      }
    }
    if (lastData) {
      const json = JSON.parse(lastData) as McpResponse;
      if (json.error) {
        throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
      }
      return json.result;
    }
    return null;
  }
}
