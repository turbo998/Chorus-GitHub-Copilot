import { McpTransport } from './transport';
import { ChorusSessionManager } from './session';

export interface ChorusMcpClientOptions {
  serverUrl: string;
  apiKey: string;
  autoSession?: boolean;
  timeout?: number;
}

export class ChorusMcpClient {
  private transport: McpTransport;
  private session: ChorusSessionManager;
  private _connected = false;

  get isConnected(): boolean {
    return this._connected;
  }

  get sessionId(): string | null {
    return this.session.chorusSessionId;
  }

  constructor(opts: ChorusMcpClientOptions) {
    this.transport = new McpTransport({
      baseUrl: opts.serverUrl,
      apiKey: opts.apiKey,
      timeout: opts.timeout,
      maxRetries: 0,
    });
    this.session = new ChorusSessionManager({
      transport: this.transport,
      autoSession: opts.autoSession ?? true,
    });
  }

  async connect(): Promise<void> {
    await this.session.initialize();
    this.session.startHeartbeat();
    this._connected = true;
  }

  async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
    if (!this._connected) throw new Error('Not connected');
    return this.transport.request('tools/call', { name, arguments: args });
  }

  async listTools(): Promise<unknown> {
    if (!this._connected) throw new Error('Not connected');
    return this.transport.request('tools/list');
  }

  async checkin(): Promise<unknown> {
    return this.callTool('chorus_checkin');
  }

  async disconnect(): Promise<void> {
    if (!this._connected) return;
    await this.session.close();
    this.transport.close();
    this._connected = false;
  }
}
