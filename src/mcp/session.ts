export interface McpTransportLike {
  request(method: string, params?: any): Promise<any>;
}

export interface SessionManagerOptions {
  transport: McpTransportLike;
  autoSession?: boolean;
  heartbeatInterval?: number;
}

export class ChorusSessionManager {
  private transport: McpTransportLike;
  private autoSession: boolean;
  private heartbeatInterval: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private _initialized = false;
  private _chorusSessionId: string | null = null;

  get initialized(): boolean { return this._initialized; }
  get chorusSessionId(): string | null { return this._chorusSessionId; }

  constructor(opts: SessionManagerOptions) {
    this.transport = opts.transport;
    this.autoSession = opts.autoSession ?? true;
    this.heartbeatInterval = opts.heartbeatInterval ?? 60000;
  }

  async initialize(): Promise<void> {
    await this.transport.request('initialize');
    if (this.autoSession) {
      const res = await this.transport.request('tools/call', { name: 'chorus_create_session', arguments: {} });
      const data = JSON.parse(res.content[0].text);
      this._chorusSessionId = data.session_id;
    }
    this._initialized = true;
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.transport.request('tools/call', {
        name: 'chorus_session_heartbeat',
        arguments: { session_id: this._chorusSessionId },
      }).catch(() => {});
    }, this.heartbeatInterval);
  }

  async checkinTask(taskUuid: string): Promise<any> {
    return this.transport.request('tools/call', {
      name: 'chorus_session_checkin_task',
      arguments: { task_uuid: taskUuid, session_id: this._chorusSessionId },
    });
  }

  async checkoutTask(taskUuid: string): Promise<any> {
    return this.transport.request('tools/call', {
      name: 'chorus_session_checkout_task',
      arguments: { task_uuid: taskUuid, session_id: this._chorusSessionId },
    });
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this._chorusSessionId) {
      await this.transport.request('tools/call', {
        name: 'chorus_close_session',
        arguments: { session_id: this._chorusSessionId },
      });
    }
  }

  dispose(): void {
    this.close().catch(() => {});
  }
}
